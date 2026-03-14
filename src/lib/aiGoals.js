import { supabase } from './supabase';

// Key stored in .env as EXPO_PUBLIC_OPENAI_API_KEY (gitignored)
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

/**
 * Fetch recent activity, call GPT-4o-mini, upsert into daily_goals, return goal.
 * Supports FREE and PRO tiers with different AI prompts.
 */
export async function generateDailyGoal(userId) {
  const today = new Date().toISOString().split('T')[0];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // --- Fetch profile (including tier, wake/sleep times) ---
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, wake_time, sleep_time, weight_lbs, age, goal')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier || 'free';

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

  // --- Build prompt based on tier ---
  let systemPrompt;

  if (tier === 'pro') {
    systemPrompt =
      'You are an elite performance coach AI. Analyze the user\'s recent training load, body weight trend, and fitness history. Set ONE advanced, periodized daily goal. You have access to: carb cycling protocols (high/moderate/low carb days tied to training type), intermittent fasting windows (calculate optimal eating window based on wake_time and goal), recovery optimization (deload weeks, active recovery, mobility). Be specific with timing. Examples: \'High carb day — eat within 8-hour window starting 1 hour after wake (7am-3pm). Pre-workout meal 30min before training.\' Return JSON: { goal_type, goal_description, target_value, target_unit, tokens_reward: 20, ai_reasoning, nutrition_recommendation: { carb_day_type, eating_window_start, eating_window_end }, recovery_recommendation: { soreness_expected, mobility_recommended } }';
  } else {
    systemPrompt =
      'You are a basic fitness coach AI. Give the user ONE simple, motivating daily goal. Keep it accessible and beginner-friendly. No advanced protocols. Focus on: basic cardio, simple workouts, staying active, hydration. Return JSON: { goal_type, goal_description, target_value, target_unit, tokens_reward: 10, ai_reasoning }';
  }

  const userMessage = JSON.stringify({
    today,
    user_profile: {
      wake_time: profile?.wake_time || '06:00',
      sleep_time: profile?.sleep_time || '22:00',
      weight_lbs: profile?.weight_lbs,
      age: profile?.age,
      goal: profile?.goal,
    },
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
        max_tokens: 400,
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

    // Deterministic fallback based on recent activity
    const weekWorkoutCount = (workouts || []).filter((w) => {
      const d = new Date(w.date + 'T00:00:00');
      const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    const weekRunCount = (runs || []).filter((r) => {
      const d = new Date(r.date + 'T00:00:00');
      const diff = (new Date() - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    let fallback;
    if (weekWorkoutCount >= 6) {
      fallback = {
        goal_type: 'rest',
        goal_description: 'Active recovery day',
        target_value: null,
        target_unit: null,
        tokens_reward: tier === 'pro' ? 10 : 5,
        ai_reasoning: "You've trained 6 days this week. Rest is training.",
      };
    } else if (weekRunCount === 0) {
      fallback = {
        goal_type: 'run',
        goal_description: 'Easy aerobic run',
        target_value: 2,
        target_unit: 'miles',
        tokens_reward: tier === 'pro' ? 15 : 10,
        ai_reasoning: 'No runs logged this week. Time to move.',
      };
    } else {
      fallback = {
        goal_type: 'workout',
        goal_description: 'Full body strength session',
        target_value: 45,
        target_unit: 'minutes',
        tokens_reward: tier === 'pro' ? 20 : 10,
        ai_reasoning: 'Consistent training builds the base.',
      };
    }

    if (tier === 'pro') {
      goalData = {
        ...fallback,
        nutrition_recommendation: {
          carb_day_type: weekWorkoutCount >= 6 ? 'low' : 'high',
          eating_window_start: '07:00',
          eating_window_end: '15:00',
        },
        recovery_recommendation: {
          soreness_expected: weekWorkoutCount >= 5 ? 4 : 2,
          mobility_recommended: weekWorkoutCount >= 4,
        },
      };
    } else {
      goalData = fallback;
    }
  }

  // --- For PRO: upsert nutrition + recovery recommendations ---
  if (tier === 'pro') {
    const nutritionRec = goalData.nutrition_recommendation;
    const recoveryRec = goalData.recovery_recommendation;

    if (nutritionRec) {
      await supabase
        .from('nutrition_logs')
        .upsert(
          {
            user_id: userId,
            date: today,
            carb_day_type: nutritionRec.carb_day_type ?? null,
            eating_window_start: nutritionRec.eating_window_start ?? null,
            eating_window_end: nutritionRec.eating_window_end ?? null,
          },
          { onConflict: 'user_id,date' }
        );
    }

    if (recoveryRec) {
      // Only upsert fields that don't already exist (don't overwrite user-logged sleep hours)
      await supabase
        .from('recovery_logs')
        .upsert(
          {
            user_id: userId,
            date: today,
            notes: recoveryRec.mobility_recommended
              ? 'AI: Mobility work recommended today.'
              : null,
          },
          { onConflict: 'user_id,date' }
        );
    }
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
 * Generate an AI-powered workout plan for PRO users.
 * Returns a workout object (does NOT insert to DB).
 */
export async function generateAIWorkout(userId) {
  // Feature-gate: PRO only
  const { data: profile } = await supabase
    .from('profiles')
    .select('fitness_level, goal, weight_lbs, age, subscription_tier')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_tier !== 'pro') {
    return null;
  }

  // Fetch last 5 workouts with exercise details
  const { data: recentWorkouts } = await supabase
    .from('workouts')
    .select('name, date, exercises(name, weight_lbs, sets, reps)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(5);

  // Fetch last 3 runs
  const { data: recentRuns } = await supabase
    .from('runs')
    .select('date, distance_mi, pace_per_mile_seconds')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(3);

  const systemPrompt =
    'You are an elite strength and conditioning coach. Generate ONE complete workout for today based on this athlete\'s profile and recent training history. Apply progressive overload principles. Avoid repeating the exact same workout from last session. Return ONLY valid JSON.';

  const userMessage = JSON.stringify({
    today: new Date().toISOString().split('T')[0],
    athlete_profile: {
      fitness_level: profile.fitness_level,
      goal: profile.goal,
      weight_lbs: profile.weight_lbs,
      age: profile.age,
    },
    last_5_workouts: (recentWorkouts || []).map((w) => ({
      name: w.name,
      date: w.date,
      exercises: (w.exercises || []).map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight_lbs: e.weight_lbs,
      })),
    })),
    last_3_runs: (recentRuns || []).map((r) => ({
      date: r.date,
      distance_mi: r.distance_mi,
      pace_per_mile_seconds: r.pace_per_mile_seconds,
    })),
  });

  const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

  let workout;
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
        temperature: 0.8,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const json = await response.json();
    workout = JSON.parse(json.choices?.[0]?.message?.content);
  } catch (err) {
    console.warn('AI workout generation failed, using fallback:', err.message);
    // Deterministic fallback workout
    const lastWorkout = recentWorkouts?.[0];
    const hasRecentUpper = lastWorkout?.exercises?.some(
      (e) => e.name?.toLowerCase().includes('bench') || e.name?.toLowerCase().includes('press')
    );
    workout = hasRecentUpper
      ? {
          workout_name: 'Lower Body Power',
          estimated_duration_minutes: 55,
          focus: 'legs, glutes, hamstrings',
          ai_notes: 'Last session was upper body — balancing with lower today.',
          exercises: [
            { name: 'Barbell Squat', sets: 4, reps: 6, weight_lbs: 185, rest_seconds: 180, notes: 'Drive through heels' },
            { name: 'Romanian Deadlift', sets: 3, reps: 10, weight_lbs: 155, rest_seconds: 120, notes: 'Hip hinge, soft knees' },
            { name: 'Leg Press', sets: 3, reps: 12, weight_lbs: 270, rest_seconds: 90, notes: '' },
            { name: 'Walking Lunges', sets: 3, reps: 10, weight_lbs: 40, rest_seconds: 60, notes: 'Each leg' },
            { name: 'Calf Raises', sets: 4, reps: 15, weight_lbs: 135, rest_seconds: 45, notes: '' },
          ],
        }
      : {
          workout_name: 'Upper Body Power A',
          estimated_duration_minutes: 55,
          focus: 'chest, back, shoulders',
          ai_notes: 'Building strength with compound movements today.',
          exercises: [
            { name: 'Barbell Bench Press', sets: 4, reps: 6, weight_lbs: 185, rest_seconds: 180, notes: 'Full range of motion' },
            { name: 'Barbell Row', sets: 4, reps: 8, weight_lbs: 155, rest_seconds: 120, notes: 'Pull to belly button' },
            { name: 'Overhead Press', sets: 3, reps: 8, weight_lbs: 115, rest_seconds: 120, notes: '' },
            { name: 'Pull-ups', sets: 3, reps: 8, weight_lbs: 0, rest_seconds: 90, notes: 'Bodyweight' },
            { name: 'Face Pulls', sets: 3, reps: 15, weight_lbs: 40, rest_seconds: 60, notes: 'External rotation' },
          ],
        };
  }

  return workout;
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
