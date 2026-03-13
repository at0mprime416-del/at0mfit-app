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

const EXERCISE_TEMPLATES = [
  'Squat', 'Bench Press', 'Deadlift', 'Overhead Press',
  'Pull-ups', 'Barbell Row', 'Romanian Deadlift', 'Dips',
];

function ExerciseRow({ exercise, onUpdate, onRemove }) {
  return (
    <Card style={styles.exerciseRow}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputsRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>SETS</Text>
          <TextInput
            style={styles.numInput}
            value={exercise.sets}
            onChangeText={(v) => onUpdate('sets', v)}
            keyboardType="numeric"
            placeholder="3"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>REPS</Text>
          <TextInput
            style={styles.numInput}
            value={exercise.reps}
            onChangeText={(v) => onUpdate('reps', v)}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={colors.muted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>LBS</Text>
          <TextInput
            style={styles.numInput}
            value={exercise.weight}
            onChangeText={(v) => onUpdate('weight', v)}
            keyboardType="numeric"
            placeholder="135"
            placeholderTextColor={colors.muted}
          />
        </View>
      </View>
    </Card>
  );
}

export default function WorkoutScreen() {
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedWorkoutId, setSavedWorkoutId] = useState(null);

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
        setExercises(
          (workout.exercises || []).map((e) => ({
            id: e.id,
            name: e.name,
            sets: String(e.sets || ''),
            reps: String(e.reps || ''),
            weight: String(e.weight_lbs || ''),
          }))
        );
      }
    };
    loadToday();
  }, []);

  const addExercise = (name) => {
    const trimmed = (name || newExerciseName).trim();
    if (!trimmed) return;
    setExercises((prev) => [
      ...prev,
      { id: null, name: trimmed, sets: '', reps: '', weight: '' },
    ]);
    setNewExerciseName('');
  };

  const updateExercise = (index, field, value) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const removeExercise = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

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
      // Create new workout
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
      // Update workout name
      await supabase
        .from('workouts')
        .update({ name: workoutName.trim() })
        .eq('id', workoutId);
    }

    // Delete old exercises and re-insert
    await supabase.from('exercises').delete().eq('workout_id', workoutId);

    const exerciseRows = exercises.map((e) => ({
      workout_id: workoutId,
      name: e.name,
      sets: parseInt(e.sets) || null,
      reps: parseInt(e.reps) || null,
      weight_lbs: parseFloat(e.weight) || null,
    }));

    const { error: exError } = await supabase
      .from('exercises')
      .insert(exerciseRows);

    setSaving(false);

    if (exError) {
      Alert.alert('Partial save', `Workout saved but exercises failed: ${exError.message}`);
    } else {
      Alert.alert('Workout saved! 💪', `${exercises.length} exercises logged.`);
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
              <ExerciseRow
                key={`${exercise.name}-${index}`}
                exercise={exercise}
                onUpdate={(field, val) => updateExercise(index, field, val)}
                onRemove={() => removeExercise(index)}
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

        {/* Quick templates */}
        <Text style={styles.sectionLabel}>QUICK ADD</Text>
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
  exerciseRow: {
    marginBottom: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    color: colors.muted,
    fontSize: 16,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  numInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
    width: '100%',
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
  saveBtn: {
    marginTop: 28,
  },
});
