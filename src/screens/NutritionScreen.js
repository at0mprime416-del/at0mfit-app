import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const SUPPLEMENT_CHIPS = ['Creatine', 'Protein', 'Pre-Workout', 'Vitamin D', 'Magnesium', 'Fish Oil'];

const DEFAULT_MACRO_TARGETS = { protein: 180, carbs: 250, fat: 80 };

function calcMacroTargets(profile) {
  const weight = parseFloat(profile?.weight_lbs);
  if (!weight || weight <= 0) return DEFAULT_MACRO_TARGETS;
  return {
    protein: Math.round(weight * 0.8),
    carbs: Math.round(weight * 1.5),
    fat: Math.round(weight * 0.4),
  };
}

function MacroBar({ label, current, target, color }) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <View style={styles.macroBarRow}>
      <Text style={styles.macroBarLabel}>{label}</Text>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroBarValue}>{current.toFixed(0)}g / {target}g</Text>
    </View>
  );
}

export default function NutritionScreen() {
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [showMealForm, setShowMealForm] = useState(false);
  const [showSuppForm, setShowSuppForm] = useState(false);
  const [savingMeal, setSavingMeal] = useState(false);
  const [savingSupp, setSavingSupp] = useState(false);

  // Meal form fields
  const [mealName, setMealName] = useState('');
  const [mealCals, setMealCals] = useState('');
  const [mealProtein, setMealProtein] = useState('');
  const [mealCarbs, setMealCarbs] = useState('');
  const [mealFat, setMealFat] = useState('');
  const [mealNotes, setMealNotes] = useState('');

  // Supplement form fields
  const [suppName, setSuppName] = useState('');
  const [suppDose, setSuppDose] = useState('');
  const [suppTime, setSuppTime] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    const { data: mealData } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true });
    setMeals(mealData || []);

    const { data: suppData } = await supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true });
    setSupplements(suppData || []);
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveMeal = async () => {
    if (!mealName.trim()) {
      Alert.alert('Required', 'Enter a meal name.');
      return;
    }
    setSavingMeal(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      date: today,
      name: mealName.trim(),
      calories: parseInt(mealCals) || null,
      protein: parseFloat(mealProtein) || null,
      carbs: parseFloat(mealCarbs) || null,
      fat: parseFloat(mealFat) || null,
      notes: mealNotes.trim() || null,
    });
    setSavingMeal(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setMealName(''); setMealCals(''); setMealProtein(''); setMealCarbs(''); setMealFat(''); setMealNotes('');
    setShowMealForm(false);
    loadData();
  };

  const deleteMeal = async (id) => {
    await supabase.from('meal_logs').delete().eq('id', id);
    loadData();
  };

  const saveSupp = async () => {
    if (!suppName.trim()) {
      Alert.alert('Required', 'Enter a supplement name.');
      return;
    }
    setSavingSupp(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('supplement_logs').insert({
      user_id: user.id,
      date: today,
      name: suppName.trim(),
      dose: suppDose.trim() || null,
      time_taken: suppTime.trim() || null,
      notes: null,
    });
    setSavingSupp(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setSuppName(''); setSuppDose(''); setSuppTime('');
    setShowSuppForm(false);
    loadData();
  };

  const deleteSupp = async (id) => {
    await supabase.from('supplement_logs').delete().eq('id', id);
    loadData();
  };

  // Dynamic macro targets
  const macroTargets = calcMacroTargets(profile);

  // Macro totals
  const totals = meals.reduce(
    (acc, m) => ({
      protein: acc.protein + (parseFloat(m.protein) || 0),
      carbs: acc.carbs + (parseFloat(m.carbs) || 0),
      fat: acc.fat + (parseFloat(m.fat) || 0),
      calories: acc.calories + (parseInt(m.calories) || 0),
    }),
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );

  // Carb day type (PRO only)
  const carbDayType = () => {
    if (profile?.subscription_tier !== 'pro') return null;
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 1 || dayOfWeek === 4) return 'HIGH CARB';
    if (dayOfWeek === 0 || dayOfWeek === 3 || dayOfWeek === 6) return 'LOW CARB';
    return 'MODERATE';
  };
  const carbType = carbDayType();
  const carbTypeColors = { 'HIGH CARB': colors.green, 'MODERATE': colors.gold, 'LOW CARB': colors.blue || '#4a9eff' };

  const eatingWindow = () => {
    const wake = profile?.wake_time || '06:00';
    const [wHour] = wake.split(':').map(Number);
    const endHour = wHour + 8;
    const format = (h) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    return `${format(wHour)} – ${format(endHour)} (8 hrs)`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Eating Window */}
        <Text style={styles.sectionLabel}>EATING WINDOW</Text>
        <Card style={styles.windowCard}>
          {profile?.subscription_tier === 'pro' ? (
            <View>
              {carbType && (
                <View style={[styles.carbBadge, { backgroundColor: (carbTypeColors[carbType] || colors.gold) + '22', borderColor: carbTypeColors[carbType] || colors.gold }]}>
                  <Text style={[styles.carbBadgeText, { color: carbTypeColors[carbType] || colors.gold }]}>{carbType}</Text>
                </View>
              )}
              <Text style={styles.windowText}>Eating window: {eatingWindow()}</Text>
              <Text style={styles.windowSub}>Based on your wake time and intermittent fasting protocol</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.upgradeText}>🔒 Upgrade to Pro for personalized nutrition timing</Text>
              <Text style={styles.windowSub}>Carb cycling, IF windows, and meal timing recommendations</Text>
            </View>
          )}
        </Card>

        {/* Macro Summary */}
        {meals.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>TODAY'S MACROS</Text>
            <Card style={styles.macroCard}>
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>CALORIES</Text>
                <Text style={styles.calValue}>{totals.calories} kcal</Text>
              </View>
              <MacroBar label="Protein" current={totals.protein} target={macroTargets.protein} color={colors.gold} />
              <MacroBar label="Carbs" current={totals.carbs} target={macroTargets.carbs} color={colors.green} />
              <MacroBar label="Fat" current={totals.fat} target={macroTargets.fat} color="#ff6b6b" />
            </Card>
          </>
        )}

        {/* Meal Log */}
        <View style={styles.sectionRowHeader}>
          <Text style={styles.sectionLabel}>MEAL LOG</Text>
          <TouchableOpacity style={styles.addRowBtn} onPress={() => setShowMealForm((v) => !v)}>
            <Text style={styles.addRowBtnText}>{showMealForm ? '— Cancel' : '+ LOG MEAL'}</Text>
          </TouchableOpacity>
        </View>

        {showMealForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>NEW MEAL</Text>
            <Text style={styles.fieldLabel}>MEAL NAME *</Text>
            <TextInput style={styles.input} value={mealName} onChangeText={setMealName} placeholder="e.g. Chicken & Rice" placeholderTextColor={colors.muted} />
            <View style={styles.macroInputRow}>
              <View style={styles.macroInputGroup}>
                <Text style={styles.fieldLabel}>CALORIES</Text>
                <TextInput style={styles.input} value={mealCals} onChangeText={setMealCals} placeholder="500" placeholderTextColor={colors.muted} keyboardType="numeric" />
              </View>
              <View style={styles.macroInputGroup}>
                <Text style={styles.fieldLabel}>PROTEIN (g)</Text>
                <TextInput style={styles.input} value={mealProtein} onChangeText={setMealProtein} placeholder="40" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={styles.macroInputRow}>
              <View style={styles.macroInputGroup}>
                <Text style={styles.fieldLabel}>CARBS (g)</Text>
                <TextInput style={styles.input} value={mealCarbs} onChangeText={setMealCarbs} placeholder="60" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
              </View>
              <View style={styles.macroInputGroup}>
                <Text style={styles.fieldLabel}>FAT (g)</Text>
                <TextInput style={styles.input} value={mealFat} onChangeText={setMealFat} placeholder="15" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
              </View>
            </View>
            <Text style={styles.fieldLabel}>NOTES (optional)</Text>
            <TextInput style={[styles.input, styles.notesInput]} value={mealNotes} onChangeText={setMealNotes} placeholder="Meal prep, restaurant name..." placeholderTextColor={colors.muted} multiline />
            <GoldButton title="SAVE MEAL" onPress={saveMeal} loading={savingMeal} style={{ marginTop: 12 }} />
          </Card>
        )}

        {meals.length === 0 && !showMealForm ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No meals logged today</Text>
            <Text style={styles.emptySub}>Tap + LOG MEAL to track your nutrition</Text>
          </Card>
        ) : (
          meals.map((meal) => (
            <Card key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <TouchableOpacity onPress={() => deleteMeal(meal.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.mealMacros}>
                {meal.calories ? <Text style={styles.mealMacro}>{meal.calories} kcal</Text> : null}
                {meal.protein ? <Text style={[styles.mealMacro, { color: colors.gold }]}>P: {meal.protein}g</Text> : null}
                {meal.carbs ? <Text style={[styles.mealMacro, { color: colors.green }]}>C: {meal.carbs}g</Text> : null}
                {meal.fat ? <Text style={[styles.mealMacro, { color: '#ff6b6b' }]}>F: {meal.fat}g</Text> : null}
              </View>
              {meal.notes ? <Text style={styles.mealNotes}>{meal.notes}</Text> : null}
            </Card>
          ))
        )}

        {/* Supplement Tracker */}
        <View style={styles.sectionRowHeader}>
          <Text style={styles.sectionLabel}>SUPPLEMENTS</Text>
          <TouchableOpacity style={styles.addRowBtn} onPress={() => setShowSuppForm((v) => !v)}>
            <Text style={styles.addRowBtnText}>{showSuppForm ? '— Cancel' : '+ LOG SUPPLEMENT'}</Text>
          </TouchableOpacity>
        </View>

        {/* Quick add chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {SUPPLEMENT_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.suppChip}
              onPress={() => { setSuppName(chip); setShowSuppForm(true); }}
            >
              <Text style={styles.suppChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {showSuppForm && (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>LOG SUPPLEMENT</Text>
            <Text style={styles.fieldLabel}>NAME *</Text>
            <TextInput style={styles.input} value={suppName} onChangeText={setSuppName} placeholder="e.g. Creatine" placeholderTextColor={colors.muted} />
            <Text style={styles.fieldLabel}>DOSE</Text>
            <TextInput style={styles.input} value={suppDose} onChangeText={setSuppDose} placeholder="5g" placeholderTextColor={colors.muted} />
            <Text style={styles.fieldLabel}>TIME (HH:MM)</Text>
            <TextInput style={styles.input} value={suppTime} onChangeText={setSuppTime} placeholder="07:30" placeholderTextColor={colors.muted} keyboardType="numbers-and-punctuation" />
            <GoldButton title="SAVE SUPPLEMENT" onPress={saveSupp} loading={savingSupp} style={{ marginTop: 12 }} />
          </Card>
        )}

        {supplements.length === 0 && !showSuppForm ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No supplements logged today</Text>
            <Text style={styles.emptySub}>Tap a chip above for quick-add</Text>
          </Card>
        ) : (
          supplements.map((supp) => (
            <Card key={supp.id} style={styles.suppCard}>
              <View style={styles.mealHeader}>
                <View>
                  <Text style={styles.suppName}>{supp.name}</Text>
                  {supp.dose ? <Text style={styles.suppDetail}>{supp.dose}{supp.time_taken ? ` · ${supp.time_taken}` : ''}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => deleteSupp(supp.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginBottom: 10, marginTop: 20,
  },
  sectionRowHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 20, marginBottom: 10,
  },
  addRowBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: colors.gold,
  },
  addRowBtnText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  windowCard: { marginBottom: 4 },
  carbBadge: {
    alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  carbBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  windowText: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  windowSub: { fontSize: 12, color: colors.muted },
  upgradeText: { fontSize: 14, color: colors.muted, marginBottom: 4 },
  macroCard: { marginBottom: 4 },
  calRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  calLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1.5 },
  calValue: { fontSize: 18, fontWeight: '800', color: colors.gold },
  macroBarRow: { marginBottom: 12 },
  macroBarLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', marginBottom: 4 },
  macroBarTrack: {
    height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 3,
  },
  macroBarFill: { height: 8, borderRadius: 4 },
  macroBarValue: { fontSize: 11, color: colors.muted },
  formCard: { marginBottom: 12 },
  formTitle: { fontSize: 12, fontWeight: '700', color: colors.gold, letterSpacing: 2, marginBottom: 12 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: colors.gold, letterSpacing: 1.5, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15,
  },
  notesInput: { minHeight: 70, paddingTop: 12, textAlignVertical: 'top' },
  macroInputRow: { flexDirection: 'row', gap: 10 },
  macroInputGroup: { flex: 1 },
  emptyCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 4 },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 4 },
  emptySub: { fontSize: 12, color: colors.muted },
  mealCard: { marginBottom: 8 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  mealName: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  deleteBtn: { color: colors.muted, fontSize: 14, paddingLeft: 8 },
  mealMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealMacro: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  mealNotes: { fontSize: 12, color: colors.muted, fontStyle: 'italic', marginTop: 6 },
  chipScroll: { marginBottom: 12 },
  suppChip: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  suppChipText: { color: colors.muted, fontSize: 13 },
  suppCard: { marginBottom: 8 },
  suppName: { fontSize: 15, fontWeight: '700', color: colors.text },
  suppDetail: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
