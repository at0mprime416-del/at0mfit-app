import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// Helper: convert pace seconds to mm:ss string
export function formatPace(paceSeconds) {
  if (!paceSeconds || paceSeconds <= 0) return '--:--';
  const mins = Math.floor(paceSeconds / 60);
  const secs = paceSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Helper: format date string to readable format
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Format a Date object as "Saturday, March 14"
function formatDateLong(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// Format Date as YYYY-MM-DD
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

// Get today as Date
function todayDate() {
  return new Date();
}

// Helper: get first day of current month as YYYY-MM-DD
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Simple bar chart (no library)
function BarChart({ data, maxValue, barColor }) {
  const chartWidth = width - 80;
  const barWidth = Math.max((chartWidth / data.length) - 8, 10);
  return (
    <View style={chartStyles.chart}>
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * 80 : 0;
        return (
          <View key={index} style={chartStyles.barWrapper}>
            <Text style={chartStyles.barValue}>
              {item.value > 0 ? item.value.toFixed(1) : ''}
            </Text>
            <View
              style={[
                chartStyles.bar,
                {
                  width: barWidth,
                  height: Math.max(barHeight, item.value > 0 ? 4 : 0),
                  backgroundColor: barColor || colors.gold,
                },
              ]}
            />
            <Text style={chartStyles.barLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 110,
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
    fontSize: 8,
    color: colors.muted,
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
});

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function RunCard({ run }) {
  const duration = formatDuration(run.duration_seconds);
  return (
    <Card style={styles.runCard}>
      <View style={styles.runCardHeader}>
        <View>
          <Text style={styles.runDate}>{formatDate(run.date)}</Text>
          {run.type ? (
            <Text style={styles.runType}>{run.type}</Text>
          ) : null}
        </View>
        <View style={styles.runDistanceBadge}>
          <Text style={styles.runDistanceValue}>
            {run.distance ? Number(run.distance).toFixed(2) : '--'}
          </Text>
          <Text style={styles.runDistanceUnit}>mi</Text>
        </View>
      </View>

      <View style={styles.runStats}>
        <View style={styles.runStatItem}>
          <Text style={styles.runStatValue}>
            {formatPace(run.pace_per_mile_seconds)}
          </Text>
          <Text style={styles.runStatLabel}>PACE/MI</Text>
        </View>
        {duration ? (
          <View style={styles.runStatItem}>
            <Text style={[styles.runStatValue, { color: colors.gold }]}>
              {duration}
            </Text>
            <Text style={styles.runStatLabel}>DURATION</Text>
          </View>
        ) : null}
        {run.avg_hr ? (
          <View style={styles.runStatItem}>
            <Text style={[styles.runStatValue, { color: colors.error }]}>
              {run.avg_hr}
            </Text>
            <Text style={styles.runStatLabel}>AVG HR</Text>
          </View>
        ) : null}
        {run.elevation_ft != null ? (
          <View style={styles.runStatItem}>
            <Text style={[styles.runStatValue, { color: colors.blue }]}>
              {run.elevation_ft}
            </Text>
            <Text style={styles.runStatLabel}>ELEV (ft)</Text>
          </View>
        ) : null}
        {run.avg_cadence ? (
          <View style={styles.runStatItem}>
            <Text style={[styles.runStatValue, { color: colors.green }]}>
              {run.avg_cadence}
            </Text>
            <Text style={styles.runStatLabel}>CADENCE</Text>
          </View>
        ) : null}
      </View>

      {run.notes ? (
        <Text style={styles.runNotes}>{run.notes}</Text>
      ) : null}
    </Card>
  );
}

const FILTER_OPTIONS = ['All', 'Outdoor', 'Indoor'];

export default function RunScreen({ navigation }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [weeklyData, setWeeklyData] = useState([]);
  const [chartRange, setChartRange] = useState(7); // 7, 30, or 90 days

  // Header stats
  const [monthMiles, setMonthMiles] = useState(0);
  const [avgPace, setAvgPace] = useState(0);
  const [lastRunDate, setLastRunDate] = useState(null);

  // Date picker state
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [manualDate, setManualDate] = useState('');

  // Form state
  const [formType, setFormType] = useState('');
  const [formDistance, setFormDistance] = useState('');
  const [formMins, setFormMins] = useState('');
  const [formSecs, setFormSecs] = useState('');
  const [formHR, setFormHR] = useState('');
  const [formCadence, setFormCadence] = useState('');
  const [formElevation, setFormElevation] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchRuns = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('runs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (data) {
      setRuns(data);

      // Compute month stats
      const firstOfMonth = firstOfMonthStr();
      const thisMonthRuns = data.filter((r) => r.date >= firstOfMonth);

      const totalMiles = thisMonthRuns.reduce(
        (sum, r) => sum + (parseFloat(r.distance) || 0),
        0
      );
      setMonthMiles(totalMiles);

      const runsWithPace = thisMonthRuns.filter((r) => r.pace_per_mile_seconds > 0);
      if (runsWithPace.length > 0) {
        const avg = Math.round(
          runsWithPace.reduce((sum, r) => sum + r.pace_per_mile_seconds, 0) /
            runsWithPace.length
        );
        setAvgPace(avg);
      } else {
        setAvgPace(0);
      }

      if (data.length > 0) {
        setLastRunDate(data[0].date);
      }

      // Build mileage chart (rebuilds on chartRange change too)
      buildChartData(data, 7);
    }
    setLoading(false);
  };

  const buildChartData = (data, range) => {
    const days = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDateStr(d));
    }
    let chartData;
    if (range <= 7) {
      chartData = days.map((day) => {
        const dayMiles = data
          .filter((r) => r.date === day)
          .reduce((sum, r) => sum + (parseFloat(r.distance) || 0), 0);
        const label = new Date(day + 'T00:00:00')
          .toLocaleDateString('en-US', { weekday: 'short' })
          .slice(0, 1);
        return { label, value: dayMiles };
      });
    } else {
      // Group by week for 30D/90D
      const weeks = {};
      days.forEach((day) => {
        const d = new Date(day + 'T00:00:00');
        // week number relative to start
        const weekNum = Math.floor(days.indexOf(day) / 7);
        if (!weeks[weekNum]) weeks[weekNum] = { miles: 0, label: `W${weekNum + 1}` };
        const dayMiles = data
          .filter((r) => r.date === day)
          .reduce((sum, r) => sum + (parseFloat(r.distance) || 0), 0);
        weeks[weekNum].miles += dayMiles;
      });
      chartData = Object.values(weeks).map((w) => ({ label: w.label, value: parseFloat(w.miles.toFixed(1)) }));
    }
    setWeeklyData(chartData);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Re-build chart when range changes
  useEffect(() => {
    if (runs.length > 0) buildChartData(runs, chartRange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRange, runs]);

  const resetForm = () => {
    setSelectedDate(todayDate());
    setManualDate('');
    setFormType('');
    setFormDistance('');
    setFormMins('');
    setFormSecs('');
    setFormHR('');
    setFormCadence('');
    setFormElevation('');
    setFormNotes('');
  };

  const toggleForm = () => {
    if (showForm) resetForm();
    setShowForm((v) => !v);
  };

  // Date navigation helpers
  const goYesterday = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
    setManualDate('');
  };

  const goToday = () => {
    setSelectedDate(todayDate());
    setManualDate('');
  };

  const isToday = toDateStr(selectedDate) === toDateStr(todayDate());

  const saveRun = async () => {
    if (!formDistance || parseFloat(formDistance) <= 0) {
      Alert.alert('Missing distance', 'Enter a valid distance in miles.');
      return;
    }
    if (!formMins && !formSecs) {
      Alert.alert('Missing duration', 'Enter duration (minutes and/or seconds).');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const distance_mi = parseFloat(formDistance);
    const duration_seconds = (parseInt(formMins) || 0) * 60 + (parseInt(formSecs) || 0);
    const pace_per_mile_seconds =
      duration_seconds > 0 && distance_mi > 0
        ? Math.round(duration_seconds / distance_mi)
        : null;

    // Use manualDate if provided, else selectedDate
    let runDate = toDateStr(selectedDate);
    if (manualDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      runDate = manualDate;
    }

    const payload = {
      user_id: user.id,
      date: runDate,
      type: formType.trim() || null,
      distance: distance_mi,
      duration_seconds,
      pace_per_mile_seconds,
      avg_hr: formHR ? parseInt(formHR) : null,
      avg_cadence: formCadence ? parseInt(formCadence) : null,
      elevation_ft: formElevation ? parseInt(formElevation) : 0,
      notes: formNotes.trim() || null,
    };

    const { error } = await supabase.from('runs').insert(payload);
    setSaving(false);

    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      Alert.alert('Run logged! 🏃', `${distance_mi.toFixed(2)} mi at ${formatPace(pace_per_mile_seconds)}/mi`);
      resetForm();
      setShowForm(false);
      fetchRuns();
    }
  };

  // Filter runs for display
  const filteredRuns = runs.filter((r) => {
    if (activeFilter === 'All') return true;
    if (!r.type) return false;
    return r.type.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const maxWeeklyMi = Math.max(...weeklyData.map((d) => d.value), 0.1);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* TRACK RUN button */}
        <TouchableOpacity
          style={styles.trackRunBtn}
          onPress={() => navigation.navigate('LiveRun')}
        >
          <Text style={styles.trackRunBtnText}>TRACK RUN 📍</Text>
        </TouchableOpacity>

        {/* Header Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{monthMiles.toFixed(1)}</Text>
            <Text style={styles.statLabel}>MI THIS MONTH</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.green }]}>
              {formatPace(avgPace)}
            </Text>
            <Text style={styles.statLabel}>AVG PACE</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.blue, fontSize: 14 }]}>
              {lastRunDate ? formatDate(lastRunDate) : '—'}
            </Text>
            <Text style={styles.statLabel}>LAST RUN</Text>
          </Card>
        </View>

        {/* Weekly mileage chart */}
        {!loading && weeklyData.some((d) => d.value > 0) && (
          <>
            <View style={styles.chartHeaderRow}>
              <Text style={styles.sectionLabel}>MILEAGE CHART</Text>
              <View style={styles.rangeToggle}>
                {[7, 30, 90].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.rangeBtn, chartRange === r && styles.rangeBtnActive]}
                    onPress={() => setChartRange(r)}
                  >
                    <Text style={[styles.rangeBtnText, chartRange === r && styles.rangeBtnTextActive]}>
                      {r === 7 ? '7D' : r === 30 ? '30D' : '90D'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Card style={styles.chartCard}>
              <BarChart data={weeklyData} maxValue={maxWeeklyMi} barColor={colors.blue} />
            </Card>
          </>
        )}

        {/* LOG RUN toggle button */}
        <GoldButton
          title={showForm ? 'CANCEL' : 'LOG RUN'}
          onPress={toggleForm}
          variant={showForm ? 'outline' : 'filled'}
          style={styles.logBtn}
        />

        {/* Inline log form */}
        {showForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>NEW RUN</Text>

            {/* Date picker UI */}
            <Text style={styles.fieldLabel}>DATE</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity style={styles.dateNavBtn} onPress={goYesterday}>
                <Text style={styles.dateNavText}>← Yesterday</Text>
              </TouchableOpacity>
              <View style={styles.dateLabelWrap}>
                <Text style={styles.dateLabelText}>
                  {formatDateLong(selectedDate)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
                onPress={goToday}
                disabled={isToday}
              >
                <Text style={[styles.dateNavText, isToday && styles.dateNavTextDisabled]}>
                  Today →
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={manualDate}
              onChangeText={setManualDate}
              placeholder="Or type YYYY-MM-DD to override"
              placeholderTextColor={colors.muted}
            />

            <Text style={styles.fieldLabel}>TYPE</Text>
            <TextInput
              style={styles.input}
              value={formType}
              onChangeText={setFormType}
              placeholder="Outdoor hilly, Long run, Indoor aerobic..."
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>DISTANCE (mi)</Text>
            <TextInput
              style={styles.input}
              value={formDistance}
              onChangeText={setFormDistance}
              placeholder="5.0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>DURATION</Text>
            <View style={styles.durationRow}>
              <View style={styles.durationGroup}>
                <TextInput
                  style={[styles.input, styles.durationInput]}
                  value={formMins}
                  onChangeText={setFormMins}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                <Text style={styles.durationUnit}>min</Text>
              </View>
              <View style={styles.durationGroup}>
                <TextInput
                  style={[styles.input, styles.durationInput]}
                  value={formSecs}
                  onChangeText={setFormSecs}
                  placeholder="00"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                <Text style={styles.durationUnit}>sec</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>AVG HR (bpm) — optional</Text>
            <TextInput
              style={styles.input}
              value={formHR}
              onChangeText={setFormHR}
              placeholder="150"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>CADENCE (spm) — optional</Text>
            <TextInput
              style={styles.input}
              value={formCadence}
              onChangeText={setFormCadence}
              placeholder="170"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>ELEVATION (ft) — optional</Text>
            <TextInput
              style={styles.input}
              value={formElevation}
              onChangeText={setFormElevation}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder="Felt strong on the hills..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <GoldButton
              title="SAVE RUN"
              onPress={saveRun}
              loading={saving}
              style={styles.saveBtn}
            />
          </Card>
        )}

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Run History */}
        <Text style={styles.sectionLabel}>RUN HISTORY</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading runs...</Text>
        ) : filteredRuns.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏃</Text>
            <Text style={styles.emptyTitle}>
              {runs.length === 0 ? 'No runs logged yet' : `No ${activeFilter} runs found`}
            </Text>
            <Text style={styles.emptySubtitle}>
              {runs.length === 0
                ? 'Hit LOG RUN above to record your first run.'
                : 'Try a different filter or log a run with this type.'}
            </Text>
          </Card>
        ) : (
          filteredRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  trackRunBtn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  trackRunBtnText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 12,
    marginTop: 4,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rangeBtnActive: {
    backgroundColor: 'rgba(201,168,76,0.2)',
  },
  rangeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
  },
  rangeBtnTextActive: {
    color: colors.gold,
  },
  chartCard: {
    marginBottom: 20,
    paddingVertical: 16,
  },
  logBtn: {
    marginBottom: 20,
  },
  formCard: {
    marginBottom: 24,
    padding: 18,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dateNavBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateNavBtnDisabled: {
    opacity: 0.35,
  },
  dateNavText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  dateNavTextDisabled: {
    color: colors.muted,
  },
  dateLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  durationGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationInput: {
    flex: 1,
    textAlign: 'center',
  },
  durationUnit: {
    color: colors.muted,
    fontSize: 13,
    minWidth: 24,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  saveBtn: {
    marginTop: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  filterChipText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.gold,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
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
    textAlign: 'center',
  },
  runCard: {
    marginBottom: 12,
  },
  runCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  runDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  runType: {
    fontSize: 12,
    color: colors.muted,
  },
  runDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  runDistanceValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.gold,
  },
  runDistanceUnit: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  runStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  runStatItem: {
    alignItems: 'center',
  },
  runStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  runStatLabel: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
  },
  runNotes: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
