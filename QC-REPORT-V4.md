# ⚛️ AT0M FIT — QC REPORT V4
**Analyst:** At0m Prime (Senior Product QC)  
**Date:** 2026-03-14  
**Version Reviewed:** 1.3 (post-Forge pass 3 — focused fixes)  
**Previous Versions:** V1: D+ / 4.5 — V2: C+ / 6.5 — V3: B / 7.1  
**Benchmarks:** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong

---

## OVERALL V4 GRADE

> **B / 7.4/10**  
> *(V1: D+ / 4.5 → V2: C+ / 6.5 → V3: B / 7.1 → V4: B / 7.4 — cumulative +2.9 points across three passes)*

The V4 pass was surgical — two screens, four specific fixes, zero regressions. ProgressScreen went from the weakest screen in the app to mid-tier in a single pass. The addition of SVG line charts, a 12-week heatmap, strength classification badges, and a run records section adds genuine analytical depth that competitors like Hevy and Garmin Connect charge for. CalendarScreen's critical DB bug is resolved: `nutrition_logs` and `recovery_logs` tables are now in place, making the Nutrition and Recovery panels functional for the first time. 

The B ceiling is now held by three things that weren't touched in this pass: no GPS live tracking, no AI workout generation, and no Stripe subscription. Those three features are the bridge from B to A-.

---

## GRADE COMPARISON TABLE — V1 → V2 → V3 → V4

| Screen / Feature | V1 | V1 Score | V2 | V2 Score | V3 | V3 Score | V4 | V4 Score | V3→V4 Δ |
|---|---|---|---|---|---|---|---|---|---|
| Splash Screen | B | 7.0 | B+ | 7.5 | B+ | 7.5 | B+ | 7.5 | → 0 |
| Login Screen | B- | 6.0 | B+ | 7.5 | **A-** | **8.0** | A- | 8.0 | → 0 |
| Sign Up Screen | C | 5.0 | C+ | 6.0 | **B** | **7.0** | B | 7.0 | → 0 |
| Home Screen | C+ | 5.5 | B- | 6.5 | **B** | **7.0** | B | 7.0 | → 0 |
| Workout Screen | D+ | 4.0 | B- | 6.5 | **B+** | **7.5** | B+ | 7.5 | → 0 |
| Run Screen | B- | 6.5 | B | 7.0 | **B+** | **7.5** | B+ | 7.5 | → 0 |
| Progress Screen | D+ | 4.0 | C+ | 6.0 | C+ | 6.0 | **B+** | **7.5** | **↑ +1.5** |
| Profile Screen | D | 3.5 | C+ | 6.0 | **B** | **7.0** | B | 7.0 | → 0 |
| ForgotPassword Screen | ❌ | — | B | 7.0 | B | 7.0 | B | 7.0 | → 0 |
| Nutrition Screen | ❌ | — | ❌ | — | **B-** | **6.5** | B- | 6.5 | → 0 |
| Leaderboard / Compete | ❌ | — | ❌ | — | **B-** | **6.5** | B- | 6.5 | → 0 |
| Calendar Screen | ❌ | — | ❌ | — | **B** | **7.0** ⚠️ | **B+** | **7.5** | **↑ +0.5** |
| Navigation Architecture | C | 5.0 | C+ | 5.5 | **B-** | **6.5** | B- | 6.5 | → 0 |
| Design System (components/theme) | A- | 8.5 | A- | 8.5 | A- | 8.5 | A- | 8.5 | → 0 |
| **OVERALL APP** | **D+** | **4.5** | **C+** | **6.5** | **B** | **7.1** | **B** | **7.4** | **↑ +0.3** |

*⚠️ V3 CalendarScreen grade of B / 7.0 carried a critical DB bug flag. V4 resolves it.*

---

## V4 RE-GRADES (CHANGED SCREENS ONLY)

---

### CALENDAR SCREEN
**V4 Grade: B+ | 7.5/10** *(was B | 7.0 — ↑ +0.5)*  
*V3 carried a critical bug: `nutrition_logs` and `recovery_logs` tables were not in the DB migration. That bug is now resolved.*

#### ✅ What's Confirmed Fixed

**`nutrition_logs` queries now work.**  
`loadMonthData()` queries `nutrition_logs` for `(date, carb_day_type)` to build the nutrition dot layer on the calendar grid. `loadDayData()` queries `nutrition_logs` for the full day record including `eating_window_start`, `eating_window_end`, `carb_day_type`, and `notes`. `saveMeal()` upserts to `nutrition_logs` with `onConflict: 'user_id,date'`. All three paths are wired and consistent. Nutrition dots on the calendar will now actually appear for days where PRO users have logged carb cycling data.

