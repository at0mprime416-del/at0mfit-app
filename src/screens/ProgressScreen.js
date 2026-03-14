import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import { useProfile } from '../context/ProfileContext';
import FilteredImage from '../components/FilteredImage';
import PhotoFilterModal from '../components/PhotoFilterModal';

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
function WeightLineChart({ data, unitLabel = 'lbs' }) {
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
          <Line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke={colors.border} strokeWidth={1} />
          {data.length > 1 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.gold}
              strokeWidth={2}
              strokeOpacity={0.85}
            />
          )}
          {points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.gold} />
          ))}
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <Text style={styles.chartAxisLabel}>{data[0].label}</Text>
          <Text style={styles.chartAxisLabel}>{data[data.length - 1].label}</Text>
        </View>
      </View>
      <View style={styles.weightMinMax}>
        <Text style={styles.weightMinMaxText}>Min: {minW} {unitLabel}</Text>
        <Text style={styles.weightMinMaxText}>Max: {maxW} {unitLabel}</Text>
      </View>
    </View>
  );
}

// ── Training Frequency Heatmap ────────────────────────────────────────────────
function FrequencyHeatmap({ workoutDays, runDays }) {
  const today = new Date();
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const hasWorkout = workoutDays.has(ds);
    const hasRun = runDays.has(ds);
    let color = colors.surface;
    if (hasWorkout && hasRun) color = '#e6b84a';
    else if (hasWorkout) color = colors.gold;
    else if (hasRun) color = colors.blue;
    cells.push({ ds, color, dayOfWeek: d.getDay() });
  }

  const weeks = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  const getWeekLabel = (weekIdx) => {
    const startCell = weeks[weekIdx][0];
    const d = new Date(startCell.ds + 'T00:00:00');
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const CELL_SIZE = Math.floor((width - 80) / 7) - 2;

  return (
    <View>
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

      <View style={styles.heatmapDowRow}>
        <View style={styles.heatmapWeekLabel} />
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={[styles.heatmapDow, { width: CELL_SIZE + 2 }]}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, wIdx) => (
        <View key={wIdx} style={styles.heatmapRow}>
          <Text style={styles.heatmapWeekLabel}>{getWeekLabel(wIdx)}</Text>
          {week.map((cell, cIdx) => (
            <View
              key={cIdx}
              style={[styles.heatmapCell, { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: cell.color }]}
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
  if (w >= standards.advanced) return { label: 'ELITE', color: '#39ff14' };
  if (w >= standards.intermediate) return { label: 'ADVANCED', color: colors.gold };
  if (w >= standards.novice) return { label: 'INTERMEDIATE', color: colors.blue };
  return { label: 'NOVICE', color: colors.muted };
}

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

// ── Progress Photos Section ─────────────────────────────────────────────────

const PHOTO_THUMB = (width - 60) / 2;

function ProgressPhotosSection({ userId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filter modal state
  const [pendingUri, setPendingUri] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Fullscreen viewer
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [compareModalVisible, setCompareModalVisible] = useState(false);

  useEffect(() => {
    if (userId) loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('progress_photos')
      .select('*')
      .eq('user_id', userId)
      .order('taken_at', { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  };

  const openPhotoPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) launchCamera();
          else if (idx === 1) launchLibrary();
        }
      );
    } else {
      Alert.alert('Add Progress Photo', 'Choose source', [
        { text: 'Take Photo', onPress: launchCamera },
        { text: 'Choose from Library', onPress: launchLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const launchCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) { Alert.alert('Camera access required'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingUri(result.assets[0].uri);
      setFilterModalVisible(true);
    }
  };

  const launchLibrary = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) { Alert.alert('Library access required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingUri(result.assets[0].uri);
      setFilterModalVisible(true);
    }
  };

  const handleFilterSave = async (filterName, label) => {
    setFilterModalVisible(false);
    if (!pendingUri || !userId) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const filePath = `${userId}/${timestamp}.jpg`;
      const response = await fetch(pendingUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('progress-photos').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('progress_photos').insert({
        user_id: userId,
        photo_url: urlData.publicUrl,
        label: label || 'front',
        filter_name: filterName || 'original',
        taken_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;

      await loadPhotos();
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploading(false);
      setPendingUri(null);
    }
  };

  const handleFilterCancel = () => {
    setFilterModalVisible(false);
    setPendingUri(null);
  };

  const deletePhoto = (photo) => {
    Alert.alert('Delete Photo', 'Remove this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('progress_photos').delete().eq('id', photo.id);
          loadPhotos();
        },
      },
    ]);
  };

  const openViewer = (photo) => {
    setViewerPhoto(photo);
    setViewerVisible(true);
  };

  const openCompare = () => {
    if (photos.length < 2) return;
    setCompareA(photos[photos.length - 1]); // oldest
    setCompareB(photos[0]);                  // newest
    setCompareModalVisible(true);
  };

  const LABEL_COLOR = { front: colors.blue, back: '#ff6b6b', side: colors.gold, other: colors.muted };

  return (
    <View>
      {/* Filter modal */}
      <PhotoFilterModal
        visible={filterModalVisible}
        uri={pendingUri}
        context="progress"
        onSave={handleFilterSave}
        onCancel={handleFilterCancel}
      />

      {/* Header row */}
      <View style={styles.photoSectionHeader}>
        <Text style={styles.sectionLabel}>PROGRESS PHOTOS 📸</Text>
        <View style={styles.photoHeaderActions}>
          {photos.length >= 2 && (
            <TouchableOpacity style={styles.compareBtn} onPress={openCompare}>
              <Text style={styles.compareBtnText}>COMPARE</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.addPhotoBtn} onPress={openPhotoPicker} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.gold} />
            ) : (
              <Text style={styles.addPhotoBtnText}>+ ADD</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginVertical: 20 }} />
      ) : photos.length === 0 ? (
        <Card style={styles.photoEmptyCard}>
          <Text style={styles.photoEmptyEmoji}>📸</Text>
          <Text style={styles.photoEmptyText}>No progress photos yet.</Text>
          <Text style={styles.photoEmptySubtext}>Tap + ADD to start tracking your transformation.</Text>
          <TouchableOpacity style={styles.addPhotoLargeBtn} onPress={openPhotoPicker}>
            <Text style={styles.addPhotoLargeBtnText}>📷 ADD FIRST PHOTO</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoCard}
              onPress={() => openViewer(photo)}
              onLongPress={() => deletePhoto(photo)}
              activeOpacity={0.85}
            >
              <FilteredImage
                uri={photo.photo_url}
                filterName={photo.filter_name || 'original'}
                style={styles.photoThumb}
              />
              {/* Label badge */}
              <View style={[styles.photoLabelBadge, { backgroundColor: LABEL_COLOR[photo.label] || colors.muted }]}>
                <Text style={styles.photoLabelText}>{(photo.label || 'front').toUpperCase()}</Text>
              </View>
              {/* Date */}
              <Text style={styles.photoDate}>
                {new Date(photo.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              {/* Delete button */}
              <TouchableOpacity
                style={styles.photoDeleteBtn}
                onPress={() => deletePhoto(photo)}
              >
                <Text style={styles.photoDeleteText}>×</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Fullscreen viewer modal */}
      <Modal visible={viewerVisible} animationType="fade" transparent onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewerPhoto && (
            <>
              <FilteredImage
                uri={viewerPhoto.photo_url}
                filterName={viewerPhoto.filter_name || 'original'}
                style={styles.viewerImage}
              />
              <View style={styles.viewerMeta}>
                <Text style={styles.viewerDate}>
                  {new Date(viewerPhoto.taken_at).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
                <Text style={styles.viewerLabel}>
                  {(viewerPhoto.label || 'front').toUpperCase()} · {(viewerPhoto.filter_name || 'original').toUpperCase()}
                </Text>
                {viewerPhoto.notes ? (
                  <Text style={styles.viewerNotes}>{viewerPhoto.notes}</Text>
                ) : null}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Compare modal */}
      <Modal visible={compareModalVisible} animationType="slide" transparent onRequestClose={() => setCompareModalVisible(false)}>
        <View style={styles.compareOverlay}>
          <View style={styles.compareModal}>
            <Text style={styles.compareTitle}>BEFORE / AFTER</Text>
            <View style={styles.comparePair}>
              {compareA && (
                <View style={styles.compareItem}>
                  <FilteredImage
                    uri={compareA.photo_url}
                    filterName={compareA.filter_name || 'original'}
                    style={styles.comparePhoto}
                  />
                  <Text style={styles.compareItemLabel}>
                    {new Date(compareA.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </Text>
                  <Text style={styles.compareItemSub}>BEFORE</Text>
                </View>
              )}
              <View style={styles.compareDivider}>
                <Text style={styles.compareDividerText}>VS</Text>
              </View>
              {compareB && (
                <View style={styles.compareItem}>
                  <FilteredImage
                    uri={compareB.photo_url}
                    filterName={compareB.filter_name || 'original'}
                    style={styles.comparePhoto}
                  />
                  <Text style={styles.compareItemLabel}>
                    {new Date(compareB.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                  </Text>
                  <Text style={styles.compareItemSub}>AFTER</Text>
                </View>
              )}
            </View>

            {/* Photo selectors */}
            <Text style={styles.compareSelectLabel}>SELECT BEFORE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compareSelector}>
              {[...photos].reverse().map((p) => (
                <TouchableOpacity key={p.id} onPress={() => setCompareA(p)}>
                  <FilteredImage
                    uri={p.photo_url}
                    filterName={p.filter_name || 'original'}
                    style={[
                      styles.compareSelectorThumb,
                      compareA?.id === p.id && styles.compareSelectorThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.compareSelectLabel}>SELECT AFTER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compareSelector}>
              {photos.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => setCompareB(p)}>
                  <FilteredImage
                    uri={p.photo_url}
                    filterName={p.filter_name || 'original'}
                    style={[
                      styles.compareSelectorThumb,
                      compareB?.id === p.id && styles.compareSelectorThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.compareCloseBtn} onPress={() => setCompareModalVisible(false)}>
              <Text style={styles.compareCloseBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { weightLabel } = useProfile();

  const [weeklyData, setWeeklyData] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volumeRange, setVolumeRange] = useState(7);
  const [userId, setUserId] = useState(null);

  // Body weight
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightData, setWeightData] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);

  // Body fat
  const [bodyFatInput, setBodyFatInput] = useState('');
  const [savingBodyFat, setSavingBodyFat] = useState(false);
  const [bodyFatData, setBodyFatData] = useState([]);
  const [bodyFatHistory, setBodyFatHistory] = useState([]);

  // Weekly mileage
  const [weeklyMileage, setWeeklyMileage] = useState([]);
  const [mileageRange, setMileageRange] = useState(7);

  // Streak
  const [streak, setStreak] = useState(0);

  // Heatmap
  const [heatmapWorkoutDays, setHeatmapWorkoutDays] = useState(new Set());
  const [heatmapRunDays, setHeatmapRunDays] = useState(new Set());

  // Run records
  const [runRecords, setRunRecords] = useState(null);

  const loadProgress = async (rangeDays = 7, mileageDays = 7) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

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
      .select('date, exercises(weight, sets, reps)')
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
            (s, e) => s + ((e.weight || 0) * (e.sets || 1) * (e.reps || 1)),
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

    // PRs
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('name, weight, sets, reps, workout_id, workouts!inner(user_id, date)')
      .eq('workouts.user_id', user.id)
      .not('weight', 'is', null)
      .order('weight', { ascending: false });

    if (allExercises) {
      const seen = new Set();
      const prList = [];
      for (const ex of allExercises) {
        if (!seen.has(ex.name)) {
          seen.add(ex.name);
          prList.push({
            name: ex.name,
            weight: ex.weight,
            sets: ex.sets,
            reps: ex.reps,
            date: new Date(ex.workouts.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          });
        }
        if (prList.length >= 10) break;
      }
      setPrs(prList);
    }

    // Body weight
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const { data: weightLogs } = await supabase
      .from('body_weight_logs')
      .select('id, date, weight')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (weightLogs && weightLogs.length > 0) {
      setWeightData(
        weightLogs.map((w) => ({
          label: new Date(w.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: parseFloat(w.weight),
        }))
      );
      setWeightHistory(weightLogs.slice(-7).reverse());
    } else {
      setWeightData([]);
      setWeightHistory([]);
    }

    // Weekly mileage
    const mileageStart = new Date();
    mileageStart.setDate(mileageStart.getDate() - (mileageDays - 1));
    const mileageStartStr = mileageStart.toISOString().split('T')[0];
    const mileageDaysList = [];
    for (let i = mileageDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      mileageDaysList.push(d.toISOString().split('T')[0]);
    }

    const { data: runs } = await supabase
      .from('runs')
      .select('date, distance')
      .eq('user_id', user.id)
      .gte('date', mileageStartStr);

    const isMileageShort = mileageDays <= 7;
    const mileageData = mileageDaysList
      .filter((_, i) => {
        if (isMileageShort) return true;
        if (mileageDays === 30) return i % 3 === 0;
        return i % 7 === 0;
      })
      .map((day) => {
        const miles = (runs || [])
          .filter((r) => r.date === day)
          .reduce((sum, r) => sum + (parseFloat(r.distance) || 0), 0);
        const label = isMileageShort
          ? new Date(day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)
          : new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).slice(0, 4);
        return { label, value: Math.round(miles * 10) / 10 };
      });
    setWeeklyMileage(mileageData);

    // Heatmap
    const heatmapStart = new Date();
    heatmapStart.setDate(heatmapStart.getDate() - 83);
    const heatmapStartStr = heatmapStart.toISOString().split('T')[0];

    const [{ data: hmWorkouts }, { data: hmRuns }] = await Promise.all([
      supabase.from('workouts').select('date').eq('user_id', user.id).gte('date', heatmapStartStr),
      supabase.from('runs').select('date').eq('user_id', user.id).gte('date', heatmapStartStr),
    ]);

    setHeatmapWorkoutDays(new Set((hmWorkouts || []).map((w) => w.date)));
    setHeatmapRunDays(new Set((hmRuns || []).map((r) => r.date)));

    // Run records
    const { data: allRuns } = await supabase
      .from('runs')
      .select('distance, pace_per_mile_seconds, elevation_ft')
      .eq('user_id', user.id);

    if (allRuns && allRuns.length > 0) {
      let longestRun = null, bestPaceRun = null, mostElevationRun = null;
      for (const r of allRuns) {
        const dist = parseFloat(r.distance) || 0;
        const pace = r.pace_per_mile_seconds;
        const elev = r.elevation_ft || 0;
        if (dist > 0 && (longestRun === null || dist > longestRun.distance)) longestRun = { ...r, distance: dist };
        if (pace && pace > 0 && (bestPaceRun === null || pace < bestPaceRun.pace_per_mile_seconds)) bestPaceRun = { ...r, pace_per_mile_seconds: pace };
        if (elev > 0 && (mostElevationRun === null || elev > mostElevationRun.elevation_ft)) mostElevationRun = { ...r, elevation_ft: elev };
      }
      setRunRecords({ longestRun, bestPaceRun, mostElevationRun });
    } else {
      setRunRecords(null);
    }

    // Streak
    const { data: allWorkoutDates } = await supabase
      .from('workouts')
      .select('date')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (allWorkoutDates && allWorkoutDates.length > 0) {
      const workoutDaySet = new Set(allWorkoutDates.map((w) => w.date));
      const today = new Date().toISOString().split('T')[0];
      let count = 0;
      const cursor = new Date();
      if (!workoutDaySet.has(today)) cursor.setDate(cursor.getDate() - 1);
      while (true) {
        const dayStr = cursor.toISOString().split('T')[0];
        if (workoutDaySet.has(dayStr)) {
          count++;
          cursor.setDate(cursor.getDate() - 1);
        } else { break; }
      }
      setStreak(count);
    } else {
      setStreak(0);
    }

    // Body fat
    const bfStart = new Date();
    bfStart.setDate(bfStart.getDate() - 29);
    const { data: bfLogs } = await supabase
      .from('body_fat_logs')
      .select('id, date, body_fat_pct')
      .eq('user_id', user.id)
      .gte('date', bfStart.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (bfLogs && bfLogs.length > 0) {
      setBodyFatData(
        bfLogs.map((b) => ({
          label: new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          weight: parseFloat(b.body_fat_pct),
        }))
      );
      setBodyFatHistory(bfLogs.slice(-7).reverse());
    } else {
      setBodyFatData([]);
      setBodyFatHistory([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProgress(volumeRange, mileageRange);
  }, [volumeRange, mileageRange]);

  const saveWeight = async () => {
    const w = parseFloat(weightInput);
    if (!w || w <= 0) {
      Alert.alert('Invalid weight', `Enter a valid weight in ${weightLabel}.`);
      return;
    }
    setSavingWeight(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingWeight(false); return; }

    const today = todayStr();
    const { error } = await supabase
      .from('body_weight_logs')
      .upsert({ user_id: user.id, date: today, weight: w }, { onConflict: 'user_id,date' });

    setSavingWeight(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      Alert.alert('Weight logged! ⚖️', `${w} ${weightLabel} recorded for today.`);
      setWeightInput('');
      loadProgress(volumeRange, mileageRange);
    }
  };

  const deleteWeight = async (id, dateStr) => {
    Alert.alert('Delete entry', `Remove weight log for ${dateStr}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('body_weight_logs').delete().eq('id', id);
          loadProgress(volumeRange, mileageRange);
        },
      },
    ]);
  };

  const saveBodyFat = async () => {
    const v = parseFloat(bodyFatInput);
    if (!v || v <= 0 || v > 70) {
      Alert.alert('Invalid', 'Enter a valid body fat % (e.g. 15.5).');
      return;
    }
    setSavingBodyFat(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingBodyFat(false); return; }

    const today = todayStr();
    const { error } = await supabase
      .from('body_fat_logs')
      .upsert({ user_id: user.id, date: today, body_fat_pct: v }, { onConflict: 'user_id,date' });

    setSavingBodyFat(false);
    if (error) {
      Alert.alert('Save failed', error.message);
    } else {
      Alert.alert('Body fat logged!', `${v}% recorded for today.`);
      setBodyFatInput('');
      loadProgress(volumeRange, mileageRange);
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
            placeholder={`Today's weight (${weightLabel})`}
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
            <WeightLineChart data={weightData} unitLabel={weightLabel} />
            {weightHistory.length > 0 && (
              <View style={styles.weightHistoryList}>
                {weightHistory.map((entry) => (
                  <View key={entry.id} style={styles.weightHistoryRow}>
                    <Text style={styles.weightHistoryDate}>
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.weightHistoryValue}>
                      {entry.weight} {weightLabel}
                    </Text>
                    <TouchableOpacity
                      style={styles.weightDeleteBtn}
                      onPress={() => deleteWeight(entry.id, new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}
                    >
                      <Text style={styles.weightDeleteText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.weightEmptyText}>No weight logs yet. Log today's weight above.</Text>
        )}
      </Card>

      {/* ── PROGRESS PHOTOS ── */}
      <ProgressPhotosSection userId={userId} />

      {/* Body Fat % */}
      <Text style={styles.sectionLabel}>BODY FAT %</Text>
      <Card style={styles.weightCard}>
        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            value={bodyFatInput}
            onChangeText={setBodyFatInput}
            placeholder="Today's body fat % (e.g. 15.5)"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
          />
          <GoldButton
            title="SAVE"
            onPress={saveBodyFat}
            loading={savingBodyFat}
            style={styles.weightSaveBtn}
          />
        </View>

        {bodyFatData.length > 0 ? (
          <>
            <Text style={styles.weightChartLabel}>LAST 30 DAYS</Text>
            <WeightLineChart data={bodyFatData} unitLabel="%" />
            {bodyFatHistory.length > 0 && (
              <View style={styles.weightHistoryList}>
                {bodyFatHistory.map((entry) => (
                  <View key={entry.id} style={styles.weightHistoryRow}>
                    <Text style={styles.weightHistoryDate}>
                      {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={styles.weightHistoryValue}>{entry.body_fat_pct}%</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.weightEmptyText}>No body fat logs yet. Log today's % above.</Text>
        )}
      </Card>

      {/* Weekly Volume */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>VOLUME ({weightLabel.toUpperCase()})</Text>
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
          <View style={styles.sectionRow}>
            <Text style={styles.sectionLabel}>MILEAGE</Text>
            <View style={styles.rangeToggle}>
              {RANGE_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r.label}
                  style={[styles.rangeBtn, mileageRange === r.days && styles.rangeBtnActive]}
                  onPress={() => setMileageRange(r.days)}
                >
                  <Text style={[styles.rangeBtnText, mileageRange === r.days && styles.rangeBtnTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
          <FrequencyHeatmap workoutDays={heatmapWorkoutDays} runDays={heatmapRunDays} />
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
            <Text style={styles.emptyText}>No PRs yet. Log workouts with weight to track them.</Text>
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
                  <Text style={styles.runRecordValue}>{Number(runRecords.longestRun.distance).toFixed(2)} mi</Text>
                </View>
              </View>
            )}
            {runRecords.longestRun && (runRecords.bestPaceRun || runRecords.mostElevationRun) && <View style={styles.divider} />}
            {runRecords.bestPaceRun && (
              <View style={styles.runRecordRow}>
                <Text style={styles.runRecordEmoji}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runRecordLabel}>BEST PACE</Text>
                  <Text style={styles.runRecordValue}>{formatPace(runRecords.bestPaceRun.pace_per_mile_seconds)}</Text>
                </View>
              </View>
            )}
            {runRecords.bestPaceRun && runRecords.mostElevationRun && <View style={styles.divider} />}
            {runRecords.mostElevationRun && (
              <View style={styles.runRecordRow}>
                <Text style={styles.runRecordEmoji}>⛰️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.runRecordLabel}>MOST ELEVATION</Text>
                  <Text style={styles.runRecordValue}>{runRecords.mostElevationRun.elevation_ft} ft</Text>
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
          <Text style={styles.streakValue}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak 🔥</Text>
        </Card>
        <Card style={[styles.streakCard, { borderColor: colors.blue }]}>
          <Text style={[styles.streakValue, { color: colors.blue }]}>{prs.length}</Text>
          <Text style={styles.streakLabel}>Tracked PRs</Text>
        </Card>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginBottom: 10, marginTop: 8,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 8, marginBottom: 10,
  },
  rangeToggle: { flexDirection: 'row', gap: 4 },
  rangeBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  rangeBtnActive: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  rangeBtnText: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  rangeBtnTextActive: { color: colors.gold },
  weightCard: { marginBottom: 20, padding: 16 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  weightInput: {
    flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15,
  },
  weightSaveBtn: { paddingHorizontal: 20, paddingVertical: 12, minWidth: 80 },
  weightChartLabel: {
    fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8,
  },
  weightEmptyText: { color: colors.muted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  weightMinMax: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 8,
  },
  weightMinMaxText: { fontSize: 11, color: colors.muted },
  weightHistoryList: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  weightHistoryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border + '55',
  },
  weightHistoryDate: { flex: 1, fontSize: 12, color: colors.muted },
  weightHistoryValue: { fontSize: 13, fontWeight: '600', color: colors.text, marginRight: 12 },
  weightDeleteBtn: { padding: 4, marginLeft: 4 },
  weightDeleteText: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  chartAxisLabel: { fontSize: 9, color: colors.muted },
  chartCard: { marginBottom: 24, paddingVertical: 20 },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 16,
  },
  barWrapper: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  bar: { borderRadius: 4, marginBottom: 4 },
  barValue: { fontSize: 9, color: colors.muted, marginBottom: 2 },
  barLabel: { fontSize: 12, color: colors.muted, marginTop: 4 },
  loadingText: { color: colors.muted, textAlign: 'center', padding: 20 },
  emptyState: { alignItems: 'center', padding: 24 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  prRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  prName: { fontSize: 14, fontWeight: '600', color: colors.text },
  prDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  prWeight: { fontSize: 16, fontWeight: '700', color: colors.gold },
  prSetsReps: { fontSize: 11, color: colors.muted, marginTop: 2 },
  strengthBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  strengthBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: colors.border },
  heatmapCard: { marginBottom: 24, padding: 12 },
  heatmapLegend: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 10, color: colors.muted },
  heatmapDowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  heatmapWeekLabel: { width: 44, fontSize: 8, color: colors.muted, textAlign: 'right', paddingRight: 4 },
  heatmapDow: { fontSize: 8, color: colors.muted, textAlign: 'center', marginHorizontal: 1 },
  heatmapRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  heatmapCell: { borderRadius: 2, marginHorizontal: 1 },
  runRecordsCard: { marginBottom: 24 },
  runRecordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  runRecordEmoji: { fontSize: 24, width: 36, textAlign: 'center' },
  runRecordLabel: { fontSize: 9, fontWeight: '700', color: colors.muted, letterSpacing: 1.5, marginBottom: 2 },
  runRecordValue: { fontSize: 18, fontWeight: '700', color: colors.blue },
  streakRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  streakCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  streakValue: { fontSize: 32, fontWeight: '800', color: colors.gold, marginBottom: 4 },
  streakLabel: { fontSize: 11, color: colors.muted, letterSpacing: 1, textAlign: 'center' },

  // ── Progress Photos ──────────────────────────────────────────────────────────
  photoSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, marginBottom: 10,
  },
  photoHeaderActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  compareBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: colors.blue,
  },
  compareBtnText: { color: colors.blue, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  addPhotoBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    borderWidth: 1, borderColor: colors.gold, minWidth: 56, alignItems: 'center',
  },
  addPhotoBtnText: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  photoEmptyCard: { alignItems: 'center', padding: 28, marginBottom: 20 },
  photoEmptyEmoji: { fontSize: 36, marginBottom: 10 },
  photoEmptyText: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  photoEmptySubtext: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  addPhotoLargeBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.1)',
  },
  addPhotoLargeBtnText: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20,
  },
  photoCard: {
    width: PHOTO_THUMB,
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
  },
  photoThumb: {
    width: PHOTO_THUMB,
    height: PHOTO_THUMB * (4 / 3),
    borderRadius: 10,
  },
  photoLabelBadge: {
    position: 'absolute', top: 8, left: 8,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  photoLabelText: { fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 1 },
  photoDate: {
    fontSize: 10, color: colors.muted, marginTop: 5, textAlign: 'center', fontWeight: '600',
  },
  photoDeleteBtn: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  photoDeleteText: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 16 },

  // Fullscreen viewer
  viewerOverlay: {
    flex: 1, backgroundColor: '#000', justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute', top: 50, right: 20, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  viewerCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewerImage: { width: '100%', height: '80%' },
  viewerMeta: { padding: 20 },
  viewerDate: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  viewerLabel: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  viewerNotes: { color: colors.muted, fontSize: 13, marginTop: 6 },

  // Compare modal
  compareOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end',
  },
  compareModal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  compareTitle: {
    fontSize: 12, fontWeight: '800', color: colors.gold, letterSpacing: 2,
    marginBottom: 16, textAlign: 'center',
  },
  comparePair: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  compareItem: { flex: 1, alignItems: 'center' },
  comparePhoto: { width: '100%', height: 180, borderRadius: 10 },
  compareItemLabel: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 6 },
  compareItemSub: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  compareDivider: {
    width: 28, alignItems: 'center', justifyContent: 'center',
  },
  compareDividerText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  compareSelectLabel: {
    fontSize: 9, color: colors.muted, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 4,
  },
  compareSelector: { marginBottom: 8 },
  compareSelectorThumb: {
    width: 50, height: 66, borderRadius: 6, marginRight: 6,
    borderWidth: 2, borderColor: 'transparent',
  },
  compareSelectorThumbActive: { borderColor: colors.gold },
  compareCloseBtn: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  compareCloseBtnText: { color: colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
});
