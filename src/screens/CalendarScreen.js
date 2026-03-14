import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const TABS = ['Workout', 'Nutrition', 'Recovery'];
const TAB_ICONS = ['🏋️', '🥗', '😴'];

function formatTime12(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcWindowHours(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const diff = endMins - startMins;
  if (diff <= 0) return null;
  return Math.round(diff / 60);
}

function carbDayLabel(type) {
  switch (type) {
    case 'high': return 'HIGH CARB';
    case 'moderate': return 'MODERATE';
    case 'low': return 'LOW CARB';
    case 'refeed': return 'REFEED DAY';
    case 'none': return 'NO CARBS';
    default: return type ? type.toUpperCase() : '—';
  }
}

function carbDayColor(type) {
  switch (type) {
    case 'high': return colors.gold;
    case 'refeed': return colors.gold;
    case 'moderate': return colors.blue;
    case 'low': return colors.muted;
    case 'none': return colors.muted;
    default: return colors.muted;
  }
}

export default function CalendarScreen({ navigation }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState(0); // 0=Workout, 1=Nutrition, 2=Recovery

  const [userId, setUserId] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState('free');

  // Meal logs for selected day (for nutrition dot + summary)
  const [dayMealLogs, setDayMealLogs] = useState([]);

  // Monthly dot data
  const [workoutDots, setWorkoutDots] = useState({}); // date -> true
  const [nutritionDots, setNutritionDots] = useState({}); // date -> carb_day_type
  const [recoveryDots, setRecoveryDots] = useState({}); // date -> sleep_hours

  // Selected day data
  const [dayWorkout, setDayWorkout] = useState(null);
  const [dayRun, setDayRun] = useState(null);
  const [dayNutrition, setDayNutrition] = useState(null);
  const [dayRecovery, setDayRecovery] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);

  // Recovery log modal
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [sleepHours, setSleepHours] = useState('7');
  const [sorenessLevel, setSorenessLevel] = useState(3);
  const [mobilityDone, setMobilityDone] = useState(false);
  const [coldTherapy, setColdTherapy] = useState(false);
  const [savingRecovery, setSavingRecovery] = useState(false);

  // Nutrition note modal
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [mealNotes, setMealNotes] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      setSubscriptionTier(prof?.subscription_tier || 'free');
    })();
  }, []);

  const loadMonthData = useCallback(async () => {
    if (!userId) return;
    const year = currentYear;
    const month = currentMonth;
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Workout dots
    const [{ data: wData }, { data: rData }] = await Promise.all([
      supabase.from('workouts').select('date').eq('user_id', userId).gte('date', firstDay).lte('date', lastDayStr),
      supabase.from('runs').select('date').eq('user_id', userId).gte('date', firstDay).lte('date', lastDayStr),
    ]);
    const wDots = {};
    (wData || []).forEach((w) => { wDots[w.date] = true; });
    (rData || []).forEach((r) => { wDots[r.date] = true; });
    setWorkoutDots(wDots);

    // Nutrition dots — from nutrition_logs AND meal_logs
    const [{ data: nData }, { data: mealDatesData }] = await Promise.all([
      supabase.from('nutrition_logs').select('date, carb_day_type').eq('user_id', userId).gte('date', firstDay).lte('date', lastDayStr),
      supabase.from('meal_logs').select('date').eq('user_id', userId).gte('date', firstDay).lte('date', lastDayStr),
    ]);
    const nDots = {};
    (nData || []).forEach((n) => { nDots[n.date] = n.carb_day_type || 'logged'; });
    // Also mark days with meal_logs entries
    (mealDatesData || []).forEach((m) => {
      if (!nDots[m.date]) nDots[m.date] = 'logged';
    });
    setNutritionDots(nDots);

    // Recovery dots
    const { data: recData } = await supabase
      .from('recovery_logs')
      .select('date, sleep_hours')
      .eq('user_id', userId)
      .gte('date', firstDay)
      .lte('date', lastDayStr);
    const recDots = {};
    (recData || []).forEach((r) => { recDots[r.date] = r.sleep_hours; });
    setRecoveryDots(recDots);
  }, [userId, currentYear, currentMonth]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const loadDayData = useCallback(async (dateStr) => {
    if (!userId) return;
    setDayLoading(true);
    setDayWorkout(null);
    setDayRun(null);
    setDayNutrition(null);
    setDayRecovery(null);
    setDayMealLogs([]);

    const [{ data: wData }, { data: rData }, { data: nData }, { data: recData }, { data: mealData }] = await Promise.all([
      supabase.from('workouts').select('id, name, exercises(id, name)').eq('user_id', userId).eq('date', dateStr).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('runs').select('distance, duration_seconds, pace_per_mile_seconds').eq('user_id', userId).eq('date', dateStr).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('nutrition_logs').select('*').eq('user_id', userId).eq('date', dateStr).single(),
      supabase.from('recovery_logs').select('*').eq('user_id', userId).eq('date', dateStr).single(),
      supabase.from('meal_logs').select('name, calories, protein').eq('user_id', userId).eq('date', dateStr).order('created_at', { ascending: true }),
    ]);

    if (wData) setDayWorkout(wData);
    if (rData) setDayRun(rData);
    if (nData) setDayNutrition(nData);
    setDayMealLogs(mealData || []);
    if (recData) {
      setDayRecovery(recData);
      setSleepHours(String(recData.sleep_hours || '7'));
      setSorenessLevel(recData.soreness_level || 3);
      setMobilityDone(recData.mobility_done || false);
      setColdTherapy(recData.cold_therapy || false);
    }

    setDayLoading(false);
  }, [userId]);

  useEffect(() => {
    if (selectedDate) {
      loadDayData(selectedDate);
    }
  }, [selectedDate, loadDayData]);

  // ─── Calendar grid helpers ────────────────────────────────────────────────
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

  const buildCalendarGrid = () => {
    const days = getDaysInMonth(currentYear, currentMonth);
    const firstDow = getFirstDayOfWeek(currentYear, currentMonth);
    const grid = [];
    for (let i = 0; i < firstDow; i++) grid.push(null);
    for (let d = 1; d <= days; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth, 1).toLocaleString('en-US', { month: 'long' });

  const dateString = (day) =>
    `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayStr = today.toISOString().split('T')[0];

  const getDotColor = (day) => {
    if (!day) return null;
    const ds = dateString(day);
    if (activeTab === 0) return workoutDots[ds] ? colors.gold : null;
    if (activeTab === 1) {
      const ct = nutritionDots[ds];
      if (!ct) return null;
      return carbDayColor(ct);
    }
    if (activeTab === 2) return recoveryDots[ds] !== undefined ? colors.green : null;
    return null;
  };

  const grid = buildCalendarGrid();

  // ─── Save recovery log ────────────────────────────────────────────────────
  const saveRecovery = async () => {
    if (!userId) return;
    setSavingRecovery(true);
    await supabase
      .from('recovery_logs')
      .upsert(
        {
          user_id: userId,
          date: selectedDate,
          sleep_hours: parseFloat(sleepHours) || null,
          soreness_level: sorenessLevel,
          mobility_done: mobilityDone,
          cold_therapy: coldTherapy,
        },
        { onConflict: 'user_id,date' }
      );
    setSavingRecovery(false);
    setRecoveryModalVisible(false);
    loadDayData(selectedDate);
    loadMonthData();
  };

  // ─── Save meal notes ──────────────────────────────────────────────────────
  const saveMeal = async () => {
    if (!userId) return;
    setSavingMeal(true);
    await supabase
      .from('nutrition_logs')
      .upsert(
        {
          user_id: userId,
          date: selectedDate,
          notes: mealNotes,
        },
        { onConflict: 'user_id,date' }
      );
    setSavingMeal(false);
    setMealModalVisible(false);
    loadDayData(selectedDate);
    loadMonthData();
  };

  // ─── Detail panels ────────────────────────────────────────────────────────

  const renderWorkoutDetail = () => {
    if (dayLoading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />;
    return (
      <View>
        {dayWorkout ? (
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailEmoji}>🏋️</Text>
              <View style={styles.detailInfo}>
                <Text style={styles.detailTitle}>{dayWorkout.name || 'Workout'}</Text>
                {dayWorkout.exercises && dayWorkout.exercises.length > 0 ? (
                  <Text style={styles.detailMeta}>
                    {dayWorkout.exercises.slice(0, 3).map((e) => e.name).join(' · ')}
                    {dayWorkout.exercises.length > 3 ? ` +${dayWorkout.exercises.length - 3} more` : ''}
                  </Text>
                ) : (
                  <Text style={styles.detailMeta}>{dayWorkout.exercises?.length || 0} exercises</Text>
                )}
              </View>
            </View>
          </Card>
        ) : null}
        {dayRun ? (
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailEmoji}>🏃</Text>
              <View style={styles.detailInfo}>
                <Text style={styles.detailTitle}>
                  {Number(dayRun.distance).toFixed(2)} mi run
                </Text>
                {dayRun.pace_per_mile_seconds ? (
                  <Text style={styles.detailMeta}>
                    {Math.floor(dayRun.pace_per_mile_seconds / 60)}:{String(dayRun.pace_per_mile_seconds % 60).padStart(2, '0')}/mi
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        ) : null}
        {!dayWorkout && !dayRun ? (
          <Card style={styles.emptyDetail}>
            <Text style={styles.emptyDetailText}>No session logged</Text>
            <GoldButton
              title="LOG WORKOUT"
              onPress={() => navigation.navigate('Workout')}
              style={styles.detailBtn}
            />
          </Card>
        ) : null}
      </View>
    );
  };

  const renderNutritionDetail = () => {
    if (dayLoading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />;

    if (subscriptionTier === 'free') {
      return (
        <Card style={styles.detailCard}>
          <View style={styles.lockedRow}>
            <Text style={styles.lockIcon}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.lockedTitle}>Upgrade to Pro for personalized nutrition planning</Text>
              <Text style={styles.lockedTip}>Stay hydrated. Eat whole foods.</Text>
            </View>
          </View>
        </Card>
      );
    }

    // PRO
    return (
      <View>
        {dayNutrition ? (
          <Card style={styles.detailCard}>
            {dayNutrition.carb_day_type ? (
              <View style={[styles.carbBadge, { borderColor: carbDayColor(dayNutrition.carb_day_type) }]}>
                <Text style={[styles.carbBadgeText, { color: carbDayColor(dayNutrition.carb_day_type) }]}>
                  {carbDayLabel(dayNutrition.carb_day_type)}
                </Text>
              </View>
            ) : null}
            {dayNutrition.eating_window_start && dayNutrition.eating_window_end ? (
              <Text style={styles.eatingWindow}>
                Eat {formatTime12(dayNutrition.eating_window_start)} → {formatTime12(dayNutrition.eating_window_end)}
                {calcWindowHours(dayNutrition.eating_window_start, dayNutrition.eating_window_end)
                  ? ` (${calcWindowHours(dayNutrition.eating_window_start, dayNutrition.eating_window_end)}hr window)`
                  : ''}
              </Text>
            ) : null}
            {dayNutrition.notes ? (
              <Text style={styles.detailMeta}>{dayNutrition.notes}</Text>
            ) : null}
            {dayMealLogs.length > 0 && (
              <View style={styles.mealSummary}>
                <Text style={styles.mealSummaryTitle}>TODAY'S MEALS</Text>
                <Text style={styles.mealSummaryText}>
                  {dayMealLogs.reduce((s, m) => s + (parseInt(m.calories) || 0), 0)} kcal
                  {' · '}
                  {dayMealLogs.reduce((s, m) => s + (parseFloat(m.protein) || 0), 0).toFixed(0)}g protein
                  {' · '}
                  {dayMealLogs.length} meal{dayMealLogs.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            <GoldButton
              title="LOG MEAL"
              onPress={() => {
                setMealNotes(dayNutrition?.notes || '');
                setMealModalVisible(true);
              }}
              style={styles.detailBtn}
            />
          </Card>
        ) : (
          <Card style={styles.emptyDetail}>
            <Text style={styles.emptyDetailText}>No nutrition plan for this day</Text>
            {dayMealLogs.length > 0 && (
              <View style={styles.mealSummary}>
                <Text style={styles.mealSummaryTitle}>MEALS LOGGED</Text>
                <Text style={styles.mealSummaryText}>
                  {dayMealLogs.reduce((s, m) => s + (parseInt(m.calories) || 0), 0)} kcal
                  {' · '}
                  {dayMealLogs.reduce((s, m) => s + (parseFloat(m.protein) || 0), 0).toFixed(0)}g protein
                  {' · '}
                  {dayMealLogs.length} meal{dayMealLogs.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            <GoldButton
              title="LOG MEAL"
              onPress={() => {
                setMealNotes('');
                setMealModalVisible(true);
              }}
              style={styles.detailBtn}
            />
          </Card>
        )}
      </View>
    );
  };

  const renderRecoveryDetail = () => {
    if (dayLoading) return <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} />;

    const readinessScore = dayRecovery
      ? Math.max(0, 10 - (dayRecovery.soreness_level || 3) + (parseFloat(dayRecovery.sleep_hours) > 7 ? 2 : 0))
      : null;

    return (
      <View>
        <Card style={styles.detailCard}>
          {dayRecovery ? (
            <View>
              <View style={styles.recoveryGrid}>
                <View style={styles.recoveryItem}>
                  <Text style={styles.recoveryValue}>
                    {dayRecovery.sleep_hours != null ? `${dayRecovery.sleep_hours}h` : '—'}
                  </Text>
                  <Text style={styles.recoveryLabel}>SLEEP</Text>
                </View>
                <View style={styles.recoveryItem}>
                  <Text style={styles.recoveryValue}>
                    {dayRecovery.soreness_level != null
                      ? '★'.repeat(dayRecovery.soreness_level) + '☆'.repeat(5 - dayRecovery.soreness_level)
                      : '—'}
                  </Text>
                  <Text style={styles.recoveryLabel}>SORENESS</Text>
                </View>
                <View style={styles.recoveryItem}>
                  <Text style={[styles.recoveryValue, { color: dayRecovery.mobility_done ? colors.green : colors.muted }]}>
                    {dayRecovery.mobility_done ? '✓' : '✗'}
                  </Text>
                  <Text style={styles.recoveryLabel}>MOBILITY</Text>
                </View>
              </View>

              {subscriptionTier === 'pro' ? (
                <View>
                  <View style={styles.recoveryGrid}>
                    <View style={styles.recoveryItem}>
                      <Text style={[styles.recoveryValue, { color: dayRecovery.cold_therapy ? colors.blue : colors.muted }]}>
                        {dayRecovery.cold_therapy ? '✓' : '✗'}
                      </Text>
                      <Text style={styles.recoveryLabel}>COLD THERAPY</Text>
                    </View>
                    <View style={styles.recoveryItem}>
                      <Text style={[styles.recoveryValue, { color: readinessScore >= 8 ? colors.green : readinessScore >= 6 ? colors.gold : colors.error }]}>
                        {readinessScore}/10
                      </Text>
                      <Text style={styles.recoveryLabel}>READINESS</Text>
                    </View>
                  </View>
                  {dayRecovery.notes ? (
                    <Text style={styles.recoveryNote}>{dayRecovery.notes}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyDetailText}>No recovery data logged</Text>
          )}

          <GoldButton
            title={dayRecovery ? 'EDIT RECOVERY' : 'LOG RECOVERY'}
            onPress={() => {
              if (dayRecovery) {
                setSleepHours(String(dayRecovery.sleep_hours || '7'));
                setSorenessLevel(dayRecovery.soreness_level || 3);
                setMobilityDone(dayRecovery.mobility_done || false);
                setColdTherapy(dayRecovery.cold_therapy || false);
              } else {
                setSleepHours('7');
                setSorenessLevel(3);
                setMobilityDone(false);
                setColdTherapy(false);
              }
              setRecoveryModalVisible(true);
            }}
            style={styles.detailBtn}
          />
        </Card>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
          <Text style={styles.monthNavArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthName} {currentYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
          <Text style={styles.monthNavArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week header */}
      <View style={styles.weekHeader}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.weekHeaderDay}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {grid.map((day, idx) => {
          const ds = day ? dateString(day) : null;
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr;
          const dotColor = getDotColor(day);

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
              onPress={() => day && setSelectedDate(ds)}
              disabled={!day}
            >
              <Text style={[
                styles.dayCellText,
                isSelected && styles.dayCellTextSelected,
                !day && styles.dayCellEmpty,
              ]}>
                {day || ''}
              </Text>
              {dotColor ? (
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              ) : (
                <View style={styles.dotEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        {TABS.map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabPill, activeTab === idx && styles.tabPillActive]}
            onPress={() => setActiveTab(idx)}
          >
            <Text style={[styles.tabPillText, activeTab === idx && styles.tabPillTextActive]}>
              {TAB_ICONS[idx]} {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected date label */}
      <Text style={styles.selectedDateLabel}>
        {selectedDate
          ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })
          : ''}
      </Text>

      {/* Detail panel */}
      {activeTab === 0 && renderWorkoutDetail()}
      {activeTab === 1 && renderNutritionDetail()}
      {activeTab === 2 && renderRecoveryDetail()}

      {/* Recovery log modal */}
      <Modal
        visible={recoveryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRecoveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>LOG RECOVERY</Text>

            <Text style={styles.modalLabel}>SLEEP HOURS</Text>
            <View style={styles.sleepRow}>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.sleepChip, parseFloat(sleepHours) === h && styles.sleepChipActive]}
                  onPress={() => setSleepHours(String(h))}
                >
                  <Text style={[styles.sleepChipText, parseFloat(sleepHours) === h && styles.sleepChipTextActive]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>SORENESS (1=none, 5=wrecked)</Text>
            <View style={styles.sorenessRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSorenessLevel(s)}
                >
                  <Text style={[styles.star, s <= sorenessLevel && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Mobility done</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, mobilityDone && styles.toggleBtnActive]}
                onPress={() => setMobilityDone((v) => !v)}
              >
                <Text style={[styles.toggleBtnText, mobilityDone && styles.toggleBtnTextActive]}>
                  {mobilityDone ? 'YES ✓' : 'NO'}
                </Text>
              </TouchableOpacity>
            </View>

            {subscriptionTier === 'pro' && (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Cold therapy</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, coldTherapy && styles.toggleBtnActive]}
                  onPress={() => setColdTherapy((v) => !v)}
                >
                  <Text style={[styles.toggleBtnText, coldTherapy && styles.toggleBtnTextActive]}>
                    {coldTherapy ? 'YES ✓' : 'NO'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRecoveryModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <GoldButton
                title="SAVE"
                onPress={saveRecovery}
                loading={savingRecovery}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Meal notes modal */}
      <Modal
        visible={mealModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMealModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>LOG MEAL NOTES</Text>
            <TextInput
              style={styles.mealInput}
              value={mealNotes}
              onChangeText={setMealNotes}
              placeholder="e.g. Pre-workout rice + chicken, post-workout shake..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setMealModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <GoldButton
                title="SAVE"
                onPress={saveMeal}
                loading={savingMeal}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  // Month nav
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthNavArrow: {
    fontSize: 26,
    color: colors.gold,
    fontWeight: '700',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  // Day headers
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekHeaderDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  // Calendar grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.gold,
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 8,
  },
  dayCellText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: colors.background,
    fontWeight: '800',
  },
  dayCellEmpty: {
    color: 'transparent',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  dotEmpty: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderColor: colors.gold,
  },
  tabPillText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: colors.gold,
  },
  selectedDateLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Detail cards
  detailCard: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailEmoji: {
    fontSize: 28,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  detailMeta: {
    fontSize: 13,
    color: colors.muted,
  },
  detailBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  emptyDetail: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 12,
  },
  emptyDetailText: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
    textAlign: 'center',
  },
  // Locked (FREE nutrition)
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  lockIcon: {
    fontSize: 24,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  lockedTip: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  // PRO nutrition
  carbBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  carbBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eatingWindow: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  mealSummary: {
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  mealSummaryTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  mealSummaryText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  // Recovery
  recoveryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  recoveryItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 10,
  },
  recoveryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  recoveryLabel: {
    fontSize: 9,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  recoveryNote: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 8,
  },
  sleepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  sleepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  sleepChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  sleepChipText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  sleepChipTextActive: {
    color: colors.gold,
  },
  sorenessRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  star: {
    fontSize: 28,
    color: colors.border,
  },
  starActive: {
    color: colors.gold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.text,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  toggleBtnActive: {
    borderColor: colors.green,
    backgroundColor: 'rgba(57,255,20,0.1)',
  },
  toggleBtnText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: colors.green,
  },
  mealInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
