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

function humanizeAuthError(error) {
  if (!error) return 'Something went wrong. Try again.';
  const msg = error.message || '';
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Wrong email or password. Try again.';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Check your email to confirm your account first.';
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('Network') ||
    msg.includes('Failed to fetch')
  ) {
    return "Can't connect. Check your internet.";
  }
  return 'Something went wrong. Try again.';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Inline validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState('');

  const handleLogin = async () => {
    setAuthError('');
    let valid = true;
    if (!EMAIL_REGEX.test(email.trim())) { setEmailError('Enter a valid email address.'); valid = false; }
    else setEmailError('');
    if (!password || password.length < 6) { setPasswordError('Password must be at least 6 characters.'); valid = false; }
    else setPasswordError('');
    if (!valid) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setAuthError(humanizeAuthError(error));
    } else {
      navigation.replace('Main');
    }
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
          <Text style={styles.atomIcon}>⚛</Text>
          <Text style={styles.title}>AT0M FIT</Text>
          <Text style={styles.subtitle}>Welcome back, operator.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}

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
              onChangeText={(v) => { setPassword(v); if (v.length >= 6) setPasswordError(''); }}
              placeholder="••••••••"
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

          <GoldButton
            title="SIGN IN"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('SignUp')}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              No account?{' '}
              <Text style={styles.link}>Create one →</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  atomIcon: {
    fontSize: 48,
    color: colors.gold,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 1,
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
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
  button: {
    marginTop: 28,
  },
  forgotRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotText: {
    color: colors.muted,
    fontSize: 13,
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
  inputError: {
    borderColor: '#ff4444',
  },
  fieldError: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  authError: {
    color: '#ff4444',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});
