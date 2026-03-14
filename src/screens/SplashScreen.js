import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';

export default function SplashScreen({ navigation }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Show spinner after 1.5s if auth hasn't resolved
    const spinnerTimer = setTimeout(() => setShowSpinner(true), 1500);

    // Check auth and route
    const checkAuth = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      const {
        data: { session },
      } = await supabase.auth.getSession();

      clearTimeout(spinnerTimer);
      setShowSpinner(false);

      if (session) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    };

    checkAuth();

    return () => clearTimeout(spinnerTimer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        {/* Atom symbol made with text */}
        <View style={styles.atomWrapper}>
          <Text style={styles.atomSymbol}>⚛</Text>
          <View style={styles.atomRing} />
        </View>
        <Text style={styles.appName}>AT0M FIT</Text>
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Train like an element. Perform at scale.
      </Animated.Text>

      {showSpinner && (
        <ActivityIndicator
          size="small"
          color={colors.gold}
          style={styles.spinner}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  atomWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  atomSymbol: {
    fontSize: 72,
    color: colors.gold,
  },
  atomRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.gold,
    opacity: 0.3,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.muted,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  spinner: {
    marginTop: 32,
  },
});
