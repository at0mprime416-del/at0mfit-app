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
  Modal,
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tosModalVisible, setTosModalVisible] = useState(false);

  // Show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inline field errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [goalError, setGoalError] = useState('');

  const validate = () => {
    let valid = true;
    setNameError(''); setEmailError(''); setPasswordError(''); setConfirmError(''); setGoalError('');
    if (!name.trim()) { setNameError('Name is required.'); valid = false; }
    if (!EMAIL_REGEX.test(email.trim())) { setEmailError('Enter a valid email address.'); valid = false; }
    if (password.length < 6) { setPasswordError('Password must be at least 6 characters.'); valid = false; }
    if (password !== confirmPassword) { setConfirmError('Passwords do not match.'); valid = false; }
    if (!goal) { setGoalError('Pick a primary goal.'); valid = false; }
    if (!tosAccepted) { Alert.alert('Terms of Service', 'You must accept the Terms of Service to continue.'); valid = false; }
    return valid;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

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

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: name.trim(),
        goal,
      });
    }

    setLoading(false);

    if (data.session) {
      navigation.replace('Main');
    } else {
      Alert.alert(
        'Account created! 🎯',
        'Check your email to confirm, then sign in.',
        [{ text: 'OK', onPress: () => navigation.replace('Login') }]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Join AT0M FIT</Text>
          <Text style={styles.subtitle}>Start your mission.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            value={name}
            onChangeText={(v) => { setName(v); if (v.trim()) setNameError(''); }}
            placeholder="Levi"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
          />
          {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            value={email}
            onChangeText={(v) => { setEmail(v); if (EMAIL_REGEX.test(v.trim())) setEmailError(''); }}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (v.length >= 6) setPasswordError('');
                if (confirmPassword && v !== confirmPassword) setConfirmError('Passwords do not match.');
                else if (confirmPassword) setConfirmError('');
              }}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput, confirmError ? styles.inputError : null]}
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (v === password) setConfirmError('');
                else if (v) setConfirmError('Passwords do not match.');
              }}
              placeholder="Re-enter password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {confirmError ? <Text style={styles.fieldError}>{confirmError}</Text> : null}

          <Text style={styles.label}>PRIMARY GOAL</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalChip, goal === g.key && styles.goalChipSelected]}
                onPress={() => { setGoal(g.key); setGoalError(''); }}
              >
                <Text style={[styles.goalChipText, goal === g.key && styles.goalChipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {goalError ? <Text style={styles.fieldError}>{goalError}</Text> : null}

          {/* ToS checkbox */}
          <TouchableOpacity
            style={styles.tosRow}
            onPress={() => setTosAccepted((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, tosAccepted && styles.checkboxChecked]}>
              {tosAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.tosText}>
              I accept the{' '}
              <Text
                style={styles.tosLink}
                onPress={(e) => { e.stopPropagation?.(); setTosModalVisible(true); }}
              >
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

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

      {/* ToS Modal */}
      <Modal visible={tosModalVisible} transparent animationType="fade" onRequestClose={() => setTosModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>TERMS OF SERVICE</Text>
            <Text style={styles.modalBody}>
              By using At0m Fit, you agree to train responsibly, consult a physician before starting any fitness program, and understand that At0m Fit is not liable for any injuries.{'\n\n'}
              You are solely responsible for the intensity and duration of your training. Use at your own risk.{'\n\n'}
              We collect only the data you provide to deliver our services. We do not sell your data.{'\n\n'}
              By creating an account, you agree to these terms.
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setTosModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 48 },
  header: { marginBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 2, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted },
  form: { gap: 4 },
  label: {
    fontSize: 11, fontWeight: '700', color: colors.gold,
    letterSpacing: 2, marginBottom: 6, marginTop: 16,
  },
  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: colors.text, fontSize: 15,
  },
  inputError: { borderColor: '#ff4444' },
  fieldError: { color: '#ff4444', fontSize: 12, marginTop: 4 },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  eyeIcon: { fontSize: 18 },
  goalGrid: { gap: 8 },
  goalChip: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
  },
  goalChipSelected: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.12)' },
  goalChipText: { color: colors.muted, fontSize: 14 },
  goalChipTextSelected: { color: colors.gold, fontWeight: '600' },
  tosRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 5, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  checkboxChecked: { borderColor: colors.gold, backgroundColor: 'rgba(201,168,76,0.15)' },
  checkmark: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  tosText: { color: colors.muted, fontSize: 13, flex: 1 },
  tosLink: { color: colors.gold, fontWeight: '600' },
  button: { marginTop: 28 },
  linkRow: { alignItems: 'center', marginTop: 20 },
  linkText: { color: colors.muted, fontSize: 14 },
  link: { color: colors.gold, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: colors.border, width: '100%',
  },
  modalTitle: { fontSize: 13, fontWeight: '700', color: colors.gold, letterSpacing: 2, marginBottom: 16 },
  modalBody: { fontSize: 14, color: colors.text, lineHeight: 22, marginBottom: 20 },
  closeBtn: {
    borderWidth: 1, borderColor: colors.gold, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  closeBtnText: { color: colors.gold, fontSize: 14, fontWeight: '600' },
});
