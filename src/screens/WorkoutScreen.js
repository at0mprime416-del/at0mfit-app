import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';

const EXERCISE_TEMPLATES = [
  'Squat', 'Bench Press', 'Deadlift', 'Overhead Press',
  'Pull-ups', 'Barbell Row', 'Romanian Deadlift', 'Dips',
];

const REST_PRESETS = [60, 90, 120, 180];

// Format elapsed seconds as MM:SS
function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Epley 1RM formula
function calcEpley1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

// ─── Rest Timer Modal ────────────────────────────────────────────────────────
function RestTimerModal({ visible, onDismiss }) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [flashing, setFlashing] = useState(false);
  const timerRef = useRef(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRemaining(90);
      setDuration(90);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current);
          // Flash effect at 0
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]).start(() => {
            setTimeout(onDismiss, 300);
          });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [visible, flashAnim, onDismiss]);

  const selectDuration = (secs) => {
    setDuration(secs);
    setRemaining(secs);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(timerRef.current);
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
          ]).start(() => setTimeout(onDismiss, 300));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  const progress = duration > 0 ? remaining / duration : 0;
  const bgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0.85)', 'rgba(201,168,76,0.5)'],
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Animated.View style={[timerStyles.overlay, { backgroundColor: bgColor }]}>
        <View style={timerStyles.modal}>
          <Text style={timerStyles.title}>REST</Text>

          {/* Progress bar */}
          <View style={timerStyles.progressTrack}>
            <View style={[timerStyles.progressBar, { width: `${progress * 100}%` }]} />
          </View>

          {/* Countdown */}
          <Text style={timerStyles.countdown}>{formatTimer(remaining)}</Text>

          {/* Quick-select buttons */}
          <View style={timerStyles.presets}>
            {REST_PRESETS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[timerStyles.preset, duration === s && timerStyles.presetActive]}
                onPress={() => selectDuration(s)}
              >
                <Text style={[timerStyles.presetText, duration === s && timerStyles.presetTextActive]}>
                  {s}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Skip button */}
          <TouchableOpacity style={timerStyles.skipBtn} onPress={onDismiss}>
            <Text style={timerStyles.skipText}>SKIP</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

// Single set row inside an exercise
function SetRow({ setData, setIndex, onUpdateWeight, onUpdateReps, onToggleComplete, onRemove, weightLabel }) {
  return (
    <View style={styles.setRow}>
      <Text style={styles.setNumber}>{setIndex + 1}</Text>
      <TextInput
        style={styles.setInput}
        value={setData.weight}
        onChangeText={onUpdateWeight}
        placeholder={weightLabel || 'lbs'}
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
      />
      <Text style={styles.setX}>×</Text>
      <TextInput
        style={styles.setInput}
        value={setData.reps}
        onChangeText={onUpdateReps}
        placeholder="reps"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.setCheckBtn, setData.completed && styles.setCheckBtnDone]}
        onPress={onToggleComplete}
      >
        <Text style={[styles.setCheckIcon, setData.completed && styles.setCheckIconDone]}>
          {setData.completed ? '✓' : '○'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.setRemoveBtn}>
        <Text style={styles.setRemoveIcon}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

