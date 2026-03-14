import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import { formatPace } from './RunScreen';
import { generateDailyGoal, markGoalComplete } from '../lib/aiGoals';

// ─── Rotating Quotes ──────────────────────────────────────────────────────────
const QUOTES = [
  { text: "You are not what you think you are. You are what you do.", author: "David Goggins" },
  { text: "The most important thing is to try and inspire people so that they can be great in whatever they want to do.", author: "Kobe Bryant" },
  { text: "Don't count the days; make the days count.", author: "Muhammad Ali" },
  { text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'", author: "Muhammad Ali" },
  { text: "Do not pray for an easy life. Pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "Absorb what is useful, discard what is useless, and add what is specifically your own.", author: "Bruce Lee" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Good. Now get back to work.", author: "Jocko Willink" },
  { text: "The more you sweat in training, the less you bleed in combat.", author: "Navy SEAL Saying" },
  { text: "A champion is defined not by their wins but by how they can recover when they fall.", author: "Serena Williams" },
  { text: "The only way to prove you are a good sport is to lose.", author: "Ernie Banks" },
  { text: "I told myself I was going to make it — and I did.", author: "Jesse Owens" },
  { text: "We all have dreams. But in order to make dreams come into reality, it takes an awful lot of determination, dedication, self-discipline, and effort.", author: "Jesse Owens" },
  { text: "Hard days are the best because that's when champions are made.", author: "Gabby Douglas" },
  { text: "Make sure your worst enemy doesn't live between your own two ears.", author: "Laird Hamilton" },
  { text: "It's not about perfect. It's about effort.", author: "Jillian Michaels" },
  { text: "Some people want it to happen, some wish it would happen, others make it happen.", author: "Michael Jordan" },
  { text: "Pain is temporary. It may last a minute, or an hour, or a day, or a year, but eventually it will subside and something else will take its place. If I quit, however, it lasts forever.", author: "Eric Thomas" },
  { text: "Get comfortable being uncomfortable.", author: "Jocko Willink" },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The war is won in the mind before it's won on the ground.", author: "Special Operations Doctrine" },
  { text: "Somewhere, someone is training when you are not. When you race him, he will win.", author: "Tom Fleming" },
  { text: "Strength does not come from the physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown Operator" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
];

function getDailyQuote() {
  const day = new Date().getDate();
  return QUOTES[day % QUOTES.length];
}

// ─── Goal helpers ─────────────────────────────────────────────────────────────
function goalEmoji(type) {
  switch (type) {
    case 'run': return '🏃';
    case 'workout': return '🏋️';
    case 'rest': return '😴';
    case 'mobility': return '🧘';
    default: return '🎯';
  }
}

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({ workouts: 0, exercises: 0, weeklyMiles: 0, lastRun: null });
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(null);
  const [goalLoading, setGoalLoading] = useState(false);
  const [teamMembership, setTeamMembership] = useState(null);
  const [userId, setUserId] = useState(null);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Fetch profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(prof);

    // Today's workout
    const today = new Date().toISOString().split('T')[0];
    const { data: workout } = await supabase
      .from('workouts')
      .select('*, exercises(*)')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    setTodayWorkout(workout);

    // Weekly stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekWorkouts } = await supabase
      .from('workouts')
      .select('id, exercises(id)')
      .eq('user_id', user.id)
      .gte('date', weekAgo.toISOString().split('T')[0]);

    if (weekWorkouts) {
      const totalExercises = weekWorkouts.reduce(
        (sum, w) => sum + (w.exercises?.length || 0),
        0
      );

      // Weekly run miles
      const { data: weekRuns } = await supabase
        .from('runs')
        .select('distance_mi')
        .eq('user_id', user.id)
        .gte('date', weekAgo.toISOString().split('T')[0]);

      const weeklyMiles = weekRuns
        ? weekRuns.reduce((sum, r) => sum + (parseFloat(r.distance_mi) || 0), 0)
        : 0;

      // Last run
      const { data: lastRunData } = await supabase
        .from('runs')
        .select('date, distance_mi, pace_per_mile_seconds')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      setWeeklyStats({
        workouts: weekWorkouts.length,
        exercises: totalExercises,
        weeklyMiles,
        lastRun: lastRunData || null,
      });
    }

    // ─── Real Streak Calculation ─────────────────────────────────────────────
    const { data: allWorkouts } = await supabase
      .from('workouts')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (allWorkouts && allWorkouts.length > 0) {
      // Build a Set of days that have workouts
      const workoutDays = new Set(allWorkouts.map((w) => w.date));

      let count = 0;
      const cursor = new Date();
      // If today has no workout, start checking from yesterday (streak not broken yet)
      if (!workoutDays.has(today)) {
        cursor.setDate(cursor.getDate() - 1);
      }

      // Walk backwards counting consecutive days
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const dayStr = cursor.toISOString().split('T')[0];
        if (workoutDays.has(dayStr)) {
          count++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(count);
    } else {
      setStreak(0);
    }

    // ─── Team membership ─────────────────────────────────────────────────────
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, team_id, tokens_contributed, teams(name)')
      .eq('user_id', user.id)
      .single();
    setTeamMembership(membership || null);

    // ─── AI Daily Goal ────────────────────────────────────────────────────────
    const { data: existingGoal } = await supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (existingGoal) {
      setDailyGoal(existingGoal);
    } else {
      setGoalLoading(true);
      try {
        const newGoal = await generateDailyGoal(user.id);
        setDailyGoal(newGoal);
      } catch (err) {
        console.warn('Could not generate daily goal:', err);
      } finally {
        setGoalLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkComplete = async () => {
    if (!dailyGoal || !userId) return;
    const success = await markGoalComplete(dailyGoal.id, userId);
    if (success) {
      setDailyGoal((prev) => ({ ...prev, completed: true, completed_at: new Date().toISOString() }));
    } else {
      Alert.alert('Error', 'Could not mark goal complete. Try again.');
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const streakColor =
    streak >= 7 ? colors.green : streak >= 3 ? colors.gold : colors.text;

  const quote = getDailyQuote();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.gold}
        />
      }
    >
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <View style={styles.greetingNameRow}>
            <Text style={styles.greetingText}>
              {greeting()},{' '}
              <Text style={styles.greetingName}>
                {profile?.name || 'Operator'}
              </Text>{' '}
              👊
            </Text>
            {profile?.subscription_tier === 'pro' && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.greetingDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Text style={styles.atomBadge}>⚛</Text>
      </View>

      {/* TODAY'S GOAL */}
      <Text style={styles.sectionLabel}>TODAY'S GOAL</Text>
      {goalLoading ? (
        <Card style={styles.goalCard}>
          <Text style={styles.goalLoadingText}>⚡ AI is setting your goal…</Text>
        </Card>
      ) : dailyGoal ? (
        <Card style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalEmoji}>{goalEmoji(dailyGoal.goal_type)}</Text>
            <View style={styles.goalHeaderText}>
              <Text style={styles.goalDescription}>{dailyGoal.goal_description}</Text>
              {dailyGoal.target_value != null && (
                <Text style={styles.goalTarget}>
                  {Number(dailyGoal.target_value).toFixed(
                    dailyGoal.target_unit === 'miles' ? 1 : 0
                  )}{' '}
                  {dailyGoal.target_unit}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.goalMeta}>
            <Text style={styles.goalTokens}>+{dailyGoal.tokens_reward} tokens</Text>
            {teamMembership?.teams?.name && (
              <Text style={styles.goalTeam}>→ {teamMembership.teams.name}</Text>
            )}
          </View>

          {dailyGoal.ai_reasoning ? (
            <Text style={styles.goalReasoning}>{dailyGoal.ai_reasoning}</Text>
          ) : null}

          {dailyGoal.completed ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✓ COMPLETED</Text>
            </View>
          ) : (
            <GoldButton
              title="MARK COMPLETE"
              onPress={handleMarkComplete}
              style={styles.cardButton}
            />
          )}
        </Card>
      ) : null}

      {/* Upgrade card for FREE tier */}
      {profile?.subscription_tier !== 'pro' && (
        <Card style={styles.upgradeCard}>
          <View style={styles.upgradeRow}>
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>UPGRADE TO PRO</Text>
              <Text style={styles.upgradeSubtitle}>
                Unlock carb cycling, IF timing, advanced training protocols
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() =>
                Alert.alert('Pro Subscription', 'Pro subscription coming soon! 🚀')
              }
            >
              <Text style={styles.upgradeBtnText}>UPGRADE</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Today's Workout */}
      <Text style={styles.sectionLabel}>TODAY'S SESSION</Text>
      {todayWorkout ? (
        <Card style={styles.workoutCard}>
          <View style={styles.workoutCardHeader}>
            <Text style={styles.workoutName}>{todayWorkout.name}</Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>LOGGED</Text>
            </View>
          </View>
          <Text style={styles.workoutMeta}>
            {todayWorkout.exercises?.length || 0} exercises recorded
          </Text>
          <GoldButton
            title="View / Edit"
            variant="outline"
            onPress={() => navigation.navigate('Workout')}
            style={styles.cardButton}
          />
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏋️</Text>
          <Text style={styles.emptyTitle}>No session logged yet</Text>
          <Text style={styles.emptySubtitle}>
            Ready to train? Log your workout now.
          </Text>
          <GoldButton
            title="START WORKOUT"
            onPress={() => navigation.navigate('Workout')}
            style={styles.cardButton}
          />
        </Card>
      )}

      {/* Weekly Stats */}
      <Text style={styles.sectionLabel}>WEEKLY SUMMARY</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyStats.workouts}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.green }]}>
            {weeklyStats.exercises}
          </Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: streakColor }]}>
            {streak}
          </Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.blue }]}>
            {weeklyStats.weeklyMiles.toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Run mi</Text>
        </Card>
      </View>

      {/* Last Run card */}
      {weeklyStats.lastRun && (
        <>
          <Text style={styles.sectionLabel}>LAST RUN</Text>
          <Card style={styles.lastRunCard}>
            <View style={styles.lastRunRow}>
              <Text style={styles.lastRunEmoji}>🏃</Text>
              <View style={styles.lastRunInfo}>
                <Text style={styles.lastRunDate}>
                  {new Date(weeklyStats.lastRun.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={styles.lastRunMeta}>
                  {weeklyStats.lastRun.distance_mi
                    ? `${Number(weeklyStats.lastRun.distance_mi).toFixed(2)} mi`
                    : '--'}{' '}
                  ·{' '}
                  {formatPace(weeklyStats.lastRun.pace_per_mile_seconds)}/mi
                </Text>
              </View>
              <GoldButton
                title="Run Log"
                variant="ghost"
                onPress={() => navigation.navigate('Run')}
                style={styles.lastRunBtn}
                textStyle={{ fontSize: 13 }}
              />
            </View>
          </Card>
        </>
      )}

      {/* Motivational quote — rotates daily */}
      <Card style={styles.quoteCard}>
        <Text style={styles.quoteText}>"{quote.text}"</Text>
        <Text style={styles.quoteAuthor}>— {quote.author}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    marginTop: 8,
  },
  greetingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 0,
  },
  greetingText: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '700',
  },
  greetingName: {
    color: colors.gold,
  },
  greetingDate: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  proBadge: {
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  proBadgeText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  upgradeCard: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.06)',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  upgradeSubtitle: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  upgradeBtn: {
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  upgradeBtnText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  atomBadge: {
    fontSize: 32,
    color: colors.gold,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 10,
  },
  // Goal card
  goalCard: {
    marginBottom: 24,
  },
  goalLoadingText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 8,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  goalEmoji: {
    fontSize: 32,
  },
  goalHeaderText: {
    flex: 1,
  },
  goalDescription: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  goalTarget: {
    fontSize: 14,
    color: colors.muted,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  goalTokens: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },
  goalTeam: {
    fontSize: 13,
    color: colors.muted,
  },
  goalReasoning: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 12,
  },
  completedBadge: {
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  completedText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  // Workout card
  workoutCard: {
    marginBottom: 24,
  },
  workoutCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: 'rgba(57,255,20,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  workoutMeta: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 14,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 18,
    textAlign: 'center',
  },
  cardButton: {
    marginTop: 4,
    paddingVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
  },
  lastRunCard: {
    marginBottom: 24,
  },
  lastRunRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lastRunEmoji: {
    fontSize: 28,
  },
  lastRunInfo: {
    flex: 1,
  },
  lastRunDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  lastRunMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  lastRunBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minHeight: 36,
  },
  quoteCard: {
    padding: 20,
  },
  quoteText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '600',
  },
});
