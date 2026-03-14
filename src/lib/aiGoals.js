import { supabase } from './supabase';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// buildUserContext — assembles full athlete context from DB
// ─────────────────────────────────────────────────────────────────────────────
export async function buildUserContext(userId) {
  const today = new Date().toISOString().split('T')[0];

  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const cutoff30 = d30.toISOString().split('T')[0];

  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const cutoff7 = d7.toISOString().split('T')[0];

  // ── Profile ──
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, wake_time, sleep_time, weight_lbs, body_fat_pct, age, goal, fitness_level, full_name')
    .eq('id', userId)
    .single();

  // ── Body weight trend (30 days) ──
  const { data: weightLogs } = await supabase
    .from('body_weight_logs')
    .select('date, weight')
    .eq('user_id', userId)
    .gte('date', cutoff30)
    .order('date', { ascending: true });

  // ── Nutrition averages (7 days) ──
  const { data: mealLogs } = await supabase
    .from('meal_logs')
    .select('date, calories, protein, carbs, fat')
    .eq('user_id', userId)
    .gte('date', cutoff7);

  let nutritionAvg = { calories: null, protein: null, carbs: null, fat: null };
  if (mealLogs && mealLogs.length > 0) {
    const days = {};
    mealLogs.forEach((m) => {
      if (!days[m.date]) days[m.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      days[m.date].calories += parseFloat(m.calories) || 0;
      days[m.date].protein += parseFloat(m.protein) || 0;
      days[m.date].carbs += parseFloat(m.carbs) || 0;
      days[m.date].fat += parseFloat(m.fat) || 0;
    });
    const dayArr = Object.values(days);
    const n = dayArr.length;
    nutritionAvg = {
      calories: Math.round(dayArr.reduce((s, d) => s + d.calories, 0) / n),
      protein: Math.round(dayArr.reduce((s, d) => s + d.protein, 0) / n),
      carbs: Math.round(dayArr.reduce((s, d) => s + d.carbs, 0) / n),
      fat: Math.round(dayArr.reduce((s, d) => s + d.fat, 0) / n),
    };
  }

  // ── Supplement stack (30 days, distinct names) ──
  const { data: suppLogs } = await supabase
    .from('supplement_logs')
    .select('name')
    .eq('user_id', userId)
    .gte('date', cutoff30);

  const supplementStack = suppLogs
    ? [...new Set(suppLogs.map((s) => s.name).filter(Boolean))]
    : [];

  // ── Sleep trend (7 days) ──
  const { data: sleepLogs } = await supabase
    .from('sleep_logs')
    .select('date, hours_slept, sleep_quality')
    .eq('user_id', userId)
    .gte('date', cutoff7)
    .order('date', { ascending: true });

  let sleepAvg = { hours: null, quality: null };
  if (sleepLogs && sleepLogs.length > 0) {
    const hoursArr = sleepLogs.map((s) => parseFloat(s.hours_slept) || 0).filter(Boolean);
    const qualArr = sleepLogs.map((s) => parseInt(s.sleep_quality) || 0).filter(Boolean);
    sleepAvg = {
      hours: hoursArr.length ? (hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length).toFixed(1) : null,
      quality: qualArr.length ? (qualArr.reduce((a, b) => a + b, 0) / qualArr.length).toFixed(1) : null,
    };
  }

  // ── Workout history (30 days) ──
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, date, name, exercises(name, weight_lbs, sets, reps)')
    .eq('user_id', userId)
    .gte('date', cutoff30)
    .order('date', { ascending: false });

  const workoutHistory = (workouts || []).map((w) => ({
    date: w.date,
    name: w.name,
    exercise_count: w.exercises?.length || 0,
    exercises: (w.exercises || []).map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weight_lbs: e.weight_lbs,
    })),
  }));

  // ── Run history (30 days) ──
  const { data: runs } = await supabase
    .from('runs')
    .select('date, distance_mi, duration_seconds, avg_hr, pace_per_mile_seconds, type')
    .eq('user_id', userId)
    .gte('date', cutoff30)
    .order('date', { ascending: false });

  const runHistory = (runs || []).map((r) => ({
    date: r.date,
    distance_mi: r.distance_mi,
    duration_seconds: r.duration_seconds,
    avg_hr: r.avg_hr,
    pace_per_mile_seconds: r.pace_per_mile_seconds,
    type: r.type,
  }));

  // ── PRs per exercise (max weight from exercise_sets joined to exercises) ──
  const { data: prData } = await supabase
    .from('exercise_sets')
    .select('weight_lbs, exercises(name)')
    .eq('user_id', userId)
    .not('weight_lbs', 'is', null)
    .order('weight_lbs', { ascending: false });

  const prs = {};
  if (prData) {
    prData.forEach((row) => {
      const name = row.exercises?.name;
      if (!name) return;
      if (!prs[name] || row.weight_lbs > prs[name]) {
        prs[name] = row.weight_lbs;
      }
    });
  }

  return {
    today,
    profile: {
      tier: profile?.subscription_tier || 'free',
      wake_time: profile?.wake_time || '06:00',
      sleep_time: profile?.sleep_time || '22:00',
      weight_lbs: profile?.weight_lbs || null,
      body_fat_pct: profile?.body_fat_pct || null,
      age: profile?.age || null,
      goal: profile?.goal || null,
      fitness_level: profile?.fitness_level || null,
    },
    weight_trend: weightLogs || [],
    nutrition_avg_7d: nutritionAvg,
    supplement_stack: supplementStack,
    sleep_trend_7d: sleepLogs || [],
    sleep_avg_7d: sleepAvg,
    workout_history_30d: workoutHistory,
    run_history_30d: runHistory,
    personal_records: prs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// saveWeeklySummary — computes + upserts past-week summary to ai_context
// ─────────────────────────────────────────────────────────────────────────────
export async function saveWeeklySummary(userId) {
  const today = new Date();
  // Week start = last Monday
  const dayOfWeek = today.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - diffToMonday);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = today.toISOString().split('T')[0];

  // Avg body weight this week
  const { data: weights } = await supabase
    .from('body_weight_logs')
    .select('weight')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const avgWeight = weights && weights.length
    ? (weights.reduce((s, w) => s + (parseFloat(w.weight) || 0), 0) / weights.length).toFixed(1)
    : null;

  // Workouts done
  const { data: workouts } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const workoutsDone = workouts?.length || 0;

  // Miles run
  const { data: runs } = await supabase
    .from('runs')
    .select('distance_mi')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const milesRun = runs
    ? runs.reduce((s, r) => s + (parseFloat(r.distance_mi) || 0), 0).toFixed(1)
    : '0.0';

  // Avg sleep
  const { data: sleeps } = await supabase
    .from('sleep_logs')
    .select('hours_slept, sleep_quality')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const avgSleepHours = sleeps && sleeps.length
    ? (sleeps.reduce((s, sl) => s + (parseFloat(sl.hours_slept) || 0), 0) / sleeps.length).toFixed(1)
    : null;
  const avgSleepQuality = sleeps && sleeps.length
    ? (sleeps.reduce((s, sl) => s + (parseInt(sl.sleep_quality) || 0), 0) / sleeps.length).toFixed(1)
    : null;

  // Avg calories
  const { data: meals } = await supabase
    .from('meal_logs')
    .select('calories')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const avgCalories = meals && meals.length
    ? Math.round(meals.reduce((s, m) => s + (parseInt(m.calories) || 0), 0) / 7)
    : null;

  // Supplements used
  const { data: supps } = await supabase
    .from('supplement_logs')
    .select('name')
    .eq('user_id', userId)
    .gte('date', weekStartStr)
    .lte('date', weekEndStr);

  const supplementsUsed = supps ? [...new Set(supps.map((s) => s.name).filter(Boolean))] : [];

  const summary = {
    week_start: weekStartStr,
    week_end: weekEndStr,
    avg_weight_lbs: avgWeight,
    workouts_done: workoutsDone,
    miles_run: milesRun,
    avg_sleep_hours: avgSleepHours,
    avg_sleep_quality: avgSleepQuality,
    avg_calories: avgCalories,
    supplements_used: supplementsUsed,
  };

  const { error } = await supabase
    .from('ai_context')
    .upsert(
      { user_id: userId, week_start: weekStartStr, summary, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' }
    );

  if (error) {
    console.warn('saveWeeklySummary error:', error.message);
  }

  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// getAIContext — last 4 weekly summaries + current context for GPT
// ─────────────────────────────────────────────────────────────────────────────
export async function getAIContext(userId) {
  const { data: weeklySummaries } = await supabase
    .from('ai_context')
    .select('week_start, summary')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(4);

  const currentContext = await buildUserContext(userId);

  return {
    weekly_history: (weeklySummaries || []).map((w) => ({ week_start: w.week_start, ...w.summary })),
    current: currentContext,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateDailyGoal
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDailyGoal(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Get full AI context (history + current)
  const aiContext = await getAIContext(userId);
  const { profile, sleep_avg_7d, workout_history_30d, run_history_30d,
    nutrition_avg_7d, supplement_stack, weight_trend } = aiContext.current;
  const tier = profile.tier;

  // Build sleep insight string for the prompt
  const sleepInsight = sleep_avg_7d.hours
    ? `User averaged ${sleep_avg_7d.hours}hrs sleep (quality ${sleep_avg_7d.quality}/10) over the last 7 days.`
    : 'No sleep data logged yet.';

  const weightTrend = weight_trend.length >= 2
    ? `Weight trend: ${weight_trend[0].weight} lbs (${weight_trend[0].date}) → ${weight_trend[weight_trend.length - 1].weight} lbs (${weight_trend[weight_trend.length - 1].date}).`
    : weight_trend.length === 1
    ? `Current weight: ${weight_trend[0].weight} lbs.`
    : 'No weight data logged yet.';

  let systemPrompt;

  if (tier === 'pro') {
    systemPrompt = `You are an elite performance coach AI with full access to this athlete's training history.
Your role: prescribe today's optimal goal using progressive overload, periodization, nutrition timing, supplement guidance, and sleep recovery.
Reference specific numbers from the athlete's history ("Last week you averaged X hrs sleep", "Your squat PR is X lbs", etc.).
Consider: training frequency, fatigue accumulation, sleep quality, nutritional status, and supplement stack.
Prescribe: ONE clear daily goal + nutrition focus (high/moderate/low carb day) + eating window + sleep target + supplement reminder.
Return JSON: {
  goal_type, goal_description, target_value, target_unit, tokens_reward: 20, ai_reasoning,
  nutrition_recommendation: { carb_day_type, eating_window_start, eating_window_end, macro_focus },
  sleep_recommendation: { target_hours, notes },
  supplement_reminder: string,
  recovery_recommendation: { soreness_expected, mobility_recommended, deload_suggested }
}`;
  } else {
    systemPrompt = `You are a basic fitness coach AI. Give ONE simple, motivating daily goal.
Keep it accessible. Focus on: basic cardio, simple workouts, staying active, hydration.
Return JSON: { goal_type, goal_description, target_value, target_unit, tokens_reward: 10, ai_reasoning }`;
  }

  const userMessage = JSON.stringify({
    today,
    tier,
    athlete_profile: profile,
    context_insight: sleepInsight,
    weight_trend: weightTrend,
    nutrition_7d_avg: nutrition_avg_7d,
    supplement_stack,
    recent_workouts: workout_history_30d.slice(0, 10),
    recent_runs: run_history_30d.slice(0, 10),
    weekly_history: aiContext.weekly_history,
  });

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
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const json = await response.json();
    goalData = JSON.parse(json.choices?.[0]?.message?.content || '{}');
  } catch (err) {
    console.warn('AI goal generation failed, using fallback:', err.message);

    const weekWorkoutCount = workout_history_30d.filter((w) => {
      const d = new Date(w.date + 'T00:00:00');
      return (new Date() - d) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    const weekRunCount = run_history_30d.filter((r) => {
      const d = new Date(r.date + 'T00:00:00');
      return (new Date() - d) / (1000 * 60 * 60 * 24) <= 7;
    }).length;

    let fallback;
    if (weekWorkoutCount >= 6) {
      fallback = { goal_type: 'rest', goal_description: 'Active recovery day', target_value: null, target_unit: null, tokens_reward: tier === 'pro' ? 10 : 5, ai_reasoning: "6 days of training this week. Rest is training." };
    } else if (weekRunCount === 0) {
      fallback = { goal_type: 'run', goal_description: 'Easy aerobic run', target_value: 2, target_unit: 'miles', tokens_reward: tier === 'pro' ? 15 : 10, ai_reasoning: 'No runs logged this week. Time to move.' };
    } else {
      fallback = { goal_type: 'workout', goal_description: 'Full body strength session', target_value: 45, target_unit: 'minutes', tokens_reward: tier === 'pro' ? 20 : 10, ai_reasoning: 'Consistent training builds the base.' };
    }

    if (tier === 'pro') {
      goalData = {
        ...fallback,
        nutrition_recommendation: { carb_day_type: weekWorkoutCount >= 5 ? 'high' : 'moderate', eating_window_start: '07:00', eating_window_end: '15:00', macro_focus: 'protein' },
        sleep_recommendation: { target_hours: 8, notes: 'Prioritize 8hrs for recovery.' },
        supplement_reminder: supplement_stack.length ? supplement_stack.slice(0, 3).join(', ') : 'Take your recovery supplements tonight.',
        recovery_recommendation: { soreness_expected: weekWorkoutCount >= 5 ? 4 : 2, mobility_recommended: weekWorkoutCount >= 4, deload_suggested: weekWorkoutCount >= 6 },
      };
    } else {
      goalData = fallback;
    }
  }

  // PRO: upsert nutrition + recovery
  if (tier === 'pro') {
    const nutritionRec = goalData.nutrition_recommendation;
    const recoveryRec = goalData.recovery_recommendation;

    if (nutritionRec) {
      await supabase.from('nutrition_logs').upsert(
        { user_id: userId, date: today, carb_day_type: nutritionRec.carb_day_type ?? null, eating_window_start: nutritionRec.eating_window_start ?? null, eating_window_end: nutritionRec.eating_window_end ?? null },
        { onConflict: 'user_id,date' }
      );
    }

    if (recoveryRec) {
      await supabase.from('recovery_logs').upsert(
        { user_id: userId, date: today, notes: recoveryRec.mobility_recommended ? 'AI: Mobility work recommended today.' : null },
        { onConflict: 'user_id,date' }
      );
    }
  }

  // Upsert daily_goals
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

  // Attach PRO extras to returned object so HomeScreen can display them
  return {
    ...inserted,
    nutrition_recommendation: goalData.nutrition_recommendation || null,
    sleep_recommendation: goalData.sleep_recommendation || null,
    supplement_reminder: goalData.supplement_reminder || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateAIWorkout
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAIWorkout(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fitness_level, goal, weight_lbs, age, subscription_tier')
    .eq('id', userId)
    .single();

  if (!profile || profile.subscription_tier !== 'pro') return null;

  // Full context — 30 days
  const ctx = await buildUserContext(userId);

  const systemPrompt = `You are an elite strength & conditioning coach.
Generate ONE complete workout for today based on this athlete's profile, 30-day history, PRs, sleep, and nutrition status.
Apply progressive overload. Rotate muscle groups. Avoid exact repeat of last session.
If sleep avg < 6hrs, reduce volume 15%. If fatigue high (6+ workouts last 7 days), suggest deload.
Reference PRs when prescribing weights (e.g., "Your squat PR is 225 lbs — today we target 230").
Return ONLY valid JSON: { workout_name, estimated_duration_minutes, focus, ai_notes, exercises: [{name, sets, reps, weight_lbs, rest_seconds, notes}] }`;

  const userMessage = JSON.stringify({
    today: ctx.today,
    athlete_profile: ctx.profile,
    weight_trend: ctx.weight_trend.slice(-7),
    sleep_avg_7d: ctx.sleep_avg_7d,
    nutrition_avg_7d: ctx.nutrition_avg_7d,
    supplement_stack: ctx.supplement_stack,
    personal_records: ctx.personal_records,
    last_10_workouts: ctx.workout_history_30d.slice(0, 10),
    last_10_runs: ctx.run_history_30d.slice(0, 10),
    weekly_history: (await getAIContext(userId)).weekly_history,
  });

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
        max_tokens: 900,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const json = await response.json();
    workout = JSON.parse(json.choices?.[0]?.message?.content || '{}');
  } catch (err) {
    console.warn('AI workout generation failed, using fallback:', err.message);
    const hasRecentUpper = ctx.workout_history_30d[0]?.exercises?.some(
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

// ─────────────────────────────────────────────────────────────────────────────
// markGoalComplete
// ─────────────────────────────────────────────────────────────────────────────
export async function markGoalComplete(goalId, userId) {
  const { error } = await supabase
    .from('daily_goals')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', goalId)
    .eq('user_id', userId);

  if (error) {
    console.warn('Failed to mark goal complete:', error.message);
    return false;
  }

  const { data: goal } = await supabase
    .from('daily_goals')
    .select('tokens_reward')
    .eq('id', goalId)
    .single();

  const tokens = goal?.tokens_reward || 10;

  const { data: membership } = await supabase
    .from('team_members')
    .select('id, team_id, tokens_contributed')
    .eq('user_id', userId)
    .single();

  if (membership) {
    await supabase
      .from('team_members')
      .update({ tokens_contributed: (membership.tokens_contributed || 0) + tokens })
      .eq('id', membership.id);

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
