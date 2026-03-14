# ⚛️ AT0M FIT — QC REPORT V3
**Analyst:** At0m Prime (Senior Product QC)  
**Date:** 2026-03-14  
**Version Reviewed:** 1.2 (post-Forge pass 2)  
**Previous Versions:** V1: D+ / 4.5 — V2: C+ / 6.5  
**Benchmarks:** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong

---

## OVERALL V3 GRADE

> **B / 7.1/10**  
> *(V1: D+ / 4.5 → V2: C+ / 6.5 → V3: B / 7.1 — cumulative +2.6 points across two passes)*

The app crossed the second threshold in V3: from *functional MVP* to *legitimate competitive product*. Three entirely new screens shipped (Nutrition, Compete/Leaderboard, Calendar). The Workout screen grew its most-demanded features (rest timer, exercise library, 1RM). Auth screens now match industry UX standards with inline validation. A genuine architectural improvement — `ProfileContext` — propagates units preferences globally.

**The benchmark has shifted.** In V2 the question was "can a real user actually train with this?" The answer became yes. In V3 the question is "why would a serious athlete choose this over Hevy or Strava?" The answer is still being built: AI workout generation and GPS tracking are the pivots that will answer it.

---

## GRADE COMPARISON TABLE — V1 → V2 → V3

| Screen / Feature | V1 | V1 Score | V2 | V2 Score | V3 | V3 Score | V2→V3 Δ |
|---|---|---|---|---|---|---|---|
| Splash Screen | B | 7.0 | B+ | 7.5 | B+ | 7.5 | → 0 |
| Login Screen | B- | 6.0 | B+ | 7.5 | **A-** | **8.0** | ↑ +0.5 |
| Sign Up Screen | C | 5.0 | C+ | 6.0 | **B** | **7.0** | ↑ +1.0 |
| Home Screen | C+ | 5.5 | B- | 6.5 | **B** | **7.0** | ↑ +0.5 |
| Workout Screen | D+ | 4.0 | B- | 6.5 | **B+** | **7.5** | ↑ +1.0 |
| Run Screen | B- | 6.5 | B | 7.0 | **B+** | **7.5** | ↑ +0.5 |
| Progress Screen | D+ | 4.0 | C+ | 6.0 | C+ | 6.0 | → 0 |
| Profile Screen | D | 3.5 | C+ | 6.0 | **B** | **7.0** | ↑ +1.0 |
| ForgotPassword Screen | ❌ | — | B | 7.0 | B | 7.0 | → 0 |
| Nutrition Screen | ❌ | — | ❌ | — | **B-** | **6.5** | NEW |
| Leaderboard / Compete | ❌ | — | ❌ | — | **B-** | **6.5** | NEW |
| Calendar Screen | ❌ | — | ❌ | — | **B** | **7.0** | NEW |
| Navigation Architecture | C | 5.0 | C+ | 5.5 | **B-** | **6.5** | ↑ +1.0 |
| Design System (components/theme) | A- | 8.5 | A- | 8.5 | A- | 8.5 | → 0 |
| **OVERALL APP** | **D+** | **4.5** | **C+** | **6.5** | **B** | **7.1** | **↑ +0.6** |

---

## TOP GRADE JUMPS V2 → V3

1. **Workout Screen: B- → B+ (+1.0)** — Rest timer modal auto-triggered on set completion is the single feature separating "logger" from "serious training app." Exercise library search (104 exercises seeded, ILIKE query, result chips) fills the biggest structural gap. Estimated 1RM per exercise (Epley formula, real-time calculation across all sets) is a quality-of-life upgrade that Hevy and Strong both have. The combination makes this screen genuinely competitive.

2. **Sign Up Screen: C+ → B (+1.0)** — Inline validation on all fields (name, email regex, password length ≥6, passwords match, goal selection) removes the last Alertbox pattern from the onboarding flow. ToS now opens a full-text Modal rather than being a dead link. Show/hide password on both password fields closes the parity gap with LoginScreen.

3. **Profile Screen: C+ → B (+1.0)** — Account deletion (two-step confirmation → `supabase.rpc('delete_user')`) removes the single App Store / Google Play submission blocker. Fitness level chip selector (BEGINNER/INTERMEDIATE/ADVANCED/ELITE) and body fat % field feed the AI personalization pipeline. Wake/sleep time fields enable the nutrition timing features in CalendarScreen.

4. **Navigation Architecture: C+ → B- (+1.0)** — Three new tabs (Nutrition, Compete, Calendar accessible via HomeStack) represent a real navigation architecture. The 7-tab layout is near the limit but acceptable for a training app.

