import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { colors } from '../theme/colors';
import Card from '../components/Card';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const GOAL_LABELS = {
  strength: '💪 Build Strength',
  muscle: '🏋️ Gain Muscle',
  fat_loss: '🔥 Lose Fat',
  endurance: '🏃 Improve Endurance',
  performance: '⚡ Athletic Performance',
};

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalExercises: 0 });

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
    setName(prof?.name || '');

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

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', user.id);
    setProfile((p) => ({ ...p, name: name.trim() }));
    setSaving(false);
    setEditing(false);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Avatar / Name block */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || 'A').charAt(0).toUpperCase()}
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
            {profile?.name || 'Unnamed Operator'}{' '}
            <Text style={styles.editHint}>✏️</Text>
          </Text>
        )}
        <Text style={styles.profileEmail}>{profile?.email}</Text>
      </View>

      {/* Goal */}
      <Text style={styles.sectionLabel}>CURRENT GOAL</Text>
      <Card style={styles.goalCard}>
        <Text style={styles.goalText}>
          {GOAL_LABELS[profile?.goal] || '— Not set'}
        </Text>
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
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor={colors.background}
            disabled
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Units</Text>
          <Text style={styles.settingValue}>lbs</Text>
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
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.background,
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
  goalCard: {
    marginBottom: 20,
  },
  goalText: {
    fontSize: 15,
    color: colors.text,
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
  signOutBtn: {
    marginTop: 28,
  },
});
