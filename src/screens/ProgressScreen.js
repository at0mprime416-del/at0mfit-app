import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// ── BarChart ────────────────────────────────────────────────────────────────
function BarChart({ data, maxValue, barColor, height = 100 }) {
  const chartWidth = width - 80;
  const barWidth = Math.max((chartWidth / data.length) - 8, 10);

  return (
    <View style={[styles.chart, { height: height + 20 }]}>
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * height : 0;
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

// ── SVG Weight Line Chart ────────────────────────────────────────────────────
function WeightLineChart({ data }) {
  if (!data || data.length === 0) return null;

  const chartW = width - 96;
  const chartH = 100;
  const padH = 10;
  const values = data.map((d) => d.weight);
  const minW = Math.min(...values);
  const maxW = Math.max(...values);
  const range = maxW - minW || 1;

  const points = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2,
    y: padH + (chartH - padH * 2) - ((d.weight - minW) / range) * (chartH - padH * 2),
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <View
        style={{
          backgroundColor: 'rgba(0,0,0,0.25)',
          borderRadius: 8,
          marginHorizontal: 8,
          paddingBottom: 20,
        }}
      >
        <Svg width={chartW} height={chartH + 20} style={{ marginLeft: 0 }}>
          {/* baseline */}
          <Line
            x1={0}
            y1={chartH}
            x2={chartW}
            y2={chartH}
            stroke={colors.border}
            strokeWidth={1}
          />
          {/* polyline */}
          {data.length > 1 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.gold}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          )}
          {/* dots */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={colors.gold}
            />
          ))}
        </Svg>
        {/* X-axis labels */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={styles.chartAxisLabel}>{data[0].label}</Text>
          <Text style={styles.chartAxisLabel}>{data[data.length - 1].label}</Text>
        </View>
      </View>
      <View style={styles.weightMinMax}>
        <Text style={styles.weightMinMaxText}>Min: {minW} lbs</Text>
        <Text style={styles.weightMinMaxText}>Max: {maxW} lbs</Text>
      </View>
    </View>
  );
}