5. **Login Screen: B+ → A- (+0.5)** — Inline field validation (email regex, password length) replaces the last two Alert patterns in auth. Auth error messages now render as inline red text beneath the form rather than interrupting with a dialog.

---

## SCREEN-BY-SCREEN V3 RE-GRADES

---

### 1. SPLASH SCREEN
**V3 Grade: B+ | 7.5/10** *(unchanged from V2)*

No changes in this pass. The `ActivityIndicator` spinner-after-1.5s pattern from V1 Forge remains correct and in place. Ceiling still held by missing atom animation and no offline detection.

#### Still Missing
- No atom particle/orbit animation — screen is static while loading
- No offline detection — `getSession` failure silently hangs; no "Check your connection" fallback
- No biometric shortcut for return visits

#### Quick Wins
- Subtle low-opacity orbit ring animation (Animated.loop + rotate)
- `try/catch` around `getSession` with an offline banner state

---

### 2. LOGIN SCREEN
**V3 Grade: A- | 8.0/10** *(was B+ | 7.5 — ↑ +0.5)*

#### ✅ What Improved
- **Inline validation** — email regex check before calling Supabase, password length validation. Both display as inline red text, no Alert dialogs. Industry-standard UX now.
- **Inline auth errors** — `humanizeAuthError()` results displayed inline beneath the form, not as a dialog box.

#### ❌ Still Missing
- No social login (Apple/Google)
- No biometric "Use Face ID" option for returning users
- No "Remember me" toggle (session persistence is implicit — fine for mobile, but power users expect it)

#### Assessment
At A- this screen compares favorably to Nike Run Club and Strava on fundamentals. The remaining gaps are enhancement, not core UX issues.

---

### 3. SIGN UP SCREEN
**V3 Grade: B | 7.0/10** *(was C+ | 6.0 — ↑ +1.0)*

#### ✅ What Improved
- **Full inline validation** — name, email regex, password ≥6 chars, passwords-match, goal selection — all validated inline before Supabase is called. Zero Alert dialogs remain in the happy path.
- **ToS Modal** — "Terms of Service" link now opens a `Modal` with full ToS text and a Close button. Legal gray area resolved.
- **Show/hide password parity** — 👁 toggle on both PASSWORD and CONFIRM PASSWORD fields, consistent with LoginScreen.

#### ❌ Still Missing
- Full 9-screen onboarding still absent — physical metrics, equipment access, training availability collected post-hoc via Profile
- No social sign-up (Apple/Google)
- No progress bar indicating onboarding steps
- Goal selection still a single chip grid — no explanation of what each goal unlocks

---

### 4. HOME SCREEN (Dashboard)
**V3 Grade: B | 7.0/10** *(was B- | 6.5 — ↑ +0.5)*

#### ✅ What Improved
- **Quick-log weight** — Inline `TextInput` + Save + Cancel below weekly stats, or "Today: X lbs — tap to update" if already logged. Upserts to `body_weight_logs`. This is the right UX — it removes a navigation step for a daily action.
- **PRO upgrade card** — For free-tier users, a gold-bordered card explains what Pro unlocks. This is the right monetization hook placement.

