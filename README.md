# ⚛ AT0M FIT

> Train like an element. Perform at scale.

A React Native + Expo fitness tracking app built for serious operators.

---

## 🚀 Quick Start (Expo Go)

```bash
# Install dependencies
npm install

# Start with tunnel (for phone access)
npx expo start --tunnel
```

Then scan the QR code with **Expo Go** (iOS App Store / Google Play).

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Framework | Expo SDK 51 (managed workflow) |
| Navigation | React Navigation 6 (Stack + Bottom Tabs) |
| Backend | Supabase (Auth + Database + RLS) |
| Storage | AsyncStorage |
| Animations | React Native Reanimated 3 |

---

## 📱 Screens

| Screen | Description |
|---|---|
| SplashScreen | Animated logo, auto-routes to Login or Home |
| LoginScreen | Email/password auth via Supabase |
| SignUpScreen | Name, email, password, goal picker |
| HomeScreen | Greeting, today's workout, weekly stats |
| WorkoutScreen | Log exercises (sets/reps/weight) |
| ProgressScreen | Weekly volume chart + PR tracker |
| ProfileScreen | User info, lifetime stats, sign out |

---

## 🗄 Supabase Database Setup

Run this SQL in your [Supabase SQL Editor](https://supabase.com/dashboard/project/kgozddcutazpqmfbzafa/sql/new):

```sql
-- Users profile table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  goal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workouts
CREATE TABLE workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a workout
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_lbs NUMERIC
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their data" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their workouts" ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their exercises" ON exercises FOR ALL USING (
  workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid())
);
```

Also enable **Email Auth** in:
> Supabase Dashboard → Authentication → Providers → Email

---

## 🎨 Color Theme

| Name | Hex |
|---|---|
| Background | `#0a0a0a` |
| Surface | `#111111` |
| Gold | `#C9A84C` |
| Blue Accent | `#00d4ff` |
| Green | `#39ff14` |
| Text | `#ffffff` |
| Muted | `#888888` |

---

## 📂 File Structure

```
at0mfit-app/
  App.js                        # Entry point
  app.json                      # Expo config
  package.json
  babel.config.js
  src/
    lib/
      supabase.js               # Supabase client init
    navigation/
      index.js                  # Root navigator
    screens/
      SplashScreen.js
      LoginScreen.js
      SignUpScreen.js
      HomeScreen.js
      WorkoutScreen.js
      ProgressScreen.js
      ProfileScreen.js
    components/
      GoldButton.js             # Reusable styled button
      Card.js                   # Dark surface card
    theme/
      colors.js                 # Color constants
      fonts.js                  # Font scale
```

---

## 📦 Bundle IDs

- iOS: `com.at0mfit.app`
- Android: `com.at0mfit.app`

---

Built with ⚛ by At0m Prime
