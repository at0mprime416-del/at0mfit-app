import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation';
import { ProfileProvider } from './src/context/ProfileContext';
import { registerForPushNotifications, scheduleStreakReminder } from './src/lib/notifications';

export default function App() {
  useEffect(() => {
    // Register for push notifications on mount
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log('Push token:', token);
        // Could store token to Supabase here for server-side push
      }
    });
    // Schedule daily streak reminder
    scheduleStreakReminder();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <ProfileProvider>
        <RootNavigator />
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
