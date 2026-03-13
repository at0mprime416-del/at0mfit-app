import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';

const GOALS = [
  { key: 'strength', label: '💪 Build Strength' },
  { key: 'muscle', label: '🏋️ Gain Muscle' },
  { key: 'fat_loss', label: '🔥 Lose Fat' },
  { key: 'endurance', label: '🏃 Improve Endurance' },
  { key: 'performance', label: '⚡ Athletic Performance' },
];

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !goal) {
      Alert.alert('Missing fields', 'Fill out all fields and pick a goal.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Sign up failed', error.message);
      return;
    }

    // Create profile
    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        name: name.trim(),
        goal,
      });
    }

    setLoading(false);
    Alert.alert(
      'Account created! 🎯',
      'Check your email to confirm, then sign in.',
      [{ text: 'OK', onPress: () => navigation.replace('Login') }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join AT0M FIT</Text>
          <Text style={styles.subtitle}>Start your mission.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Levi"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
          />

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min 6 characters"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>PRIMARY GOAL</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[
                  styles.goalChip,
                  goal === g.key && styles.goalChipSelected,
                ]}
                onPress={() => setGoal(g.key)}
              >
                <Text
                  style={[
                    styles.goalChipText,
                    goal === g.key && styles.goalChipTextSelected,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <GoldButton
            title="CREATE ACCOUNT"
            onPress={handleSignUp}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.link}>Sign in →</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
  },
  goalGrid: {
    gap: 8,
  },
  goalChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  button: {
    marginTop: 28,
  },
  linkRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: colors.muted,
    fontSize: 14,
  },
  link: {
    color: colors.gold,
    fontWeight: '600',
  },
});
