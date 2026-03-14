import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { colors } from '../theme/colors';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import RunScreen from '../screens/RunScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NutritionScreen from '../screens/NutritionScreen';
import CompeteScreen from '../screens/CompeteScreen';
import AIWorkoutScreen from '../screens/AIWorkoutScreen';
import LiveRunScreen from '../screens/LiveRunScreen';
import GymScreen from '../screens/GymScreen';
import EventsScreen from '../screens/EventsScreen';
import FormCheckScreen from '../screens/FormCheckScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Shared screen options ────────────────────────────────────────────────────

const screenOptions = {
  headerStyle: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: colors.text,
  headerTitleStyle: {
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.text,
  },
  cardStyle: { backgroundColor: colors.background },
};

function TabIcon({ emoji, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
    </View>
  );
}

// ─── Nested: Train (Workout · Run · AI · Progress) ────────────────────────────

const TrainStack = createStackNavigator();
function TrainNavigator() {
  return (
    <TrainStack.Navigator screenOptions={screenOptions}>
      <TrainStack.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{ title: 'LOG WORKOUT' }}
      />
      <TrainStack.Screen
        name="Run"
        component={RunScreen}
        options={{ title: 'RUN LOG' }}
      />
      <TrainStack.Screen
        name="AIWorkout"
        component={AIWorkoutScreen}
        options={{ title: '⚛ AI COACH' }}
      />
      <TrainStack.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: 'PROGRESS' }}
      />
    </TrainStack.Navigator>
  );
}

// ─── Nested: Compete (Leaderboard · Events) ───────────────────────────────────

const CompeteStack = createStackNavigator();
function CompeteNavigator() {
  return (
    <CompeteStack.Navigator screenOptions={screenOptions}>
      <CompeteStack.Screen
        name="Leaderboard"
        component={CompeteScreen}
        options={{ title: 'COMPETE' }}
      />
      <CompeteStack.Screen
        name="Events"
        component={EventsScreen}
        options={{ title: 'EVENTS' }}
      />
    </CompeteStack.Navigator>
  );
}

// ─── Nested: Community (Gym · Calendar · Nutrition) ──────────────────────────

const CommunityStack = createStackNavigator();
function CommunityNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={screenOptions}>
      <CommunityStack.Screen
        name="Gym"
        component={GymScreen}
        options={{ title: 'GYM' }}
      />
      <CommunityStack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'CALENDAR' }}
      />
      <CommunityStack.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{ title: 'NUTRITION' }}
      />
    </CommunityStack.Navigator>
  );
}

// ─── Main Tab Navigator (5 tabs) ──────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false, // each nested stack handles its own header
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: true,
          title: 'AT0M FIT',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Train"
        component={TrainNavigator}
        options={{
          tabBarLabel: 'Train',
          tabBarIcon: ({ focused }) => <TabIcon emoji="💪" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Compete"
        component={CompeteNavigator}
        options={{
          tabBarLabel: 'Compete',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏢" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'PROFILE',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ───────────────────────────────────────────────────────────

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ ...screenOptions, headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{
            headerShown: true,
            title: 'CREATE ACCOUNT',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{
            headerShown: true,
            title: 'RESET PASSWORD',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LiveRun"
          component={LiveRunScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FormCheck"
          component={FormCheckScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