// ── Training Frequency Heatmap (12 weeks × 7 days) ──────────────────────────
function FrequencyHeatmap({ workoutDays, runDays }) {
  // Build 84-day grid ending today
  const today = new Date();
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const hasWorkout = workoutDays.has(ds);
    const hasRun = runDays.has(ds);
    let color = colors.surface;
    if (hasWorkout && hasRun) color = '#e6b84a'; // both — brighter gold
    else if (hasWorkout) color = colors.gold;
    else if (hasRun) color = colors.blue;
    cells.push({ ds, color, dayOfWeek: d.getDay() });
  }

  // Split into 12 weeks
  const weeks = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Week labels: show start date of each week
  const getWeekLabel = (weekIdx) => {
    const startCell = weeks[weekIdx][0];
    const d = new Date(startCell.ds + 'T00:00:00');
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const CELL_SIZE = Math.floor((width - 80) / 7) - 2;

  return (
    <View>
      {/* Legend */}
      <View style={styles.heatmapLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.gold }]} />
          <Text style={styles.legendText}>Workout</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.blue }]} />
          <Text style={styles.legendText}>Run</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} />
          <Text style={styles.legendText}>Rest</Text>
        </View>
      </View>

      {/* Day of week header */}
      <View style={styles.heatmapDowRow}>
        <View style={styles.heatmapWeekLabel} />
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={[styles.heatmapDow, { width: CELL_SIZE + 2 }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      {weeks.map((week, wIdx) => (
        <View key={wIdx} style={styles.heatmapRow}>
          <Text style={styles.heatmapWeekLabel}>{getWeekLabel(wIdx)}</Text>
          {week.map((cell, cIdx) => (
            <View
              key={cIdx}
              style={[
                styles.heatmapCell,
                {
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: cell.color,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Strength Standards ────────────────────────────────────────────────────────
const STRENGTH_STANDARDS = {
  squat:    { novice: 135, intermediate: 225, advanced: 315 },
  bench:    { novice: 95,  intermediate: 185, advanced: 275 },
  deadlift: { novice: 185, intermediate: 315, advanced: 405 },
  default:  { novice: 95,  intermediate: 185, advanced: 275 },
};

function getStrengthLevel(exerciseName, weightLbs) {
  const key = exerciseName.toLowerCase().includes('squat')
    ? 'squat'
    : exerciseName.toLowerCase().includes('bench')
    ? 'bench'
    : exerciseName.toLowerCase().includes('deadlift')
    ? 'deadlift'
    : 'default';

  const standards = STRENGTH_STANDARDS[key];
  const w = parseFloat(weightLbs) || 0;

  if (w >= standards.advanced) return { label: 'ELITE', color: '#39ff14' };   // green
  if (w >= standards.intermediate) return { label: 'ADVANCED', color: colors.gold };
  if (w >= standards.novice) return { label: 'INTERMEDIATE', color: colors.blue };
  return { label: 'NOVICE', color: colors.muted };
}

// ── PRRow with strength standard label ───────────────────────────────────────
function PRRow({ name, weight, sets, reps, date }) {
  const level = getStrengthLevel(name, weight);

  return (
    <View style={styles.prRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.prName}>{name}</Text>
        <Text style={styles.prDate}>{date}</Text>
        <View style={[styles.strengthBadge, { borderColor: level.color }]}>
          <Text style={[styles.strengthBadgeText, { color: level.color }]}>{level.label}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.prWeight}>{weight} lbs</Text>
        {sets && reps ? (
          <Text style={styles.prSetsReps}>{sets}×{reps}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatPace(seconds) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}/mi`;
}

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [weeklyData, setWeeklyData] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volumeRange, setVolumeRange] = useState(7);

  // Body weight
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightData, setWeightData] = useState([]);

  // Weekly mileage (runs)
  const [weeklyMileage, setWeeklyMileage] = useState([]);

  // Heatmap
  const [heatmapWorkoutDays, setHeatmapWorkoutDays] = useState(new Set());
  const [heatmapRunDays, setHeatmapRunDays] = useState(new Set());

  // Run records
  const [runRecords, setRunRecords] = useState(null);

  const loadProgress = async (rangeDays = 7) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Build days array for volume chart
    const days = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const startDate = days[0];

    const { data: workouts } = await supabase
      .from('workouts')
      .select('date, exercises(weight_lbs, sets, reps)')
      .eq('user_id', user.id)
      .gte('date', startDate);

    const isShort = rangeDays <= 7;
    const chartData = days
      .filter((_, i) => {
        if (isShort) return true;
        if (rangeDays === 30) return i % 3 === 0;
        return i % 7 === 0;
      })
      .map((day) => {
        const dayWorkouts = (workouts || []).filter((w) => w.date === day);
        const volume = dayWorkouts.reduce((sum, w) => {
          const exVol = (w.exercises || []).reduce(
            (s, e) => s + ((e.weight_lbs || 0) * (e.sets || 1) * (e.reps || 1)),
            0
          );
          return sum + exVol;
        }, 0);
        const label = isShort
          ? new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
          : new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).slice(0, 4);
        return { label, value: Math.round(volume) };
      });

    setWeeklyData(chartData);

    // PRs — max weight per exercise name, with sets & reps
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('name, weight_lbs, sets, reps, workout_id, workouts!inner(user_id, date)')
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
            sets: ex.sets,
            reps: ex.reps,
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

    // Body weight — last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const { data: weightLogs } = await supabase
      .from('body_weight_logs')
      .select('date, weight_lbs')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (weightLogs && weightLogs.length > 0) {
      setWeightData(
        weightLogs.map((w) => ({
          label: new Date(w.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: parseFloat(w.weight_lbs),
        }))
      );
    } else {
      setWeightData([]);
    }

    // Weekly mileage — last 7 days
    const runDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      runDays.push(d.toISOString().split('T')[0]);
    }
    const { data: runs } = await supabase
      .from('runs')
      .select('date, distance_mi')
      .eq('user_id', user.id)
      .gte('date', runDays[0]);

    const mileageData = runDays.map((day) => {
      const miles = (runs || [])
        .filter((r) => r.date === day)
        .reduce((sum, r) => sum + (parseFloat(r.distance_mi) || 0), 0);
      const label = new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
      return { label, value: Math.round(miles * 10) / 10 };
    });
    setWeeklyMileage(mileageData);

    // ── Heatmap data — last 84 days ──────────────────────────────────────────
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 83);
    const heatmapStartStr = heatmapStart.toISOString().split('T')[0];

    const [{ data: hmWorkouts }, { data: hmRuns }] = await Promise.all([
      supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', heatmapStartStr),
      supabase.from('runs').select('date').eq('user_id', user.id).gte('date', heatmapStartStr),
    ]);

    setHeatmapWorkoutDays(new Set((hmWorkouts || []).map((w) => w.date)));
    setHeatmapRunDays(new Set((hmRuns || []).map((r) => r.date)));

    // ── Run records ──────────────────────────────────────────────────────────
    const { data: allRuns } = await supabase
      .from('runs')
      .select('distance_mi, pace_per_mile_seconds, elevation_ft')
      .eq('user_id', user.id);

    if (allRuns && allRuns.length > 0) {
      let longestRun = null;
      let bestPaceRun = null;
      let mostElevationRun = null;

      for (const r of allRuns) {
        const dist = parseFloat(r.distance_mi) || 0;
        const pace = r.pace_per_mile_seconds;
        const elev = r.elevation_ft || 0;

        if (dist > 0 && (longestRun === null || dist > longestRun.distance_mi)) {
          longestRun = { ...r, distance_mi: dist };
        }
        if (pace && pace > 0 && (bestPaceRun === null || pace < bestPaceRun.pace_per_mile_seconds)) {
          bestPaceRun = { ...r, pace_per_mile_seconds: pace };
        }
        if (elev > 0 && (mostElevationRun === null || elev > mostElevationRun.elevation_ft)) {
          mostElevationRun = { ...r, elevation_ft: elev };
        }
      }

      setRunRecords({ longestRun, bestPaceRun, mostElevationRun });
    } else {
      setRunRecords(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProgress(volumeRange);
  }, [volumeRange]);

  const saveWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) {
      Alert.alert('Invalid weight', 'Enter a valid weight in lbs.');
      return;
    }
    setSavingWeight(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingWeight(false); return; }

    const today = todayStr();
    const { error } = await supabase
      .from('body_weight_logs')
      .upsert(
        { user_id: user.id, date: today, weight_lbs: w },
        { onConflict: 'user_id,date' }
      );

    setSavingWeight(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      Alert.alert('Weight logged! ⚖️', `${w} lbs recorded for today.`);
      setWeightInput('');
      loadProgress(volumeRange);
    }
  };

  const maxVol = Math.max(...weeklyData.map((d) => d.value), 1);
  const maxMileage = Math.max(...weeklyMileage.map((d) => d.value), 0.1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Body Weight Logging */}
      <Text style={styles.sectionLabel}>LOG WEIGHT</Text>
      <Card style={styles.weightCard}>
        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            value={weightInput}
            onChangeText={setWeightInput}
            placeholder="Today's weight (lbs)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
          />
          <GoldButton
            title="SAVE"
            onPress={saveWeight}
            loading={savingWeight}
            style={styles.weightSaveBtn}
          />
        </View>

        {weightData.length > 0 ? (
          <>
            <Text style={styles.weightChartLabel}>LAST 30 DAYS</Text>
            <WeightLineChart data={weightData} />
          </>
        ) : (
          <Text style={styles.weightEmptyText}>No weight logs yet. Log today's weight above.</Text>
        )}
      </Card>

      {/* Weekly Volume */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>VOLUME (LBS)</Text>
        <View style={styles.rangeToggle}>
          {RANGE_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r.label}
              style={[styles.rangeBtn, volumeRange === r.days && styles.rangeBtnActive]}
              onPress={() => setVolumeRange(r.days)}
            >
              <Text style={[styles.rangeBtnText, volumeRange === r.days && styles.rangeBtnTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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

      {/* Weekly Mileage */}
      {weeklyMileage.some((d) => d.value > 0) && (
        <>
          <Text style={styles.sectionLabel}>WEEKLY MILEAGE</Text>
          <Card style={styles.chartCard}>
            <BarChart data={weeklyMileage} maxValue={maxMileage} barColor={colors.blue} height={80} />
          </Card>
        </>
      )}

      {/* Training Frequency Heatmap */}
      <Text style={styles.sectionLabel}>TRAINING FREQUENCY — 12 WEEKS</Text>
      <Card style={styles.heatmapCard}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (heatmapWorkoutDays.size === 0 && heatmapRunDays.size === 0) ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No sessions logged yet.</Text>
          </View>
        ) : (
          <FrequencyHeatmap
            workoutDays={heatmapWorkoutDays}
            runDays={heatmapRunDays}
          />
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

      {/* Run Records */}
      {runRecords && (runRecords.longestRun || runRecords.bestPaceRun || runRecords.mostElevationRun) && (
        <>
          <Text style={styles.sectionLabel}>RUN RECORDS 🏃</Text>
          <Card style={styles.runRecordsCard}>
            {runRecords.longestRun && (
              <View style={styles.runRecordRow}>
                <Text style={styles.runRecordEmoji}>📏</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runRecordLabel}>LONGEST RUN</Text>
                  <Text style={styles.runRecordValue}>
                    {Number(runRecords.longestRun.distance_mi).toFixed(2)} mi
                  </Text>
                </View>
              </View>
            )}
            {runRecords.longestRun && (runRecords.bestPaceRun || runRecords.mostElevationRun) && (
              <View style={styles.divider} />
            )}
            {runRecords.bestPaceRun && (
              <View style={styles.runRecordRow}>
                <Text style={styles.runRecordEmoji}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runRecordLabel}>BEST PACE</Text>
                  <Text style={styles.runRecordValue}>
                    {formatPace(runRecords.bestPaceRun.pace_per_mile_seconds)}
                  </Text>
                </View>
              </View>
            )}
            {runRecords.bestPaceRun && runRecords.mostElevationRun && (
              <View style={styles.divider} />
            )}
            {runRecords.mostElevationRun && (
              <View style={styles.runRecordRow}>
                <Text style={styles.runRecordEmoji}>⛰️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runRecordLabel}>MOST ELEVATION</Text>
                  <Text style={styles.runRecordValue}>
                    {runRecords.mostElevationRun.elevation_ft} ft
                  </Text>
                </View>
              </View>
            )}
          </Card>
        </>
      )}

      {/* Consistency */}
      <Text style={styles.sectionLabel}>CONSISTENCY</Text>
      <View style={styles.streakRow}>
        <Card style={[styles.streakCard, { borderColor: colors.gold }]}>
          <Text style={styles.streakValue}>
            {weeklyData.filter((d) => d.value > 0).length}
          </Text>
          <Text style={styles.streakLabel}>Active Days</Text>
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  rangeToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rangeBtnActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  rangeBtnText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '700',
  },
  rangeBtnTextActive: {
    color: colors.gold,
  },
  weightCard: {
    marginBottom: 20,
    padding: 16,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  weightInput: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  weightSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
  },
  weightChartLabel: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  weightEmptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  weightMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  weightMinMaxText: {
    fontSize: 11,
    color: colors.muted,
  },
  chartAxisLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  chartCard: {
    marginBottom: 24,
    paddingVertical: 20,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
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
  // PR rows
  prRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  prSetsReps: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  strengthBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  strengthBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Heatmap
  heatmapCard: {
    marginBottom: 24,
    padding: 12,
  },
  heatmapLegend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: colors.muted,
  },
  heatmapDowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapWeekLabel: {
    width: 44,
    fontSize: 8,
    color: colors.muted,
    textAlign: 'right',
    paddingRight: 4,
  },
  heatmapDow: {
    fontSize: 8,
    color: colors.muted,
    textAlign: 'center',
    marginHorizontal: 1,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  heatmapCell: {
    borderRadius: 2,
    marginHorizontal: 1,
  },
  // Run records
  runRecordsCard: {
    marginBottom: 24,
  },
  runRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  runRecordEmoji: {
    fontSize: 24,
    width: 36,
    textAlign: 'center',
  },
  runRecordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  runRecordValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.blue,
  },
  // Streak / consistency
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
