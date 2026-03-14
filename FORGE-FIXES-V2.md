# FORGE-FIXES-V2.md — Comprehensive Final Pass

**Date:** 2026-03-14  
**Commit:** `4f1aa37`  
**Branch:** `main`  

---

## ✅ PHASE 1: DATABASE CHANGES

All DDL executed via psql against Supabase:

- ✅ `exercises_library` table created (id, name, muscle_group, equipment, description, category)
- ✅ `meal_logs` table created with full macro tracking fields
- ✅ `supplement_logs` table created with dose/time_taken fields
- ✅ `leaderboard` view created (profiles + team_members JOIN, ordered by total_tokens)
- ✅ `profiles.fitness_level` column added (CHECK: beginner/intermediate/advanced/elite)
- ✅ `profiles.body_fat_pct` column added (NUMERIC(4,1))
- ✅ RLS enabled on all new tables with appropriate policies
- ✅ `delete_user()` Supabase function created (SECURITY DEFINER, deletes from auth.users)
- ✅ **104 exercises seeded** across strength / cardio / mobility categories

---

## ✅ PHASE 2: WORKOUT SCREEN UPGRADES

### 2a. Rest Timer Modal
- ✅ `RestTimerModal` component embedded in WorkoutScreen.js
- ✅ Auto-triggers when any set checkmark is tapped (completed)
- ✅ 4 quick-select buttons: 60s | 90s | 120s | 180s (default 90s)
- ✅ Large MM:SS countdown display
- ✅ Gold progress bar that shrinks with remaining time
- ✅ SKIP button dismisses early
- ✅ Visual flash animation at timer = 0, auto-closes

### 2b. Estimated 1RM Calculation
- ✅ Epley formula: `weight × (1 + reps/30)` calculated per set
- ✅ MAX 1RM across all sets displayed as "Est. 1RM: XXX lbs" in gold text
- ✅ Only shown when at least one set has weight > 0 and reps > 0

### 2c. Exercise Library Search
- ✅ TextInput "Search exercises..." queries `exercises_library` via ILIKE
- ✅ Results shown as chips (name + muscle group label), tap to add
- ✅ Original 8 template chips preserved under "POPULAR" section
- ✅ Search limited to 8 results

---

## ✅ PHASE 3: PROFILE SCREEN UPGRADES

### 3a. Account Deletion
- ✅ "DELETE ACCOUNT" button in danger zone styling (red border, red text)
- ✅ Two-step confirmation alerts before any action
- ✅ Calls `supabase.rpc('delete_user')` then signs out
- ✅ Danger zone section with caption "Permanently deletes all your data"

### 3b. Fitness Level + Body Fat Fields
- ✅ Fitness level chip picker: BEGINNER | INTERMEDIATE | ADVANCED | ELITE
- ✅ Body fat % numeric input (optional)
- ✅ Both fields save to profiles table on "SAVE METRICS"
- ✅ Fitness level and body fat % displayed in the metrics row

### 3c. Units Propagation (ProfileContext)
- ✅ `ProfileContext.js` created at `src/context/ProfileContext.js`
- ✅ `ProfileProvider` wraps app via App.js
- ✅ `useProfile()` hook exported
- ✅ `weightLabel` and `convertWeight()` available globally
- ✅ WorkoutScreen: all "lbs" labels use `weightLabel` from context
- ✅ Workout volume display uses `weightLabel`
- ✅ Set column header uses `weightLabel`
- ✅ Est. 1RM display uses `weightLabel`

---

## ✅ PHASE 4: NUTRITION SCREEN (new)

File: `src/screens/NutritionScreen.js`

- ✅ **Eating Window** section: carb day type badge (HIGH CARB / MODERATE / LOW CARB) for PRO users; upgrade prompt for FREE tier
- ✅ **Meal Log** section: 
  - Lists today's meals from `meal_logs`
  - Inline LOG MEAL form (name, calories, protein, carbs, fat, notes)
  - Macro summary bars with progress (protein 180g / carbs 250g / fat 80g targets)
  - Daily calorie total display
  - Swipe-delete per meal (✕ button)
