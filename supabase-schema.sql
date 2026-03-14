-- ============================================
-- AT0M FIT — SUPABASE SCHEMA
-- Run this at: https://supabase.com/dashboard/project/kgozddcutazpqmfbzafa/sql/new
-- ============================================

-- PROFILES TABLE
-- Created automatically when a user signs up via trigger below
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  goal TEXT CHECK (goal IN ('strength', 'muscle', 'fat_loss', 'endurance', 'performance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WORKOUTS TABLE
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXERCISES TABLE
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sets INTEGER,
  reps INTEGER,
  weight_lbs NUMERIC(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Workouts: users can only see/edit their own workouts
CREATE POLICY "workouts_select_own" ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workouts_insert_own" ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workouts_update_own" ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workouts_delete_own" ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Exercises: users can access exercises for their own workouts
CREATE POLICY "exercises_select_own" ON exercises FOR SELECT
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "exercises_insert_own" ON exercises FOR INSERT
  WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "exercises_update_own" ON exercises FOR UPDATE
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));
CREATE POLICY "exercises_delete_own" ON exercises FOR DELETE
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = auth.uid()));

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES (performance)
-- ============================================

CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts(user_id);
CREATE INDEX IF NOT EXISTS workouts_date_idx ON workouts(date);
CREATE INDEX IF NOT EXISTS exercises_workout_id_idx ON exercises(workout_id);