#### ❌ Still Missing
- Still no wearable HRV / sleep / recovery data (WHOOP's entire value proposition)
- No nutrition summary tile (macros remaining today)
- Weekly stats row lacks total volume (lbs lifted this week) — the data is in the DB, just not shown
- AI goal generation silently fails if OpenAI key is missing — no deterministic fallback goal
- No activity feed (what teammates are doing today)

#### Quick Wins
- Fallback goal when AI unavailable: generate deterministic from profile (rest day if 6+ workouts this week, run if no run in 3 days)
- Weekly volume stat in the stats row (replace the exercise count, which is less meaningful)

---

### 5. WORKOUT SCREEN — MAJOR UPGRADE
**V3 Grade: B+ | 7.5/10** *(was B- | 6.5 — ↑ +1.0)*

This is the headline improvement of V3.

#### ✅ What Improved
- **Rest timer modal** — `RestTimerModal` auto-triggers on any set checkmark. 4 presets (60/90/120/180s). Large MM:SS countdown. Gold progress bar that depletes with time. Flash animation at zero. SKIP button. This is how Hevy, Strong, and Gravity work. The implementation is clean — `setInterval` cleanup handled, `Animated.Value` flash sequence correct. Gold standard for a rest timer implementation.
- **Exercise library search** — `TextInput` fires ILIKE query against `exercises_library` (104 exercises seeded across strength/cardio/mobility). Results render as gold-bordered chips with exercise name + muscle group label. Original 8 popular templates preserved under "POPULAR" section. This is real product progress — users can now find exercises they actually want to do.
- **Estimated 1RM per exercise** — Epley formula (`weight × (1 + reps/30)`) runs across all sets, max displayed as "Est. 1RM: XXX lbs" in gold text. Only shown when weight and reps > 0. Motivating reference that lifters care about.
- **Units propagation** — All "lbs" labels in WorkoutScreen now use `weightLabel` from `useProfile()`. Column headers, volume display, 1RM display, set input placeholder all respond to the lbs/kg preference.

#### ❌ Still Missing
- Rest timer starts at 90s default on every trigger — user preference not persisted between sessions
- Exercise library is 104 exercises (Hevy: 1,000+); no muscle group filter/browse
- Previous performance still pulls from `exercises` table summary (first-set data), not `exercise_sets` heaviest set
- No RPE (Rate of Perceived Exertion) or RIR (Reps in Reserve) field per set
- No superset/circuit grouping
- No workout template save and load
- **AI workout generation still absent** — the primary PRD differentiator; daily goal AI infrastructure exists but not extended to full workout output
- Delete-and-reinsert save pattern still has data integrity risk on network failure mid-save

#### Top 3 Remaining Improvements
1. **AI workout generation** — Extend `generateDailyGoal()` pattern to generate a full workout: exercise list + target sets/reps/weight based on goal + profile + recent history. Load directly into WorkoutScreen. This is the revenue justification for Pro tier.
2. **Fix previous performance data source** — Query `exercise_sets` for heaviest single set in user history for this exercise name, not `exercises.weight_lbs` (first-set summary). One query rewrite.
3. **Rest timer preference persistence** — Save last-used duration to AsyncStorage or `profiles.rest_timer_seconds`. Lifters use the same rest period for the same exercises every session.

---

### 6. RUN SCREEN
**V3 Grade: B+ | 7.5/10** *(was B | 7.0 — ↑ +0.5)*

#### ✅ What Improved
- **7D/30D/90D chart range toggle** — Confirmed in `buildChartData()` via `chartRange` state. 7D = daily bars, 30D/90D = weekly grouped bars (`W1, W2...`). Same control as ProgressScreen volume chart — parity achieved.
- **Duration display on run history cards** — `formatDuration(run.duration_seconds)` → H:MM:SS format. Displayed as gold "DURATION" stat on each RunCard. Runners care about total time as much as pace.

#### ❌ Still Missing
- **GPS / live run tracking** — Still the single largest competitive gap. Strava and NRC are defined by live tracking. Without it, At0m Fit is a manual log tool, not a run tracker.
- No route map (even post-run static display)
- No per-mile splits (manual input or GPS-derived)
- No heart rate zone breakdown (Z1-Z5) from avg HR
- No VO2 max estimation
- No shoe mileage tracker
- No training plan / scheduled workout integration

#### Assessment
At B+ this screen is now a very capable manual run logger — better than many simple alternatives. The ceiling is still GPS. Until that ships, Strava will always be preferred for actual run tracking.

---

### 7. PROGRESS SCREEN
**V3 Grade: C+ | 6.0/10** *(unchanged from V2)*

**Nothing changed in this screen in V3.** This is now the weakest screen in the app by a meaningful margin. The entire second Forge pass touched everything except Progress.

#### Still Missing (same as V2 report)
- Body weight line chart connecting lines unreliable (`transformOrigin` not supported in RN native) — needs `react-native-svg`
- Weekly mileage chart still hardcoded to 7 days (no 30D/90D toggle, unlike RunScreen which got it)
- No body composition trend (body fat % over time — field now stored in profiles, ready to log)
- No strength standards comparison (Novice/Intermediate/Advanced/Elite per lift)
- **No training frequency heatmap** — GitHub commit-style calendar. Garmin Connect and Hevy both do this. At0m has the Calendar screen now — Progress screen should have a lightweight version
- PR system uses `exercises.weight_lbs` (first-set summary), not estimated 1RM
- Active Days consistency card still counts non-zero bar chart days, not consecutive days (the real streak is calculated in HomeScreen but not shown here)
- No way to delete an incorrect weight log entry

#### This Is Now The Priority Screen For Next Pass
ProgressScreen sits at C+ while everything around it has moved to B range. It drags the overall grade.

#### Top 3 Improvements for Next Pass
1. **Replace custom line chart with `react-native-svg` polyline** — The dots-only weight trend is usable but the connecting lines are the visual signal users expect. `react-native-svg` is available in Expo SDK.
2. **Add 30D/90D toggle to mileage chart** — RunScreen got it. ProgressScreen should have it too. One-day port of the `buildChartData` pattern.
3. **Training frequency heatmap** — 12-week rolling calendar of workout days as colored dots (green = trained, muted = rest). The CalendarScreen has the foundation for this pattern. Port it to a compact version for Progress.

---

### 8. PROFILE SCREEN
**V3 Grade: B | 7.0/10** *(was C+ | 6.0 — ↑ +1.0)*

#### ✅ What Improved
- **Account deletion** — Two-step Alert confirmation → `supabase.rpc('delete_user')` → sign out → navigate to Login. The **App Store / Google Play submission blocker is resolved**. The danger zone styling (red border, red text) is correct — visually distinct without being alarming.
- **Fitness level chip selector** — BEGINNER | INTERMEDIATE | ADVANCED | ELITE. Correct chip UI matching the existing goal picker pattern. Saves to `profiles.fitness_level` (column added with CHECK constraint). This is the data that makes AI workout generation meaningful.
- **Body fat % field** — Optional numeric input, saves to `profiles.body_fat_pct`. Enables body composition trend tracking when used with weight logs.
- **Wake time / sleep time fields** — `HH:MM` text inputs, save to `profiles.wake_time` and `profiles.sleep_time`. These feed the CalendarScreen nutrition timing and the NutritionScreen eating window display.
- **Subscription tier badge** — FREE/PRO displayed in avatar section. Small but important for user awareness of tier status.

#### ❌ Still Missing
- **Units propagation incomplete** — `ProfileContext` exposes `weightLabel` globally, but `ProgressScreen` WeightLineChart still shows "Min: X lbs / Max: X lbs" hardcoded. `RunScreen` stats headers hardcode labels. WorkoutScreen is fixed; Progress and Run are not.
- No profile photo upload (still letter avatar — fine for MVP, feels dated at B grade)
- No email change mechanism
- No notification preferences UI
- No data export (CSV of workouts, runs, weight)
- Subscription tier shows FREE/PRO but no action to upgrade (the HomeScreen "UPGRADE" button just shows an Alert)

---

### 9. FORGOT PASSWORD SCREEN
**V3 Grade: B | 7.0/10** *(unchanged from V2)*

No changes in this pass. Same gaps as V2: no deep link handler for password reset URL (users land in browser for the actual reset form), no inline email format validation, no resend timer. These remain Quick Win candidates.

---

### 10. NUTRITION SCREEN *(NEW — First Grade)*
**V3 Grade: B- | 6.5/10**

A strong first build of a complex feature. This screen is functional and covers the core daily use case.

#### ✅ What It Does Well
- **Eating Window + Carb Day Type** — PRO-gated carb cycling badge (HIGH CARB / MODERATE / LOW CARB / REFEED) keyed by day of week. Upgrade prompt for FREE users. The monetization gate is well-placed and not obnoxious.
- **Meal log with full macro fields** — Name, calories, protein, carbs, fat, notes. Full inline form toggles open/closed. Macro summary bars with color-coded progress (protein=gold, carbs=green, fat=red). Daily calorie counter. Delete button per meal. This is exactly MyFitnessPal's core loop.
- **Supplement tracker** — Quick-add chips for the 6 most common supplements (Creatine, Protein, Pre-Workout, Vitamin D, Magnesium, Fish Oil). Full form with name/dose/time. Daily list with delete. Simple but effective.

#### ❌ Missing vs. Competitors
- **Macro targets are hardcoded** (`protein: 180, carbs: 250, fat: 80`) — not personalized to body weight, goal, or activity level. A 120lb female and a 240lb linebacker get the same targets. This is the #1 functional gap.
- No food database / barcode scanner (MyFitnessPal's entire moat — not realistic to build, but noted)
- No water intake tracker
- No meal favorites or templates
- Carb day type is determined purely by day-of-week pattern, not training load
- Nutrition data doesn't sync to CalendarScreen's nutrition detail panel (Calendar queries `nutrition_logs` table, Nutrition screen writes to `meal_logs` — different tables)
- `eatingWindow()` function references `profile.wake_time` but the eating window calculation always shows an 8-hour window regardless of actual sleep pattern

#### Top 3 Next Improvements
1. **Personalized macro targets** — Calculate from profile (`weight_lbs`, `goal`, `fitness_level`): Protein = weight × 0.8-1.2g depending on goal, Carbs/Fat from remaining calories. One function call, massive improvement to perceived AI intelligence.
2. **Sync meal_logs to CalendarScreen** — The CalendarScreen nutrition detail queries `nutrition_logs` while NutritionScreen writes to `meal_logs`. Either use the same table or have CalendarScreen query `meal_logs` for aggregate display.
3. **Water tracker** — A simple daily water counter (tap to add 8oz) is a high-engagement daily habit. Minimal effort, meaningful retention.

---

### 11. LEADERBOARD / COMPETE SCREEN *(NEW — First Grade)*
**V3 Grade: B- | 6.5/10**

A solid first social feature. The infrastructure is real and the UX flows correctly.

#### ✅ What It Does Well
- **GLOBAL tab** — Top 20 from the `leaderboard` view (profiles + team_members JOIN, ordered by `total_tokens`). Current user row highlighted with gold border. Clean rank row design (rank number color-coded gold for top 3).
- **TEAMS tab** — Top 10 teams by total_tokens. Clear ranking layout.
- **Create / Join / Leave team** — All three flows are complete: name input → insert → join → confirmation Alert. Join uses ILIKE match (case-insensitive). Leave uses confirmation Alert. No partial states left on screen.
- **Pull-to-refresh** — Both tabs refresh the leaderboard. The right pattern for social rankings.

#### ❌ Missing vs. Competitors
- **Token system is opaque** — "X pts" appears but there's no in-screen explanation of how tokens are earned (completing AI goals, logging workouts). Users seeing a score with no context is confusing.
- No sport-specific leaderboards — Strava has segment leaderboards, athlete rankings by distance. At0m should have: "Top Lifters by 1RM (Squat)", "Most Miles This Month", etc.
- No user profile tap-through (tapping a name on the leaderboard does nothing)
- No challenges (challenge a user / team to a week of workouts)
- No social reactions (kudos/likes on workouts — Strava's biggest retention mechanic)
- Team membership shows only the team name — no team stats, no teammate list, no activity feed

#### Top 3 Next Improvements
1. **Token explanation tooltip** — A small "?" icon that explains: "Earn pts by completing daily goals, logging workouts, hitting streak milestones." Eliminates confusion about what the numbers mean.
2. **Sport-specific sub-leaderboards** — "Top Mileage This Month" and "Strongest Squat" tabs. Data is already in `runs` and `exercise_sets` tables. Two additional queries.
3. **Teammate activity feed** — List of what your team's members logged today. "Alex logged a 5mi run" + "Jordan hit a 315lb PR." This is Strava's most-copied feature for a reason.

---

### 12. CALENDAR SCREEN *(NEW — First Grade)*
**V3 Grade: B | 7.0/10**

The most architecturally sophisticated new screen. The concept is strong and the UX is polished. One significant concern on data tables.

#### ✅ What It Does Well
- **Full monthly calendar grid** — Correct `getDaysInMonth` / `getFirstDayOfWeek` implementation. Previous/next month navigation. Today's date highlighted with border. Selected date highlighted in gold fill. Grid repaints correctly on month change.
- **Dot indicators per day** — Tab-specific dot colors: gold for workout days, carb-day color for nutrition, green for recovery logs. This is the visual "overview at a glance" that Garmin Connect uses to great effect.
- **Three-panel detail system** — Workout/Nutrition/Recovery tabs reveal contextually relevant data for the selected date. Navigation to WorkoutScreen for empty workout days (correct deep link).
- **Recovery log modal** — Sleep hours chip picker (4-12h), soreness star rating (1-5), mobility toggle, cold therapy toggle (PRO), computed readiness score (sleep + soreness formula). Clean sheet UI. This is a WHOOP-lite feature that no competitor does on a budget app.
- **PRO-gating** — Nutrition planning detail is locked for FREE users with a tasteful upgrade prompt. Recovery readiness score and cold therapy tracking are PRO-only. Correct monetization strategy.

#### ⚠️ Critical Data Table Concern
`CalendarScreen` queries `nutrition_logs` and `recovery_logs` tables. **Neither of these tables appears in FORGE-FIXES-V2.md's migration script.** The migration created `meal_logs` and `supplement_logs` — not `nutrition_logs`. This means:
- Nutrition dot indicators will always be empty (no `nutrition_logs` rows)
- Recovery log saves will fail with a PostgreSQL error
- `loadDayData()` will silently return null for both
- Calendar appears to work (no crash) but the Nutrition and Recovery panels are non-functional

This needs immediate DB remediation before V3 ships.

#### ❌ Also Missing
- Calendar is NOT in the main tab bar — accessible only via HomeStack push, which means most users won't find it
- Nutrition detail panel queries `nutrition_logs` (doesn't exist) instead of `meal_logs` (which does)
- No swipe-to-change-month gesture
- Workout detail only shows exercise count, not actual exercise names
- No week view (7-day strip) as an alternative to full month grid

#### Top 3 Next Improvements
1. **Create `recovery_logs` and `nutrition_logs` tables in DB** (or reroute queries to `meal_logs`) — This is the only critical bug in V3. Without it, the Nutrition and Recovery tabs in Calendar are broken.
2. **Add Calendar as a main tab** — Replace one of the less-used tabs or use a nested tab. At B-grade CalendarScreen deserves primary navigation placement.
3. **Wire Nutrition detail to `meal_logs`** — Query `meal_logs` for the selected date, display meal names + calorie count. Already-built data, just pointing at the wrong table.

---

## NAVIGATION ARCHITECTURE
**V3 Grade: B- | 6.5/10** *(was C+ | 5.5 — ↑ +1.0)*

### What Improved
- 7-tab layout registered and functional: Home | Workout | Run | Nutrition | Progress | Compete | Profile
- `HomeStack` pattern correctly nests CalendarScreen behind the Home tab (accessible via navigation.navigate call)
- Tab labels at 9px font size — small but readable, fits the 7-tab layout without truncation

### Still Missing
- 7 tabs is at the UX limit — Strava uses 4, Hevy uses 5. At 8+ tabs this breaks on small screens
- No deep linking configuration (`expo-linking` not set up — password reset flow still ends in browser)
- No notification routing (push notifications fire but tapping them doesn't navigate to relevant screen)
- CalendarScreen not accessible as a primary tab — discovery is entirely dependent on users finding it through HomeStack

---

## DESIGN SYSTEM (components / theme)
**V3 Grade: A- | 8.5/10** *(unchanged)*

The design system remains the strongest part of the codebase. No regressions. `ProfileContext` addition is a clean architectural extension — `useProfile()` hook pattern is correct React Context usage with auth state listener for proper cleanup.

New screens (Nutrition, Leaderboard, Calendar) all correctly import and use `Card`, `GoldButton`, `colors` from the existing system. Visual consistency is maintained across all 12 screens. Color coding is systematic: gold = primary/performance, green = success/active, blue = run/cardio, red = danger/fat. No arbitrary colors introduced.

---

## FEATURES STATUS vs. PRD — V3 UPDATE

| PRD Feature | V1 | V2 | V3 |
|---|---|---|---|
| Full 9-screen onboarding | ❌ | ❌ | ❌ |
| Liability waiver (ToS) | ❌ | ✅ Checkbox | ✅ + Full Modal |
| AI workout generation | ❌ | ❌ | ❌ |
| AI daily goal | ❌ | ✅ GPT-4o-mini | ✅ Unchanged |
| Forgot Password | ❌ | ✅ | ✅ |
| Set-by-set workout logging | ❌ | ✅ | ✅ |
| Rest timer | ❌ | ❌ | ✅ Auto-trigger |
| Exercise library | ❌ | ❌ | ✅ 104 exercises |
| Estimated 1RM | ❌ | ❌ | ✅ Epley formula |
| Session timer | ❌ | ✅ | ✅ |
| Total volume display | ❌ | ✅ | ✅ + units-aware |
| Previous performance | ❌ | ✅ | ✅ |
| Body weight tracking | ❌ | ✅ | ✅ + Quick-log from Home |
| Time range toggle (volume) | ❌ | ✅ 7D/30D/90D | ✅ |
| Weekly mileage chart | ❌ | ✅ Run + Progress | ✅ + 7D/30D/90D on Run |
| Run duration on history cards | ❌ | ❌ | ✅ |
| Run filter chips | ❌ | ✅ | ✅ |
| Physical metrics in Profile | ❌ | ✅ Weight/height/age | ✅ + fitness level + body fat |
| Goal editing in Profile | ❌ | ✅ Modal | ✅ |
| Functional units toggle | ❌ | ✅ Saves to DB | ✅ + Propagated via Context |
| Account deletion | ❌ | ❌ | ✅ Two-step + RPC |
| Inline field validation | ❌ | ❌ | ✅ Login + SignUp |
| ToS link opens modal | ❌ | ❌ | ✅ |
| Show/hide password (SignUp) | ❌ | ❌ | ✅ Both fields |
| Real streak calculation | ❌ | ✅ | ✅ |
| Rotating quotes | ❌ | ✅ 25 quotes | ✅ |
| Push notifications | ❌ | ❌ | ✅ Framework + daily reminders |
| Nutrition screen (meal log) | ❌ | ❌ | ✅ Full macro tracking |
| Supplement tracker | ❌ | ❌ | ✅ Quick-add chips |
| Leaderboard / Compete | ❌ | ❌ | ✅ Global + Teams |
| Teams (create/join/leave) | ❌ | ❌ | ✅ |
| Calendar screen | ❌ | ❌ | ✅ Full month + 3 tabs |
| Recovery logging | ❌ | ❌ | ✅ (⚠️ table may be missing) |
| ProfileContext (global units) | ❌ | ❌ | ✅ |
| Wearable integrations (6 platforms) | ❌ | ❌ | ❌ |
| GPS / live run tracking | ❌ | ❌ | ❌ |
| AI workout generation | ❌ | ❌ | ❌ |
| Social (likes, follows, kudos) | ❌ | ❌ | ❌ |
| Subscription tiers / Stripe | ❌ | ❌ | ❌ |
| Deep linking | ❌ | ❌ | ❌ |
| Profile photo upload | ❌ | ❌ | ❌ |
| Data export | ❌ | ❌ | ❌ |
| Gear store | ❌ | ❌ | ❌ |
| Training plans | ❌ | ❌ | ❌ |
| Challenge system | ❌ | ❌ | ❌ |
| Social activity feed | ❌ | ❌ | ❌ |

---

## REMAINING CRITICAL GAPS

These are issues that block shipping, cause runtime errors, or represent major competitive moat gaps.

### 🔴 Critical (Blocker / Runtime Bug)
1. **`recovery_logs` and `nutrition_logs` tables missing from DB** — CalendarScreen queries both but FORGE-FIXES-V2.md only created `meal_logs` and `supplement_logs`. Recovery saves will fail silently. Nutrition calendar dots will never appear. This is a silent runtime bug that makes two-thirds of the Calendar screen non-functional. Fix: create both tables with correct schema and RLS, OR reroute Calendar Nutrition queries to `meal_logs`.

2. **Units propagation incomplete** — `ProfileContext` and WorkoutScreen are fixed. `ProgressScreen.WeightLineChart` hardcodes "Min: X lbs / Max: X lbs". `RunScreen` header stats don't use `weightLabel`. Users who switch to kg will see a mix of units. Fix: pass `weightLabel` to WeightLineChart, import `useProfile()` in RunScreen.

### 🟡 Major (Competitive Moat Gaps)
3. **GPS / live run tracking absent** — Without `expo-location` + background task, At0m Fit is a manual run logger. Strava, NRC, Garmin all auto-track. Every serious runner will continue to use another app for this. This is the single feature that, if shipped, would justify switching from Strava for casual runners.

4. **AI workout generation absent** — The PRD's primary differentiator. Daily goal AI infrastructure (GPT-4o-mini, `generateDailyGoal()`, profile data + training history) is all there. Extending it to output a full exercise list with sets/reps is the natural next step. Without it, At0m Fit is indistinguishable from Hevy on the AI angle.

5. **Exercise library depth** — 104 exercises is a meaningful step up from 8 templates but Hevy has 1,000+. Users will hit the ceiling on a second workout. The search infrastructure is built — the content needs to grow.

6. **No subscription / Stripe** — PRO tier is referenced throughout the UI (upgrade prompts, PRO badges, feature gates) but there's no mechanism to actually become PRO. Free users are prompted to upgrade but can't. This undermines the PRO gate credibility.

### 🟢 Notable Gaps (No Blocker, But Noted)
7. Previous performance in WorkoutScreen still queries `exercises.weight_lbs` (first-set summary) — not `exercise_sets` for the heaviest set in history.
8. Rest timer preference not persisted between sessions.
9. CalendarScreen not in main tab bar.
10. ProgressScreen received zero improvements in V3.

---

## WHAT'S LEFT TO REACH B+ OVERALL (7.5+)

To move from B / 7.1 to B+ / 7.5, the portfolio average needs to rise by 0.4 points across all screens. The path is clear:

| Action | Impact on Overall |
|---|---|
| Fix DB tables for Calendar (recovery_logs, nutrition_logs) | +0.3 (Calendar B → B+) |
| Improve ProgressScreen to B- (react-native-svg chart, 30D/90D mileage toggle, heatmap) | +0.2 (weakest screen fixed) |
| Complete units propagation in ProgressScreen + RunScreen | +0.1 (fixes incomplete V3 feature) |
| Add Stripe / Pro subscription (even basic) | +0.1 (unlocks gates that exist but can't be activated) |
| AI workout generation | +0.3 (WorkoutScreen B+ → A-) |

**The shortest path to B+:** Fix Calendar tables + improve ProgressScreen + complete units propagation. That's achievable in a single focused pass without any external API integrations.

**The path to A-:** GPS + AI workout generation. Those two features transform the competitive positioning entirely.

---

## QUICK WINS FOR NEXT PASS (Sub-1-Day Builds)

| Win | Effort | Impact | Screen |
|---|---|---|---|
| Create `recovery_logs` table in Supabase | 30 min | **Critical** | Calendar |
| Create `nutrition_logs` table OR reroute Calendar to query `meal_logs` | 1 hour | **Critical** | Calendar |
| Fix units propagation in ProgressScreen WeightLineChart | 30 min | High | Progress |
| Fix units propagation in RunScreen header stats | 30 min | High | Run |
| Add 30D/90D toggle to ProgressScreen mileage chart | 1 hour | Medium | Progress |
| Replace custom line chart with react-native-svg polyline | 3 hours | High | Progress |
| Add Calendar to main tab bar | 30 min | Medium | Navigation |
| Wire CalendarScreen nutrition panel to meal_logs | 1 hour | High | Calendar |
| Personalized macro targets from profile in NutritionScreen | 2 hours | High | Nutrition |
| Token explanation tooltip on Compete/Leaderboard | 30 min | Medium | Compete |
| Deep link handler for password reset | 3 hours | High | Auth |
| Persist rest timer preference to AsyncStorage | 1 hour | Medium | Workout |
| Fix previous performance to query exercise_sets heaviest set | 1 hour | Medium | Workout |
| Water intake tracker in NutritionScreen | 2 hours | Medium | Nutrition |
| Inline email validation on ForgotPasswordScreen | 30 min | Low | ForgotPassword |

---

## OVERALL V3 ASSESSMENT

### New Overall Grade: B / 7.1/10 *(was C+ / 6.5 in V2, D+ / 4.5 in V1)*

Three passes, three thresholds:
- **V1 (D+):** Beautiful design, non-functional features. A skeleton.
- **V2 (C+):** Functional MVP. A real user could train with it.
- **V3 (B):** Competitive product with genuine screen depth. A user comparing this to Hevy would find it interesting — not identical, but interesting.

The V3 app now covers the full daily training workflow: set an AI goal on Home → log a workout with rest timer and 104-exercise library → log a run with mileage history → track macros and supplements in Nutrition → check your calendar for recovery and training history → see where you rank on the leaderboard → review your PRs and body weight trend in Progress → manage your profile metrics and units. That's a real product loop.

The B ceiling is held by three things: the silent Calendar DB bug, the stagnant ProgressScreen, and the absent revenue model. Fix those three and this is a B+ app. Add GPS and AI workout generation and you're competing for A-.

The bones are excellent. The muscles are showing. Now it needs nervous system — the intelligence layer (AI generation, personalized macros, recovery readiness scoring) that makes At0m Fit a coach rather than just a log.

---

## FINAL V3 SCORECARD

| Screen / Feature | V1 | V2 | V3 |
|---|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 | B+ / 7.5 |
| Login Screen | B- / 6.0 | B+ / 7.5 | **A- / 8.0** |
| Sign Up Screen | C / 5.0 | C+ / 6.0 | **B / 7.0** |
| Home Screen | C+ / 5.5 | B- / 6.5 | **B / 7.0** |
| Workout Screen | D+ / 4.0 | B- / 6.5 | **B+ / 7.5** |
| Run Screen | B- / 6.5 | B / 7.0 | **B+ / 7.5** |
| Progress Screen | D+ / 4.0 | C+ / 6.0 | C+ / 6.0 |
| Profile Screen | D / 3.5 | C+ / 6.0 | **B / 7.0** |
| ForgotPassword Screen | ❌ / — | B / 7.0 | B / 7.0 |
| Nutrition Screen | ❌ / — | ❌ / — | **B- / 6.5** (NEW) |
| Leaderboard / Compete | ❌ / — | ❌ / — | **B- / 6.5** (NEW) |
| Calendar Screen | ❌ / — | ❌ / — | **B / 7.0** (NEW) |
| Navigation Architecture | C / 5.0 | C+ / 5.5 | **B- / 6.5** |
| Design System | A- / 8.5 | A- / 8.5 | A- / 8.5 |
| **OVERALL** | **D+ / 4.5** | **C+ / 6.5** | **B / 7.1** |

---

*Report generated by At0m Prime QC | 2026-03-14 | v3*
