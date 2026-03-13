import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

function BarChart({ data, maxValue, barColor }) {
  const chartWidth = width - 80;
  const barWidth = Math.max((chartWidth / data.length) - 8, 10);

  return (
    <View style={styles.chart}>
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <View key={index} style={styles.barWrapper}>
            <Text style={styles.barValue}>
              {item.value > 0 ? item.value : ''}
            </Text>
            <View
              style={[
                styles.bar,
                {
                  width: barWidth,
                  height: Math.max(barHeight, item.value > 0 ? 4 : 0),
                  backgroundColor: barColor || colors.gold,
                },
              ]}
            />
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PRRow({ name, weight, date }) {
  return (
    <View style={styles.prRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prName}>{name}</Text>
        <Text style={styles.prDate}>{date}</Text>
      </View>
      <Text style={styles.prWeight}>{weight} lbs</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Last 7 days — workouts per day
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
      }

      const { data: workouts } = await supabase
        .from('workouts')
        .select('date, exercises(weight_lbs)')
        .eq('user_id', user.id)
        .gte('date', days[0]);

      const chartData = days.map((day) => {
        const dayWorkouts = (workouts || []).filter((w) => w.date === day);
        // Total volume = sum of all weights logged
        const volume = dayWorkouts.reduce((sum, w) => {
          const exVol = (w.exercises || []).reduce(
            (s, e) => s + (e.weight_lbs || 0),
            0
          );
          return sum + exVol;
        }, 0);

        const label = new Date(day + 'T00:00:00')
          .toLocaleDateString('en-US', { weekday: 'short' })
          .slice(0, 1);

        return { label, value: Math.round(volume) };
      });

      setWeeklyData(chartData);

      // PRs — max weight per exercise name
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('name, weight_lbs, workout_id, workouts!inner(user_id, date)')
        .eq('workouts.user_id', user.id)
        .not('weight_lbs', 'is', null)
        .order('weight_lbs', { ascending: false });

      if (allExercises) {
        const seen = new Set();
        const prList = [];
        for (const ex of allExercises) {
          if (!seen.has(ex.name)) {
            seen.add(ex.name);
            prList.push({
              name: ex.name,
              weight: ex.weight_lbs,
              date: new Date(ex.workouts.date + 'T00:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' }
              ),
            });
          }
          if (prList.length >= 10) break;
        }
        setPrs(prList);
      }

      setLoading(false);
    };

    loadProgress();
  }, []);

  const maxVol = Math.max(...weeklyData.map((d) => d.value), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Weekly Volume */}
      <Text style={styles.sectionLabel}>WEEKLY VOLUME (LBS)</Text>
      <Card style={styles.chartCard}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : weeklyData.every((d) => d.value === 0) ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No data yet. Start logging!</Text>
          </View>
        ) : (
          <BarChart data={weeklyData} maxValue={maxVol} barColor={colors.gold} />
        )}
      </Card>

      {/* PR Tracker */}
      <Text style={styles.sectionLabel}>PERSONAL RECORDS 🏆</Text>
      <Card>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : prs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyText}>
              No PRs yet. Log workouts with weight to track them.
            </Text>
          </View>
        ) : (
          prs.map((pr, index) => (
            <React.Fragment key={pr.name}>
              <PRRow {...pr} />
              {index < prs.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))
        )}
      </Card>

      {/* Streak card */}
      <Text style={styles.sectionLabel}>CONSISTENCY</Text>
      <View style={styles.streakRow}>
        <Card style={[styles.streakCard, { borderColor: colors.gold }]}>
          <Text style={styles.streakValue}>
            {weeklyData.filter((d) => d.value > 0).length}
          </Text>
          <Text style={styles.streakLabel}>Days This Week</Text>
        </Card>
        <Card style={[styles.streakCard, { borderColor: colors.blue }]}>
          <Text style={[styles.streakValue, { color: colors.blue }]}>
            {prs.length}
          </Text>
          <Text style={styles.streakLabel}>Tracked PRs</Text>
        </Card>
      </View>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 8,
  },
  chartCard: {
    marginBottom: 24,
    paddingVertical: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingTop: 16,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    marginBottom: 4,
  },
  barValue: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  loadingText: {
    color: colors.muted,
    textAlign: 'center',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  prDate: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  prWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  streakCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