**`recovery_logs` queries now work.**  
`loadMonthData()` queries `recovery_logs` for `(date, sleep_hours)` to build the recovery dot layer. `loadDayData()` queries `recovery_logs` for the full record including `sleep_hours`, `soreness_level`, `mobility_done`, `cold_therapy`. `saveRecovery()` upserts to `recovery_logs` with conflict resolution. The recovery panel was completely non-functional in V3; it's now complete.

**3-tab system confirmed fully functional.**  
`const TABS = ['Workout', 'Nutrition', 'Recovery']` with `TAB_ICONS` and `activeTab` state. Tab switcher pill renders all three. Conditional render at the bottom routes to `renderWorkoutDetail()`, `renderNutritionDetail()`, or `renderRecoveryDetail()` correctly based on `activeTab`. Each panel has its own loading state via `dayLoading`, empty states, action buttons, and modal triggers. The architecture is clean.

**Recovery modal is complete.**  
Sleep hours chip picker (4–12h), soreness star rating (1–5, interactive), mobility toggle, cold therapy toggle (PRO-only), computed readiness score (`10 - soreness + 2 if sleep > 7h`), color-coded green/gold/red. This is WHOOP-lite functionality at zero additional infrastructure cost.

#### ⚠️ Residual Gap (Notable — Not Critical)

**Nutrition data split still exists.**  
The CalendarScreen's `nutrition_logs` table stores day-level carb cycling data (carb_day_type, eating_window, notes). The NutritionScreen's meal logging still writes to `meal_logs` (meal-by-meal: name, calories, protein, carbs, fat). These are *different tables serving different scopes* — day-level planning vs. meal-level tracking. The Calendar's "LOG MEAL" modal only captures a notes field, not the rich macro data logged in NutritionScreen. A PRO user who carefully logs every meal in NutritionScreen will see empty Calendar nutrition dots unless they *also* log a day-level entry in CalendarScreen.

This is a design seam, not a blocker. Both tables exist and both work. But the two nutrition experiences don't talk to each other.

#### ❌ Still Missing
- Calendar not in main tab bar — still accessed only via HomeStack push (discovery problem)
- Workout detail shows exercise count, not exercise names
- No swipe gesture to change month
- No week-strip view (7-day compact alternative to full month grid)
- Nutrition calendar experience disconnected from meal_logs data

---

### PROGRESS SCREEN
**V4 Grade: B+ | 7.5/10** *(was C+ | 6.0 — ↑ +1.5)*  
*Largest single-screen improvement in the project's history. All four V3 top-priority items shipped.*

#### ✅ What's Fixed — Item by Item

**1. SVG line chart with `react-native-svg` Polyline — CONFIRMED.**  
```js
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
```
`WeightLineChart` now computes a proper `points` array with x-coordinates scaled to `chartW` and y-coordinates normalized to `(chartH - padding * 2)` with correct origin. `polylinePoints` is built as a space-separated coordinate string and passed to `<Polyline fill="none" stroke={colors.gold} strokeWidth={2} strokeOpacity={0.85} />`. Each data point gets a `<Circle r={4} fill={colors.gold} />`. A horizontal baseline `<Line>` anchors the chart bottom. This is the correct, idiomatic react-native-svg implementation. The V3 `transformOrigin` issue is completely replaced by a proper SVG coordinate system.

**2. 12-week training frequency heatmap — CONFIRMED.**  
`FrequencyHeatmap` component builds an 84-cell grid (12 × 7 days) by iterating backward 83 days from today. Color scheme: `colors.gold` = workout, `colors.blue` = run, `#e6b84a` (brighter gold) = both on same day, `colors.surface` = rest. Grid rendered as 12 rows × 7 cells with day-of-week headers (`Su Mo Tu We Th Fr Sa`) and week start-date labels on each row. Legend strip at top. `heatmapWorkoutDays` and `heatmapRunDays` are `Set` objects for O(1) lookup. The DB queries pull all workouts and runs from the last 84 days to populate them. This is the GitHub commit-graph pattern that Garmin Connect uses as a premium feature — it's implemented correctly and completely.

