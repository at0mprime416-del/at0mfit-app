import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import FilteredImage from '../components/FilteredImage';
import PhotoFilterModal from '../components/PhotoFilterModal';

const GOAL_LABELS = {
  strength: '💪 Build Strength',
  muscle: '🏋️ Gain Muscle',
  fat_loss: '🔥 Lose Fat',
  endurance: '🏃 Improve Endurance',
  performance: '⚡ Athletic Performance',
};

const GOALS = Object.entries(GOAL_LABELS).map(([key, label]) => ({ key, label }));

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalExercises: 0 });

  // Goal editing modal
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [pendingGoal, setPendingGoal] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  // Physical metrics
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricWeight, setMetricWeight] = useState('');
  const [metricHeightFt, setMetricHeightFt] = useState('');
  const [metricHeightIn, setMetricHeightIn] = useState('');
  const [metricAge, setMetricAge] = useState('');
  const [metricWakeTime, setMetricWakeTime] = useState('06:00');
  const [metricSleepTime, setMetricSleepTime] = useState('22:00');
  const [metricFitnessLevel, setMetricFitnessLevel] = useState('beginner');
  const [metricBodyFat, setMetricBodyFat] = useState('');
  const [savingMetrics, setSavingMetrics] = useState(false);

  // ToS modal
  const [tosModalVisible, setTosModalVisible] = useState(false);

  // Units toggle
  const [units, setUnits] = useState('lbs');
  const [savingUnits, setSavingUnits] = useState(false);

  // Avatar photo
  const [pendingPhotoUri, setPendingPhotoUri] = useState(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile({ ...prof, email: user.email });
    setName(prof?.full_name || '');
    setUnits(prof?.preferred_units || 'lbs');

    // Pre-fill physical metrics
    if (prof?.weight_lbs) setMetricWeight(String(prof.weight_lbs));
    if (prof?.height_inches) {
      setMetricHeightFt(String(Math.floor(prof.height_inches / 12)));
      setMetricHeightIn(String(prof.height_inches % 12));
    }
    if (prof?.age) setMetricAge(String(prof.age));
    if (prof?.wake_time) setMetricWakeTime(prof.wake_time);
    if (prof?.sleep_time) setMetricSleepTime(prof.sleep_time);
    if (prof?.fitness_level) setMetricFitnessLevel(prof.fitness_level);
    if (prof?.body_fat_pct) setMetricBodyFat(String(prof.body_fat_pct));

    // Total stats
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, exercises(id)')
      .eq('user_id', user.id);

    if (workouts) {
      const totalEx = workouts.reduce(
        (s, w) => s + (w.exercises?.length || 0),
        0
      );
      setStats({ totalWorkouts: workouts.length, totalExercises: totalEx });
    }
  };

  // ─── Avatar photo pick ───────────────────────────────────────────────────────

  const openAvatarPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Take Photo', 'Choose from Library', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (idx) => {
          if (idx === 0) launchCamera();
          else if (idx === 1) launchLibrary();
        }
      );
    } else {
      Alert.alert('Profile Photo', 'Choose source', [
        { text: 'Take Photo', onPress: launchCamera },
        { text: 'Choose from Library', onPress: launchLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const launchCamera = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Camera access required', 'Please enable camera access in settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingPhotoUri(result.assets[0].uri);
      setFilterModalVisible(true);
    }
  };

  const launchLibrary = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Library access required', 'Please enable photo library access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingPhotoUri(result.assets[0].uri);
      setFilterModalVisible(true);
    }
  };

  const handleFilterSave = async (filterName /*, label unused for profile */) => {
    setFilterModalVisible(false);
    if (!pendingPhotoUri) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `${user.id}/avatar.jpg`;
      const response = await fetch(pendingPhotoUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache bust

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl, avatar_filter: filterName })
        .eq('id', user.id);

      setProfile((p) => ({ ...p, avatar_url: avatarUrl, avatar_filter: filterName }));
    } catch (err) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploadingAvatar(false);
      setPendingPhotoUri(null);
    }
  };

  const handleFilterCancel = () => {
    setFilterModalVisible(false);
    setPendingPhotoUri(null);
  };

  // ─── Other profile actions ────────────────────────────────────────────────────

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('profiles')
      .update({ full_name: name.trim() })
      .eq('id', user.id);
    setProfile((p) => ({ ...p, full_name: name.trim() }));
    setSaving(false);
    setEditing(false);
  };

  const saveGoal = async () => {
    if (!pendingGoal) return;
    setSavingGoal(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('profiles')
      .update({ goal: pendingGoal })
      .eq('id', user.id);
    setProfile((p) => ({ ...p, goal: pendingGoal }));
    setSavingGoal(false);
    setGoalModalVisible(false);
  };

  const saveMetrics = async () => {
    setSavingMetrics(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ft = parseInt(metricHeightFt) || 0;
    const inches = parseInt(metricHeightIn) || 0;
    const totalInches = ft * 12 + inches;

    await supabase
      .from('profiles')
      .update({
        weight_lbs: parseFloat(metricWeight) || null,
        height_inches: totalInches > 0 ? totalInches : null,
        age: parseInt(metricAge) || null,
        wake_time: metricWakeTime || '06:00',
        sleep_time: metricSleepTime || '22:00',
        fitness_level: metricFitnessLevel || 'beginner',
        body_fat_pct: parseFloat(metricBodyFat) || null,
      })
      .eq('id', user.id);

    // Also log body fat to body_fat_logs if provided
    const bfValue = parseFloat(metricBodyFat);
    if (bfValue > 0) {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('body_fat_logs')
        .upsert(
          { user_id: user.id, date: today, body_fat_pct: bfValue },
          { onConflict: 'user_id,date' }
        );
    }

    setSavingMetrics(false);
    setShowMetrics(false);
    Alert.alert('Saved!', 'Physical metrics updated.');
  };

  const toggleUnits = async () => {
    const newUnits = units === 'lbs' ? 'kg' : 'lbs';
    setSavingUnits(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('profiles')
      .update({ preferred_units: newUnits })
      .eq('id', user.id);
    setUnits(newUnits);
    setProfile((p) => ({ ...p, preferred_units: newUnits }));
    setSavingUnits(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This deletes ALL your data permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Warning',
              'This cannot be undone. Delete everything?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'DELETE EVERYTHING',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await supabase.rpc('delete_user');
                    } catch (e) {
                      // If RPC fails, just sign out
                    }
                    await supabase.auth.signOut();
                    navigation.replace('Login');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const heightDisplay = () => {
    if (!profile?.height_inches) return '—';
    const ft = Math.floor(profile.height_inches / 12);
    const inches = profile.height_inches % 12;
    return `${ft}'${inches}"`;
  };

  // ─── Avatar render ────────────────────────────────────────────────────────────

  const renderAvatar = () => {
    if (uploadingAvatar) {
      return (
        <View style={styles.avatar}>
          <ActivityIndicator color={colors.background} />
        </View>
      );
    }

    if (profile?.avatar_url) {
      return (
        <TouchableOpacity onPress={openAvatarPicker} activeOpacity={0.85}>
          <FilteredImage
            uri={profile.avatar_url}
            filterName={profile.avatar_filter || 'original'}
            style={styles.avatar}
            imageStyle={{ borderRadius: 40 }}
          />
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>✏️</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={openAvatarPicker} activeOpacity={0.85}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.full_name || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.avatarEditBadge}>
          <Text style={styles.avatarEditBadgeText}>📷</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Filter Modal */}
      <PhotoFilterModal
        visible={filterModalVisible}
        uri={pendingPhotoUri}
        context="profile"
        onSave={handleFilterSave}
        onCancel={handleFilterCancel}
      />

      {/* Avatar / Name block */}
      <View style={styles.avatarSection}>
        {renderAvatar()}

        {/* Subscription tier badge */}
        <View style={[
          styles.tierBadge,
          profile?.subscription_tier === 'pro' ? styles.tierBadgePro : styles.tierBadgeFree,
        ]}>
          <Text style={[
            styles.tierBadgeText,
            profile?.subscription_tier === 'pro' ? styles.tierBadgeTextPro : styles.tierBadgeTextFree,
          ]}>
            {profile?.subscription_tier === 'pro' ? 'PRO' : 'FREE'}
          </Text>
        </View>

        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              autoFocus
              placeholder="Your name"
              placeholderTextColor={colors.muted}
            />
            <GoldButton
              title="Save"
              onPress={saveName}
              loading={saving}
              style={styles.saveNameBtn}
            />
          </View>
        ) : (
          <Text
            style={styles.profileName}
            onPress={() => setEditing(true)}
          >
            {profile?.full_name || 'Unnamed Operator'}{' '}
            <Text style={styles.editHint}>✏️</Text>
          </Text>
        )}
        <Text style={styles.profileEmail}>{profile?.email}</Text>
      </View>

      {/* Goal */}
      <View style={styles.sectionRowHeader}>
        <Text style={styles.sectionLabel}>CURRENT GOAL</Text>
        <TouchableOpacity
          style={styles.editGoalBtn}
          onPress={() => {
            setPendingGoal(profile?.goal || '');
            setGoalModalVisible(true);
          }}
        >
          <Text style={styles.editGoalBtnText}>Edit Goal</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.goalCard}>
        <Text style={styles.goalText}>
          {GOAL_LABELS[profile?.goal] || '— Not set'}
        </Text>
      </Card>

      {/* Physical Metrics */}
      <View style={styles.sectionRowHeader}>
        <Text style={styles.sectionLabel}>PHYSICAL METRICS</Text>
        <TouchableOpacity
          style={styles.editGoalBtn}
          onPress={() => setShowMetrics((v) => !v)}
        >
          <Text style={styles.editGoalBtnText}>{showMetrics ? 'Done' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>
      <Card style={styles.metricsCard}>
        {showMetrics ? (
          <View>
            <Text style={styles.metricLabel}>WEIGHT (lbs)</Text>
            <TextInput
              style={styles.metricInput}
              value={metricWeight}
              onChangeText={setMetricWeight}
              placeholder="185"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.metricLabel}>HEIGHT</Text>
            <View style={styles.heightRow}>
              <TextInput
                style={[styles.metricInput, { flex: 1 }]}
                value={metricHeightFt}
                onChangeText={setMetricHeightFt}
                placeholder="5"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
              <Text style={styles.heightUnit}>ft</Text>
              <TextInput
                style={[styles.metricInput, { flex: 1 }]}
                value={metricHeightIn}
                onChangeText={setMetricHeightIn}
                placeholder="11"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
              <Text style={styles.heightUnit}>in</Text>
            </View>
            <Text style={styles.metricLabel}>AGE</Text>
            <TextInput
              style={styles.metricInput}
              value={metricAge}
              onChangeText={setMetricAge}
              placeholder="30"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <Text style={styles.metricLabel}>WAKE TIME (HH:MM)</Text>
            <TextInput
              style={styles.metricInput}
              value={metricWakeTime}
              onChangeText={setMetricWakeTime}
              placeholder="06:00"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.metricLabel}>SLEEP TIME (HH:MM)</Text>
            <TextInput
              style={styles.metricInput}
              value={metricSleepTime}
              onChangeText={setMetricSleepTime}
              placeholder="22:00"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={styles.metricLabel}>FITNESS LEVEL</Text>
            <View style={styles.fitnessLevelRow}>
              {['beginner','intermediate','advanced','elite'].map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.fitnessChip, metricFitnessLevel === lvl && styles.fitnessChipActive]}
                  onPress={() => setMetricFitnessLevel(lvl)}
                >
                  <Text style={[styles.fitnessChipText, metricFitnessLevel === lvl && styles.fitnessChipTextActive]}>
                    {lvl.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.metricLabel}>BODY FAT % (optional)</Text>
            <TextInput
              style={styles.metricInput}
              value={metricBodyFat}
              onChangeText={setMetricBodyFat}
              placeholder="15.0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
            <GoldButton
              title="SAVE METRICS"
              onPress={saveMetrics}
              loading={savingMetrics}
              style={{ marginTop: 14 }}
            />
          </View>
        ) : (
          <View>
            <View style={styles.metricsDisplay}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {profile?.weight_lbs ? `${profile.weight_lbs} lbs` : '—'}
                </Text>
                <Text style={styles.metricItemLabel}>WEIGHT</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{heightDisplay()}</Text>
                <Text style={styles.metricItemLabel}>HEIGHT</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {profile?.age || '—'}
                </Text>
                <Text style={styles.metricItemLabel}>AGE</Text>
              </View>
            </View>
            <View style={styles.metricsDisplay}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {profile?.wake_time || '06:00'}
                </Text>
                <Text style={styles.metricItemLabel}>WAKE</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {profile?.sleep_time || '22:00'}
                </Text>
                <Text style={styles.metricItemLabel}>SLEEP</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>
                  {profile?.body_fat_pct ? `${profile.body_fat_pct}%` : '—'}
                </Text>
                <Text style={styles.metricItemLabel}>BODY FAT</Text>
              </View>
            </View>
            <View style={styles.metricsDisplay}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { fontSize: 13 }]}>
                  {profile?.fitness_level ? profile.fitness_level.toUpperCase() : '—'}
                </Text>
                <Text style={styles.metricItemLabel}>LEVEL</Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Stats */}
      <Text style={styles.sectionLabel}>LIFETIME STATS</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.green }]}>
            {stats.totalExercises}
          </Text>
          <Text style={styles.statLabel}>Total Exercises</Text>
        </Card>
      </View>

      {/* Settings */}
      <Text style={styles.sectionLabel}>SETTINGS</Text>
      <Card>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Theme</Text>
          <Text style={styles.settingValue}>Dark ⚫</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Units</Text>
          <TouchableOpacity
            style={styles.unitsToggle}
            onPress={toggleUnits}
            disabled={savingUnits}
          >
            <Text style={[
              styles.unitsOption,
              units === 'lbs' && styles.unitsOptionActive,
            ]}>lbs</Text>
            <Text style={styles.unitsSep}>/</Text>
            <Text style={[
              styles.unitsOption,
              units === 'kg' && styles.unitsOptionActive,
            ]}>kg</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>App Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </Card>

      {/* Sign out */}
      <GoldButton
        title="SIGN OUT"
        variant="outline"
        onPress={handleSignOut}
        style={styles.signOutBtn}
      />

      {/* Danger Zone */}
      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>DELETE ACCOUNT</Text>
        </TouchableOpacity>
        <Text style={styles.dangerCaption}>Permanently deletes all your data</Text>
      </View>

      {/* Goal edit modal */}
      <Modal
        visible={goalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>EDIT GOAL</Text>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalChip, pendingGoal === g.key && styles.goalChipSelected]}
                onPress={() => setPendingGoal(g.key)}
              >
                <Text style={[styles.goalChipText, pendingGoal === g.key && styles.goalChipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setGoalModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <GoldButton
                title="SAVE"
                onPress={saveGoal}
                loading={savingGoal}
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
    padding: 20,
    paddingBottom: 48,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.background,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: -2,
    backgroundColor: colors.surface,
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditBadgeText: {
    fontSize: 11,
  },
  tierBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: 10,
  },
  tierBadgePro: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderColor: colors.gold,
  },
  tierBadgeFree: {
    backgroundColor: 'rgba(136,136,136,0.12)',
    borderColor: colors.muted,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tierBadgeTextPro: {
    color: colors.gold,
  },
  tierBadgeTextFree: {
    color: colors.muted,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  editHint: {
    fontSize: 14,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  saveNameBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  profileEmail: {
    color: colors.muted,
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  editGoalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  editGoalBtnText: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '600',
  },
  goalCard: {
    marginBottom: 20,
  },
  goalText: {
    fontSize: 15,
    color: colors.text,
  },
  metricsCard: {
    marginBottom: 20,
  },
  metricsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  metricItemLabel: {
    fontSize: 9,
    color: colors.muted,
    letterSpacing: 1,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 12,
  },
  metricInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heightUnit: {
    color: colors.muted,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
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
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: colors.text,
  },
  settingValue: {
    fontSize: 14,
    color: colors.muted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  unitsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  unitsOption: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  unitsOptionActive: {
    color: colors.gold,
  },
  unitsSep: {
    color: colors.border,
    fontSize: 13,
  },
  signOutBtn: {
    marginTop: 28,
  },
  dangerZone: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteAccountBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff4444',
    marginBottom: 6,
  },
  deleteAccountText: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  dangerCaption: {
    color: colors.muted,
    fontSize: 11,
  },
  fitnessLevelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  fitnessChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
  },
  fitnessChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  fitnessChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fitnessChipTextActive: {
    color: colors.gold,
  },
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
  goalChip: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  goalChipSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  goalChipText: {
    color: colors.muted,
    fontSize: 14,
  },
  goalChipTextSelected: {
    color: colors.gold,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
