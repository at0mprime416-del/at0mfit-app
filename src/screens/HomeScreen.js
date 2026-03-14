import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import { formatPace } from './RunScreen';

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({ workouts: 0, exercises: 0, weeklyMiles: 0, lastRun: null });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

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
          <Text style={styles.greetingText}>
            {greeting()},{' '}
            <Text style={styles.greetingName}>
              {profile?.name || 'Operator'}
            </Text>{' '}
            👊
          </Text>
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
          <Text style={[styles.statValue, { color: colors.blue }]}>
            {weeklyStats.workouts >= 4 ? '🔥' : '📈'}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
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

      {/* Motivational quote */}
      <Card style={styles.quoteCard}>
        <Text style={styles.quoteText}>
          "Discipline is the bridge between goals and accomplishment."
        </Text>
        <Text style={styles.quoteAuthor}>— Jim Rohn</Text>
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
