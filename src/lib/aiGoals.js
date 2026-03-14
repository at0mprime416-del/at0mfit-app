import { supabase } from './supabase';

// Key stored in .env as EXPO_PUBLIC_OPENAI_API_KEY (gitignored)
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

/**
 * Fetch recent activity, call GPT-4o-mini, upsert into daily_goals, return goal.
 */
export async function generateDailyGoal(userId) {
  const today = new Date().toISOString().split('T')[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // --- Fetch last 14 days of runs ---
  const { data: runs } = await supabase
    .from('runs')
    .select('distance_mi, duration_seconds, avg_hr, date, type')
    .eq('user_id', userId)
    .gte('date', cutoffStr)
    .order('date', { ascending: false });

  // --- Fetch last 14 days of workouts with exercise count ---
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, date, name, exercises(id)')
    .eq('user_id', userId)
    .gte('date', cutoffStr)
    .order('date', { ascending: false });

  const workoutSummary = (workouts || []).map((w) => ({
    date: w.date,
    name: w.name,
    exercise_count: w.exercises?.length || 0,
  }));

  // --- Build prompt ---
  const systemPrompt =
    'You are a fitness coach AI for At0m Fit. Analyze the user\'s recent activity and set ONE moderate, achievable daily goal. The goal should be slightly challenging but not overreaching — progressive overload principle. Consider rest days. Return JSON only with these fields: goal_type (one of: run, workout, rest, mobility), goal_description (short human-readable string), target_value (number or null), target_unit (miles|minutes|sessions or null), tokens_reward (integer 5-20), ai_reasoning (1-2 sentences why).';

  const userMessage = JSON.stringify({
    today,
    recent_runs: runs || [],
    recent_workouts: workoutSummary,
  });

  // --- Call OpenAI ---
  let goalData;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content;
    goalData = JSON.parse(raw);
  } catch (err) {
    console.warn('AI goal generation failed, using fallback:', err.message);
    // Fallback goal if API fails
    goalData = {
      goal_type: 'workout',
      goal_description: 'Complete a full-body strength session',
      target_value: 45,
      target_unit: 'minutes',
      tokens_reward: 10,
      ai_reasoning: 'Consistent training builds long-term results.',
    };
  }

  // --- Upsert into daily_goals ---
  const { data: inserted, error } = await supabase
    .from('daily_goals')
    .upsert(
      {
        user_id: userId,
        date: today,
        goal_type: goalData.goal_type || 'workout',
        goal_description: goalData.goal_description || 'Train today',
        target_value: goalData.target_value ?? null,
        target_unit: goalData.target_unit ?? null,
        tokens_reward: goalData.tokens_reward ?? 10,
        ai_reasoning: goalData.ai_reasoning ?? null,
        completed: false,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) {
    console.warn('Failed to upsert daily goal:', error.message);
    return null;
  }

  return inserted;
}

/**
 * Mark today's goal as complete and credit team tokens if applicable.
 */
export async function markGoalComplete(goalId, userId) {
  // Mark goal complete
  const { error } = await supabase
    .from('daily_goals')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) {
    console.warn('Failed to mark goal complete:', error.message);
    return false;
  }

  // Fetch goal to get tokens_reward
  const { data: goal } = await supabase
    .from('daily_goals')
    .select('tokens_reward')
    .eq('id', goalId)
    .single();

  const tokens = goal?.tokens_reward || 10;

  // Check if user is in a team
  const { data: membership } = await supabase
    .from('team_members')
    .select('id, team_id, tokens_contributed')
    .eq('user_id', userId)
    .single();

  if (membership) {
    // Increment member's tokens
    await supabase
      .from('team_members')
      .update({ tokens_contributed: (membership.tokens_contributed || 0) + tokens })
      .eq('id', membership.id);

    // Fetch current team total then increment
    const { data: team } = await supabase
      .from('teams')
      .select('total_tokens')
      .eq('id', membership.team_id)
      .single();

    if (team) {
      await supabase
        .from('teams')
        .update({ total_tokens: (team.total_tokens || 0) + tokens })
        .eq('id', membership.team_id);
    }
  }

  return true;
}