function ExerciseCard({ exercise, onAddSet, onUpdateSet, onRemoveSet, onUpdateNotes, onRemove, onSetCompleted, weightLabel }) {
  // Calculate estimated 1RM
  let max1RM = 0;
  for (const s of exercise.sets) {
    const w = parseFloat(s.weight) || 0;
    const r = parseInt(s.reps) || 0;
    if (w > 0 && r > 0) {
      const est = calcEpley1RM(w, r);
      if (est > max1RM) max1RM = est;
    }
  }

  return (
    <Card style={styles.exerciseCard}>
      {/* Header */}
      <View style={styles.exerciseHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          {exercise.lastPerformance ? (
            <Text style={styles.lastPerf}>Last: {exercise.lastPerformance}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      {exercise.sets.length > 0 && (
        <View style={styles.setHeaderRow}>
          <Text style={styles.setHeaderCell}>#</Text>
          <Text style={[styles.setHeaderCell, { flex: 1, textAlign: 'center' }]}>{(weightLabel || 'LBS').toUpperCase()}</Text>
          <Text style={styles.setHeaderSep} />
          <Text style={[styles.setHeaderCell, { flex: 1, textAlign: 'center' }]}>REPS</Text>
          <Text style={[styles.setHeaderCell, { width: 36 }]} />
          <Text style={[styles.setHeaderCell, { width: 28 }]} />
        </View>
      )}

      {/* Sets */}
      {exercise.sets.map((s, i) => (
        <SetRow
          key={i}
          setData={s}
          setIndex={i}
          weightLabel={weightLabel}
          onUpdateWeight={(v) => onUpdateSet(i, 'weight', v)}
          onUpdateReps={(v) => onUpdateSet(i, 'reps', v)}
          onToggleComplete={() => {
            onUpdateSet(i, 'completed', !s.completed);
            if (!s.completed) onSetCompleted();
          }}
          onRemove={() => onRemoveSet(i)}
        />
      ))}

      {/* Estimated 1RM */}
      {max1RM > 0 && (
        <Text style={styles.estRM}>Est. 1RM: {Math.round(max1RM)} {weightLabel || 'lbs'}</Text>
      )}

      {/* Add set button */}
      <TouchableOpacity style={styles.addSetBtn} onPress={onAddSet}>
        <Text style={styles.addSetBtnText}>+ ADD SET</Text>
      </TouchableOpacity>

      {/* Notes */}
      <TextInput
        style={styles.notesInput}
        value={exercise.notes}
        onChangeText={onUpdateNotes}
        placeholder="Notes (optional)..."
        placeholderTextColor={colors.muted}
        multiline
      />
    </Card>
  );
}

export default function WorkoutScreen() {
  const { weightLabel } = useProfile();
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedWorkoutId, setSavedWorkoutId] = useState(null);

  // Rest timer
  const [restTimerVisible, setRestTimerVisible] = useState(false);

  // Exercise library search
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryResults, setLibraryResults] = useState([]);

  // Session timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Load today's workout if exists
  useEffect(() => {
    const loadToday = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data: workout } = await supabase
        .from('workouts')
        .select('*, exercises(*)')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (workout) {
        setSavedWorkoutId(workout.id);
        setWorkoutName(workout.name);
        // For each exercise, load its sets from exercise_sets
        const exerciseIds = (workout.exercises || []).map((e) => e.id);
        let setsMap = {};
        if (exerciseIds.length > 0) {
          const { data: setsData } = await supabase
            .from('exercise_sets')
            .select('*')
            .in('exercise_id', exerciseIds)
            .order('set_number', { ascending: true });
          if (setsData) {
            for (const s of setsData) {
              if (!setsMap[s.exercise_id]) setsMap[s.exercise_id] = [];
              setsMap[s.exercise_id].push({
                weight: s.weight_lbs != null ? String(s.weight_lbs) : '',
                reps: s.reps != null ? String(s.reps) : '',
                completed: s.completed || false,
              });
            }
          }
        }

        setExercises(
          (workout.exercises || []).map((e) => ({
            id: e.id,
            name: e.name,
            sets: setsMap[e.id] || [{ weight: String(e.weight_lbs || ''), reps: String(e.reps || ''), completed: false }],
            notes: e.notes || '',
            lastPerformance: null,
          }))
        );
      }
    };
    loadToday();
  }, []);

  // Fetch last performance for an exercise name
  const fetchLastPerformance = async (name) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('exercises')
      .select('weight_lbs, sets, reps, workout_id, workouts!inner(user_id, date)')
      .eq('workouts.user_id', user.id)
      .ilike('name', name)
      .order('workouts.date', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const ex = data[0];
      if (ex.weight_lbs && ex.reps && ex.sets) {
        return `${ex.weight_lbs} × ${ex.reps} × ${ex.sets}`;
      }
      if (ex.weight_lbs && ex.reps) {
        return `${ex.weight_lbs} lbs × ${ex.reps} reps`;
      }
    }
    return null;
  };

  // Library search
  const searchLibrary = useCallback(async (query) => {
    setLibraryQuery(query);
    if (!query.trim()) { setLibraryResults([]); return; }
    const { data } = await supabase
      .from('exercises_library')
      .select('name, muscle_group')
      .ilike('name', `%${query.trim()}%`)
      .limit(8);
    setLibraryResults(data || []);
  }, []);

  const addExercise = async (name) => {
    const trimmed = (name || newExerciseName).trim();
    if (!trimmed) return;
    const lastPerf = await fetchLastPerformance(trimmed);
    setExercises((prev) => [
      ...prev,
      {
        id: null,
        name: trimmed,
        sets: [{ weight: '', reps: '', completed: false }],
        notes: '',
        lastPerformance: lastPerf,
      },
    ]);
    setNewExerciseName('');
    setLibraryQuery('');
    setLibraryResults([]);
  };

  const addSetToExercise = (exIndex) => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? { ...e, sets: [...e.sets, { weight: '', reps: '', completed: false }] }
          : e
      )
    );
  };

  const updateSetField = (exIndex, setIndex, field, value) => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? {
              ...e,
              sets: e.sets.map((s, j) =>
                j === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : e
      )
    );
  };

  const removeSet = (exIndex, setIndex) => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === exIndex
          ? { ...e, sets: e.sets.filter((_, j) => j !== setIndex) }
          : e
      )
    );
  };

  const updateExerciseNotes = (exIndex, notes) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === exIndex ? { ...e, notes } : e))
    );
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  // Total volume: sum weight * reps for all sets
  const totalVolume = exercises.reduce((sum, e) => {
    return (
      sum +
      e.sets.reduce((s2, set) => {
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.reps) || 0;
        return s2 + w * r;
      }, 0)
    );
  }, 0);

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert('Name it!', 'Give your workout a name first.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('Add exercises', 'Log at least one exercise.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const today = new Date().toISOString().split('T')[0];
    let workoutId = savedWorkoutId;

    if (!workoutId) {
      const { data: newWorkout, error } = await supabase
        .from('workouts')
        .insert({ user_id: user.id, name: workoutName.trim(), date: today })
        .select()
        .single();

      if (error) {
        Alert.alert('Save failed', error.message);
        setSaving(false);
        return;
      }
      workoutId = newWorkout.id;
      setSavedWorkoutId(workoutId);
    } else {
      await supabase
        .from('workouts')
        .update({ name: workoutName.trim() })
        .eq('id', workoutId);
    }

    // Delete old exercises and re-insert
    await supabase.from('exercises').delete().eq('workout_id', workoutId);

    for (const ex of exercises) {
      // Use first completed set's weight/reps as summary, or first set
      const firstSet = ex.sets[0] || {};
      const { data: insertedEx, error: exError } = await supabase
        .from('exercises')
        .insert({
          workout_id: workoutId,
          name: ex.name,
          sets: ex.sets.length,
          reps: parseInt(firstSet.reps) || null,
          weight_lbs: parseFloat(firstSet.weight) || null,
          notes: ex.notes || null,
        })
        .select()
        .single();

      if (exError || !insertedEx) continue;

      // Insert exercise_sets rows
      const setsToInsert = ex.sets.map((s, idx) => ({
        exercise_id: insertedEx.id,
        set_number: idx + 1,
        weight_lbs: parseFloat(s.weight) || null,
        reps: parseInt(s.reps) || null,
        completed: s.completed,
      }));

      if (setsToInsert.length > 0) {
        await supabase.from('exercise_sets').insert(setsToInsert);
      }
    }

    setSaving(false);
    Alert.alert('Workout saved! 💪', `${exercises.length} exercises logged.`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Rest Timer Modal */}
      <RestTimerModal visible={restTimerVisible} onDismiss={() => setRestTimerVisible(false)} />

      {/* Timer header bar */}
      <View style={styles.timerBar}>
        <Text style={styles.timerLabel}>SESSION</Text>
        <Text style={styles.timerValue}>{formatTimer(elapsed)}</Text>
        <Text style={styles.volumeText}>
          Vol: {Math.round(totalVolume).toLocaleString()} {weightLabel}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Workout name */}
        <Text style={styles.sectionLabel}>SESSION NAME</Text>
        <TextInput
          style={styles.nameInput}
          value={workoutName}
          onChangeText={setWorkoutName}
          placeholder="e.g. Upper Body A"
          placeholderTextColor={colors.muted}
          autoCapitalize="words"
        />

        {/* Exercise list */}
        {exercises.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>EXERCISES</Text>
            {exercises.map((exercise, index) => (
              <ExerciseCard
                key={`${exercise.name}-${index}`}
                exercise={exercise}
                weightLabel={weightLabel}
                onAddSet={() => addSetToExercise(index)}
                onUpdateSet={(setIdx, field, val) => updateSetField(index, setIdx, field, val)}
                onRemoveSet={(setIdx) => removeSet(index, setIdx)}
                onUpdateNotes={(notes) => updateExerciseNotes(index, notes)}
                onRemove={() => removeExercise(index)}
                onSetCompleted={() => setRestTimerVisible(true)}
              />
            ))}
          </>
        )}

        {/* Add exercise */}
        <Text style={styles.sectionLabel}>ADD EXERCISE</Text>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.nameInput, { flex: 1, marginRight: 8 }]}
            value={newExerciseName}
            onChangeText={setNewExerciseName}
            placeholder="Exercise name..."
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            onSubmitEditing={() => addExercise()}
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => addExercise()}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Exercise Library Search */}
        <Text style={styles.sectionLabel}>SEARCH LIBRARY</Text>
        <TextInput
          style={styles.nameInput}
          value={libraryQuery}
          onChangeText={searchLibrary}
          placeholder="Search exercises..."
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
        />
        {libraryResults.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templates}>
            {libraryResults.map((r) => (
              <TouchableOpacity
                key={r.name}
                style={styles.libraryChip}
                onPress={() => addExercise(r.name)}
              >
                <Text style={styles.libraryChipName}>{r.name}</Text>
                <Text style={styles.libraryChipMuscle}>{r.muscle_group}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Quick templates */}
        <Text style={styles.sectionLabel}>POPULAR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templates}>
          {EXERCISE_TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.templateChip}
              onPress={() => addExercise(t)}
            >
              <Text style={styles.templateText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Total volume display */}
        {exercises.length > 0 && (
          <View style={styles.volumeRow}>
            <Text style={styles.volumeRowLabel}>TOTAL VOLUME</Text>
            <Text style={styles.volumeRowValue}>
              {Math.round(totalVolume).toLocaleString()} {weightLabel}
            </Text>
          </View>
        )}

        <GoldButton
          title="SAVE WORKOUT"
          onPress={saveWorkout}
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
  },
  volumeText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 20,
  },
  nameInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  exerciseCard: {
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  lastPerf: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },
  removeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  removeBtnText: {
    color: colors.muted,
    fontSize: 16,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  setHeaderCell: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
    fontWeight: '700',
    width: 24,
    textAlign: 'center',
  },
  setHeaderSep: {
    width: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  setNumber: {
    width: 20,
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    textAlign: 'center',
  },
  setInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  setX: {
    color: colors.muted,
    fontSize: 14,
    width: 14,
    textAlign: 'center',
  },
  setCheckBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  setCheckBtnDone: {
    borderColor: colors.green,
    backgroundColor: 'rgba(57,255,20,0.1)',
  },
  setCheckIcon: {
    fontSize: 14,
    color: colors.muted,
  },
  setCheckIconDone: {
    color: colors.green,
    fontWeight: '700',
  },
  setRemoveBtn: {
    width: 28,
    alignItems: 'center',
  },
  setRemoveIcon: {
    color: colors.muted,
    fontSize: 12,
  },
  addSetBtn: {
    marginTop: 6,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addSetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
  },
  notesInput: {
    marginTop: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    minHeight: 38,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    width: 50,
    height: 50,
    backgroundColor: colors.gold,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.background,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  templates: {
    marginBottom: 4,
  },
  templateChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  templateText: {
    color: colors.muted,
    fontSize: 13,
  },
  volumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  volumeRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
  },
  volumeRowValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.gold,
  },
  saveBtn: {
    marginTop: 16,
  },
  estRM: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'right',
  },
  libraryChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  libraryChipName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  libraryChipMuscle: {
    color: colors.muted,
    fontSize: 10,
  },
});

// ─── Rest Timer Styles ───────────────────────────────────────────────────────
const timerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    width: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 3,
    marginBottom: 20,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  countdown: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 28,
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  presetText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  presetTextActive: {
    color: colors.gold,
  },
  skipBtn: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
