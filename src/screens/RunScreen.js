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
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

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
  const d = new Date(dateStr + 'T12:00:00'); // avoid timezone shift
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Helper: get today's date as YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Helper: get first day of current month as YYYY-MM-DD
function firstOfMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function RunCard({ run }) {
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
            {run.distance_mi ? Number(run.distance_mi).toFixed(2) : '--'}
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

export default function RunScreen() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Header stats
  const [monthMiles, setMonthMiles] = useState(0);
  const [avgPace, setAvgPace] = useState(0);
  const [lastRunDate, setLastRunDate] = useState(null);

  // Form state
  const [formDate, setFormDate] = useState(todayStr());
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
        (sum, r) => sum + (parseFloat(r.distance_mi) || 0),
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
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const resetForm = () => {
    setFormDate(todayStr());
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
    if (showForm) {
      resetForm();
    }
    setShowForm((v) => !v);
  };

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

    const payload = {
      user_id: user.id,
      date: formDate || todayStr(),
      type: formType.trim() || null,
      distance_mi,
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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

            <Text style={styles.fieldLabel}>DATE</Text>
            <TextInput
              style={styles.input}
              value={formDate}
              onChangeText={setFormDate}
              placeholder="YYYY-MM-DD"
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

        {/* Run History */}
        <Text style={styles.sectionLabel}>RUN HISTORY</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading runs...</Text>
        ) : runs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏃</Text>
            <Text style={styles.emptyTitle}>No runs logged yet</Text>
            <Text style={styles.emptySubtitle}>
              Hit LOG RUN above to record your first run.
            </Text>
          </Card>
        ) : (
          runs.map((run) => (
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 12,
    marginTop: 4,
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