- ✅ **Supplement Tracker** section:
  - Lists today's supplements from `supplement_logs`
  - Quick-add chips: Creatine | Protein | Pre-Workout | Vitamin D | Magnesium | Fish Oil
  - Inline LOG SUPPLEMENT form (name, dose, time)
- ✅ Added to navigation as 🥗 "Nutrition" tab

---

## ✅ PHASE 5: LEADERBOARD SCREEN (new)

File: `src/screens/LeaderboardScreen.js`

- ✅ GLOBAL tab: Top 20 users from `leaderboard` view with rank | name | team | tokens
- ✅ Current user's row highlighted with gold border
- ✅ TEAMS tab: Top 10 teams by total_tokens
- ✅ Create Team: name input → inserts to `teams` + `team_members`
- ✅ Join Team: name search → finds team by ILIKE → inserts to `team_members`
- ✅ Leave team button (with confirmation)
- ✅ Pull-to-refresh on both tabs
- ✅ Added to navigation as 🏆 "Compete" tab

---

## ✅ PHASE 6: HOME SCREEN QUICK-LOG WEIGHT

- ✅ "Log weight" gold button below weekly stats
- ✅ Cross-platform inline input (TextInput + Save + Cancel)
- ✅ Upserts to `body_weight_logs` for today
- ✅ Shows "Today: X lbs — tap to update" if already logged

---

## ✅ PHASE 7: PUSH NOTIFICATIONS

- ✅ `expo-notifications` installed via npm
- ✅ `src/lib/notifications.js` created with:
  - `registerForPushNotifications()` — permission request + token retrieval
  - `scheduleStreakReminder()` — daily 7pm reminder
  - `scheduleGoalReminder(description)` — 8am goal reminder
- ✅ App.js calls `registerForPushNotifications()` and `scheduleStreakReminder()` on mount

---

## ✅ PHASE 8: MISC QUICK FIXES

### 8a. ToS Modal (SignUpScreen)
- ✅ "Terms of Service" link opens a Modal with full ToS text
- ✅ Modal has "Close" button

### 8b. Show/Hide Password (SignUpScreen)
- ✅ 👁 toggle on PASSWORD field
- ✅ 👁 toggle on CONFIRM PASSWORD field

### 8c. Run Mileage Chart Range Toggle
- ✅ 7D / 30D / 90D toggle above mileage chart
- ✅ 7D = daily bars, 30D/90D = weekly grouped bars
- ✅ Chart rebuilds on range change

### 8d. Duration Display on Run Cards
- ✅ `formatDuration(duration_seconds)` → H:MM:SS format
- ✅ Duration shown as gold DURATION stat on each run card

### 8e. Inline Field Validation (Login + SignUp)
- ✅ LoginScreen: email regex validation, password length check, inline red error text
- ✅ LoginScreen: auth error shown inline (not Alert)
- ✅ SignUpScreen: all fields validated inline (name, email regex, password length ≥6, passwords match, goal selection)
- ✅ Supabase called only after all validations pass

---

## ✅ PHASE 9: NAVIGATION UPDATE

- ✅ NutritionScreen added as 🥗 "Nutrition" tab
- ✅ LeaderboardScreen added as 🏆 "Compete" tab
- ✅ CalendarScreen preserved as accessible via HomeStack
- ✅ 7 main tabs: Home | Workout | Run | Nutrition | Progress | Compete | Profile
- ✅ Font size reduced to 9px on tab labels for clean fit

---

## ⏭ SKIPPED (require external accounts/services)

| Feature | Reason Skipped |
|---------|---------------|
| Stripe payments / Pro subscription | Requires Stripe account setup |
| Apple Health integration | Requires Apple Developer account + iOS entitlements |
| WHOOP / Garmin sync | Requires partner API agreements |
| GPS background location | Requires device-level testing + entitlements |

---

## Summary

**22 features/fixes built across 9 phases.**  
**0 skipped that were actionable without external accounts.**  
**All files pass Node.js syntax check.**  
**Committed and pushed to `main` at `4f1aa37`.**
