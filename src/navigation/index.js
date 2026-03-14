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
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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

// Split into two tab groups to avoid overcrowding:
// Main: Home | Workout | Run | Progress | Profile
// More: Calendar | Nutrition | Compete
// We'll just fit all 8 with smaller labels for now
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'AT0M FIT',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Workout"
        component={WorkoutScreen}
        options={{
          title: 'LOG WORKOUT',
          tabBarLabel: 'Workout',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Run"
        component={RunScreen}
        options={{
          title: 'RUN LOG',
          tabBarLabel: 'Run',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏃" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Nutrition"
        component={NutritionScreen}
        options={{
          title: 'NUTRITION',
          tabBarLabel: 'Nutrition',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🥗" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'PROGRESS',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Compete"
        component={LeaderboardScreen}
        options={{
          title: 'LEADERBOARD',
          tabBarLabel: 'Compete',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'PROFILE',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Stack to hold Calendar accessible from Home
const HomeStack = createStackNavigator();
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'AT0M FIT' }} />
      <HomeStack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'CALENDAR' }} />
    </HomeStack.Navigator>
  );
}

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