**3. Strength standards — CONFIRMED.**  
```js
const STRENGTH_STANDARDS = {
  squat:    { novice: 135, intermediate: 225, advanced: 315 },
  bench:    { novice: 95,  intermediate: 185, advanced: 275 },
  deadlift: { novice: 185, intermediate: 315, advanced: 405 },
  default:  { novice: 95,  intermediate: 185, advanced: 275 },
};
```
`getStrengthLevel(exerciseName, weightLbs)` matches exercise name against squat/bench/deadlift keywords and returns `{ label, color }` for NOVICE (muted) / INTERMEDIATE (blue) / ADVANCED (gold) / ELITE (green). `PRRow` now renders a bordered badge below each PR name with the classification and color. Every PR in the tracker is now self-contextualizing — a user can see at a glance whether their best lift is beginner-tier or competitive. Hevy has this feature; At0m now matches it.

**4. Run records section — CONFIRMED.**  
`loadProgress()` queries `runs` (all history) and computes three records: `longestRun` (max `distance_mi`), `bestPaceRun` (min `pace_per_mile_seconds`), `mostElevationRun` (max `elevation_ft`). Section renders conditionally when `runRecords` state is non-null. Three rows with emoji anchors (📏 Longest Run, ⚡ Best Pace, ⛰️ Most Elevation), blue value text, correct `formatPace()` helper for MM:SS/mi display. Dividers between rows. This is the "all-time records" panel that Strava and NRC both show and runners check regularly.

**Bonus fix — 7D/30D/90D range toggle on volume chart.**  
`RANGE_OPTIONS = [{ label: '7D', days: 7 }, { label: '30D', days: 30 }, { label: '90D', days: 90 }]`. `volumeRange` state drives `loadProgress(rangeDays)`. For 30D, chart samples every 3 days; for 90D, every 7 days (weekly aggregation). This was listed as a V3 quick win and is now done. ProgressScreen now has parity with RunScreen on time-range control.

#### ❌ Still Missing
- **Units propagation incomplete** — `WeightLineChart` still shows "Min: X lbs / Max: X lbs" hardcoded. `useProfile()` is not imported. Users who switch to kg see mixed units on this screen.
- **Weekly mileage chart locked to 7D** — The 30D/90D toggle was added to the volume chart, but mileage chart still builds a fixed 7-day array. Should share the range toggle.
- **PR data source** — Still queries `exercises.weight_lbs` (first-set summary per workout), not `exercise_sets` heaviest historical set. PR values are correct enough for display but not analytically precise.
- **No body fat % trend** — `profiles.body_fat_pct` field exists, but there's no log table or trend chart for it. Profile stores the current value only.
- **No weight log deletion** — Can't remove an incorrect entry. Upsert on same date overwrites, but there's no delete button.
- **Active Days card** — Still counts bars with `value > 0` in the current volume chart range, not a true consecutive-day streak. The streak calculation exists in HomeScreen but is not imported here.

---

## WHAT'S LEFT TO REACH A TIER (8.0+ Overall)

To cross from B / 7.4 to A- / 8.0+, the portfolio average needs to rise ~0.6 points. The path requires both screen polish and the two major features that define competitive positioning:

| Gap | Target Screen(s) | Impact on Overall |
|---|---|---|
| **GPS live run tracking** (expo-location + background task) | Run Screen | +0.5 (B+ → A-) |
| **AI workout generation** (extend daily goal GPT to full exercise list) | Workout Screen | +0.5 (B+ → A-) |
| **Stripe subscription** (actual Pro tier purchase flow) | Profile / all PRO gates | +0.3 (monetization credibility) |
| Complete units propagation (Progress + Run hardcoded lbs) | Progress, Run | +0.1 |
| Personalized macro targets from profile in Nutrition | Nutrition | +0.2 (B- → B) |
| Full onboarding (9-screen flow with physical metrics + equipment) | Sign Up / Onboarding | +0.2 (Sign Up B → B+) |
| Social features: kudos, activity feed, teammate notifications | Compete / Home | +0.2 (B- → B) |
| Calendar → main tab bar | Navigation | +0.1 |
| Exercise library depth 104 → 500+ exercises | Workout | +0.1 |

**The non-negotiable threshold items for A- / 8.0:**
1. **GPS tracking** — Without it, At0m Fit is a manual run logger. Strava defines the category with live tracking. Every serious runner will keep Strava until this ships.
2. **AI workout generation** — The PRD's primary differentiator and the justification for the Pro tier price. The infrastructure (GPT-4o-mini, profile data, training history) is all in place. This is an extension of `generateDailyGoal()`, not a new system.

Everything else raises individual screen grades. Only GPS + AI generation changes the competitive narrative.

---

## TOP 3 REMAINING QUICK WINS

These are sub-2-hour builds that have outsized impact:

### 1. 🔧 Fix units propagation in ProgressScreen (30 min)
**Impact: High | Effort: Tiny**  
Import `useProfile()` in ProgressScreen. Pass `weightLabel` (from ProfileContext) to `WeightLineChart` and replace the two hardcoded "lbs" strings in `weightMinMaxText`. Also update the `placeholder` in `weightInput` to use `weightLabel`. Users who switched to kg in Profile currently see "Min: X lbs / Max: X lbs" on their weight trend — a jarring inconsistency given that WorkoutScreen was fixed in V3. One import, two string replacements.

### 2. 🔧 Wire CalendarScreen nutrition dots to meal_logs (1 hour)
**Impact: High | Effort: Low**  
Currently the CalendarScreen nutrition dot layer queries `nutrition_logs` (the day-level carb cycling table), but users log their actual food in NutritionScreen's `meal_logs` table. Add a second query in `loadMonthData()`: query `meal_logs` grouped by date for any day with entries. If a date has `meal_logs` rows, show a nutrition dot on the calendar even if no `nutrition_logs` day entry exists. In `renderNutritionDetail()`, add a "Today's meals" summary showing total calories and protein from `meal_logs` for the selected date. This bridges the gap between the two nutrition tables without requiring a schema change.

### 3. 🔧 Add 30D/90D toggle to weekly mileage chart (1 hour)
**Impact: Medium | Effort: Low**  
The weekly mileage bar chart still uses a fixed 7-day array in `loadProgress()`. Port the existing `volumeRange` / `RANGE_OPTIONS` pattern: let mileage chart share the same range toggle, or add a separate `mileageRange` state. The aggregation logic already exists for volume — copy it with `distance_mi` instead of exercise volume. ProgressScreen then has consistent range control across both charts, matching RunScreen.

---

## OVERALL V4 ASSESSMENT

### New Overall Grade: B / 7.4/10 *(was B / 7.1 in V3)*

Two screens, two meaningful upgrades. ProgressScreen's C+ was the single biggest drag on the app's overall grade — a screen that served as a progress analytics hub but had no real analytics. That changes in V4: the screen now has a proper SVG line chart, a GitHub-style training heatmap (a premium feature on competing apps), strength classification badges on every PR, a run records all-time panel, and time-range control on the volume chart. A user who opens ProgressScreen in V4 for the first time will recognize it as a real analytics dashboard, not a data dump.

CalendarScreen's upgrade is narrower but meaningful: it resolves what was flagged as the only critical bug in V3. The three-tab recovery/nutrition/workout system is now fully functional — not just visually complete. Recovery logging with sleep scoring and readiness calculation is live. The residual data-split between `nutrition_logs` and `meal_logs` is a design seam to address next, not a blocker.

The path forward is clear: GPS tracking and AI workout generation are the features that change the competitive story from "impressive for an indie app" to "why I switched from Strava and Hevy." Everything else is polish on a foundation that's now genuinely strong.

---

## FINAL V4 SCORECARD

| Screen / Feature | V1 | V2 | V3 | V4 |
|---|---|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 |
| Login Screen | B- / 6.0 | B+ / 7.5 | A- / 8.0 | A- / 8.0 |
| Sign Up Screen | C / 5.0 | C+ / 6.0 | B / 7.0 | B / 7.0 |
| Home Screen | C+ / 5.5 | B- / 6.5 | B / 7.0 | B / 7.0 |
| Workout Screen | D+ / 4.0 | B- / 6.5 | B+ / 7.5 | B+ / 7.5 |
| Run Screen | B- / 6.5 | B / 7.0 | B+ / 7.5 | B+ / 7.5 |
| Progress Screen | D+ / 4.0 | C+ / 6.0 | C+ / 6.0 | **B+ / 7.5** ↑ +1.5 |
| Profile Screen | D / 3.5 | C+ / 6.0 | B / 7.0 | B / 7.0 |
| ForgotPassword Screen | ❌ / — | B / 7.0 | B / 7.0 | B / 7.0 |
| Nutrition Screen | ❌ / — | ❌ / — | B- / 6.5 | B- / 6.5 |
| Leaderboard / Compete | ❌ / — | ❌ / — | B- / 6.5 | B- / 6.5 |
| Calendar Screen | ❌ / — | ❌ / — | B / 7.0 ⚠️ | **B+ / 7.5** ↑ +0.5 |
| Navigation Architecture | C / 5.0 | C+ / 5.5 | B- / 6.5 | B- / 6.5 |
| Design System | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 |
| **OVERALL** | **D+ / 4.5** | **C+ / 6.5** | **B / 7.1** | **B / 7.4** |

---

*Report generated by At0m Prime QC | 2026-03-14 | v4*
