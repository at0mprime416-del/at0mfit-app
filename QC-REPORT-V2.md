# ⚛️ AT0M FIT — QC REPORT V2
**Analyst:** At0m Prime (Senior Product QC)  
**Date:** 2026-03-14  
**Version Reviewed:** 1.1 (post-Forge QC fixes)  
**Previous Version:** 1.0 — D+ / 4.5/10  
**Benchmarks:** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong

---

## GRADE COMPARISON TABLE

| Screen / Feature | V1 Grade | V1 Score | V2 Grade | V2 Score | Delta |
|---|---|---|---|---|---|
| Splash Screen | B | 7.0 | B+ | 7.5 | ↑ +0.5 |
| Login Screen | B- | 6.0 | B+ | 7.5 | ↑ +1.5 |
| Sign Up Screen | C | 5.0 | C+ | 6.0 | ↑ +1.0 |
| Home Screen | C+ | 5.5 | B- | 6.5 | ↑ +1.0 |
| Workout Screen | D+ | 4.0 | B- | 6.5 | ↑ +2.5 |
| Run Screen | B- | 6.5 | B | 7.0 | ↑ +0.5 |
| Progress Screen | D+ | 4.0 | C+ | 6.0 | ↑ +2.0 |
| Profile Screen | D | 3.5 | C+ | 6.0 | ↑ +2.5 |
| ForgotPassword Screen | ❌ N/A | — | B | 7.0 | NEW |
| Navigation Architecture | C | 5.0 | C+ | 5.5 | ↑ +0.5 |
| Design System (components/theme) | A- | 8.5 | A- | 8.5 | → 0 |
| **OVERALL APP** | **D+** | **4.5/10** | **C+** | **6.5/10** | **↑ +2.0** |

---

## EXECUTIVE SUMMARY

The Forge fix pass delivered **30 individual changes across 7 screens and 4 DB tables**. The most important — set-by-set workout logging, body weight tracking, real streak calculation, AI daily goals, and functional profile settings — are all confirmed in code and represent genuine product progress, not just polish.

**The app is now a functional MVP.** V1 was a skeleton. V2 can actually be used by a real user for real training. That's the threshold that matters.

The ceiling on the grade is still the volume of unbuilt PRD features (GPS tracking, exercise library, full onboarding, social, wearables, nutrition). Those aren't regression — they were never built. The grade jump from D+ to C+ reflects what was actually delivered, not what was planned.

**Overall App Grade: C+ | 6.5 / 10**  
*(as a competitive product — B- / 7.0 as a functional MVP for continued development)*

---

## SCREEN-BY-SCREEN RE-GRADES

---

### 1. SPLASH SCREEN
**V2 Grade: B+ | 7.5/10** *(was B | 7/10)*

#### ✅ What Improved
- `ActivityIndicator` appears after 1.5 seconds if auth hasn't resolved — **confirmed in code**. The `spinnerTimer` setTimeout pattern is correct, the timer is cleared on auth resolution, and the spinner disappears before navigation. This was the most practical fix on this screen.

#### ❌ Still Missing
- No background animation (atom orbit rings, particle effect) — screen is static
- No biometric/Face ID shortcut on return visits — out of scope but noted
- No offline detection — no "No connection" message if `getSession` fails due to network

#### 🔧 Top 3 Remaining Improvements
1. **Subtle atom animation** — low-opacity orbit ring that rotates on loop. Purely cosmetic but sets premium tone before anything loads.
2. **Offline detection** — wrap the `getSession` call in a try/catch and navigate to Login with an inline "Offline mode — some features unavailable" banner
3. **Biometric auth** — `expo-local-authentication` for FaceID/TouchID on return visits; pass-through if not enrolled

---

### 2. LOGIN SCREEN
**V2 Grade: B+ | 7.5/10** *(was B- | 6/10)*

#### ✅ What Improved
- **Show/Hide password toggle** — confirmed. `secureTextEntry={!showPassword}` pattern, 🙈/👁 toggle, proper `hitSlop` for touch target. Clean.
- **Humanized error messages** — confirmed. `humanizeAuthError()` function maps `Invalid login credentials`, `Email not confirmed`, and network errors to plain English. Catches the most common failure paths.
- **Forgot Password link** — confirmed. `navigation.navigate('ForgotPassword')`. This was the #1 table-stakes gap in V1.

#### ❌ Still Missing
- No social login (Apple/Google) — requires native modules, not in scope
- No biometric login option
- No inline field validation (errors are still Alert dialogs, not inline red text)
- Password field on SignUp doesn't have the show/hide toggle (inconsistency)

#### 🔧 Top 3 Remaining Improvements
1. **Inline field validation** — move from Alert dialogs to inline red error text below each field. Every major app (Nike, Strava, MyFitnessPal) uses inline errors; Alerts feel outdated
2. **Biometric option** — "Use Face ID" button for returning users who've enrolled
3. **Social login** — Apple Sign In first (mandatory for iOS apps with third-party login per App Store guidelines if added later)

---

### 3. SIGN UP SCREEN
**V2 Grade: C+ | 6/10** *(was C | 5/10)*

#### ✅ What Improved
- **Confirm password field** — confirmed. Real-time inline mismatch detection (`confirmError` state, red border via `inputError` style). Prevents typo lockouts.
- **Terms of Service checkbox** — confirmed. Required to submit. Custom checkbox with gold checkmark, `tosAccepted` state, correct blocking logic.
- **Smart redirect** — confirmed. `if (data.session) navigation.replace('Main')` vs. email confirm prompt + navigate to Login. Correct for both dev (auto-confirm) and prod flows.

#### ❌ Still Missing
- No show/hide password toggle on the password fields (inconsistency with LoginScreen)
- Full 9-screen onboarding still absent — physical metrics (age/weight/height/fitness level), equipment, gym link, wearable setup — all deferred to Profile post-signup
- No email format client-side validation before submit
- No social sign-up (Apple/Google)
- ToS link is display-only — tapping it does nothing (no modal or browser open)

#### 🔧 Top 3 Remaining Improvements
1. **Add show/hide password toggle** — same `showPassword` pattern from LoginScreen. Parity between screens is basic UX consistency
2. **Make ToS link tappable** — open a WebBrowser or Modal with the actual terms. A checkbox for terms that doesn't show terms is a legal gray area
3. **Add physical metrics as step 2** — age, weight, height, fitness level. Even a simple second step card unlocks AI personalization from day one

---

### 4. HOME SCREEN (Dashboard)
**V2 Grade: B- | 6.5/10** *(was C+ | 5.5/10)*

#### ✅ What Improved
- **Rotating motivational quotes** — confirmed. 25 quotes from Goggins, Ali, Willink, Lee, and others. `getDailyQuote()` uses `date.getDate() % array.length` for stable daily rotation. Not random each load — same quote holds all day, which is the right behavior.
- **Real streak calculation** — confirmed. Proper backward-walking algorithm: build a `Set` of workout days, walk backwards from today (or yesterday if no workout today), count consecutive days with entries. This is now correct streak logic matching Duolingo/MyFitnessPal behavior.
- **AI Daily Goal card** — confirmed. `generateDailyGoal()` calls GPT-4o-mini with last 14 days of runs and workouts, returns structured JSON (goal_type, description, target, reasoning, token reward). Persists to `daily_goals` table. Shows reasoning text. MARK COMPLETE button awards tokens. **This is genuinely the biggest feature addition in the entire pass** — the PRD differentiator starting to come alive.
- **Team context in goal card** — confirmed. If user is in a team, goal card shows "→ Team Name" for token contribution.

#### ❌ Still Missing
- No wearable data (HRV, sleep score, recovery readiness) — WHOOP/Garmin's primary value
- No nutrition summary (macros remaining, calories)
- No quick action buttons (log meal, log water, log body weight directly from dashboard)
- Weekly stats row still missing total volume (lbs lifted this week)
- No team activity feed (who trained, who hit goals today)
- AI goal generation will silently fail if no OpenAI API key is configured — no graceful fallback goal

#### 🔧 Top 3 Remaining Improvements
1. **Fallback goal when AI is unavailable** — if `EXPO_PUBLIC_OPENAI_API_KEY` is empty or the call fails, generate a deterministic goal from profile data (rest day if 6+ workouts this week, run if no runs this week, etc.)
2. **Quick-log weight button** — a single-tap weight entry on the dashboard, since body weight logging is now a core feature. Saves a navigation to ProgressScreen
3. **Weekly volume in stats row** — replace the streak emoji with a volume number (total lbs this week). Data is in the DB; one additional query

---

### 5. WORKOUT SCREEN — MAJOR REBUILD
**V2 Grade: B- | 6.5/10** *(was D+ | 4/10 — the biggest grade jump)*

#### ✅ What Improved
This is the most impactful change in the entire Forge pass.

- **Set-by-set logging** — confirmed. `ExerciseCard` + `SetRow` components. Each set has weight + reps inputs, a checkmark toggle (turns green with `setCheckBtnDone` style when done), and a remove button. `+ ADD SET` button adds new rows. This is how Hevy works. This is how serious lifters train.
- **Session timer** — confirmed. `timerBar` header shows `SESSION` label + `MM:SS` countdown that starts on screen mount via `setInterval`. Live update. Correct cleanup on unmount.
- **Total volume display** — confirmed. Calculated as `sum(weight × reps)` across all sets, displayed in the timer bar (`Vol: X,XXX lbs`) AND in a `volumeRow` card above the save button. Math is correct.
- **Notes field per exercise** — confirmed. Multiline `TextInput` below each exercise's sets. Saves to `exercises.notes` column.
- **Previous performance** — confirmed. `fetchLastPerformance(name)` queries `exercises` joined to `workouts` for the current user, orders by date desc, returns formatted string `"185 × 5 × 3"`. Displayed as `lastPerf` italic text under exercise name.
- **Dual save pattern** — confirmed. Saves exercise summary to `exercises` table AND individual set rows to `exercise_sets` table. Correct schema usage.

#### ❌ Still Missing
- No rest timer (not in scope for this pass — confirmed in FORGE-FIXES.md)
- No RPE/RIR field per set
- Exercise library is still 8 hardcoded templates — no search, no browse, no muscle group filter
- No 1RM auto-calculation (Brzycki/Epley from heaviest set)
- No superset/circuit support
- No workout template save/load
- AI workout generation still absent (separate feature)
- Previous performance only pulls from `exercises` table summary, not from `exercise_sets` — so it reflects first-set data only, not the heaviest set
- Delete-then-reinsert pattern still used — a mid-save network failure would still leave corrupt data

#### 🔧 Top 3 Remaining Improvements
1. **Rest timer** — Modal countdown triggered when a set is checked complete. Start with fixed options: 60s / 90s / 120s / 180s. This is the #1 quality-of-life feature for serious lifters after set-by-set logging.
2. **1RM auto-calculation** — Show estimated 1RM below the exercise name alongside the previous performance. `1RM = weight × (1 + reps/30)` (Epley). One line of math, huge motivational impact.
3. **Fix previous performance source** — Query `exercise_sets` for the heaviest single set in the user's history for that exercise name, not the summary `exercises.weight_lbs` (which is first-set only). Gives more accurate reference.

---

### 6. RUN SCREEN
**V2 Grade: B | 7/10** *(was B- | 6.5/10)*

#### ✅ What Improved
- **Custom date picker UI** — confirmed. `formatDateLong(selectedDate)` shows "Saturday, March 14". `← Yesterday` and `Today →` nav buttons with `disabled` state when already today. Manual text input fallback for arbitrary dates. This is significantly better UX than the raw YYYY-MM-DD text field it replaced.
- **Weekly mileage bar chart** — confirmed. Last 7 days of mileage as blue bars using the shared `BarChart` component. Shows on RunScreen when there's data. Good context at a glance.
- **Filter chips** — confirmed. `All | Outdoor | Indoor` chips above history list. Filters by `run.type.toLowerCase().includes()`. Works correctly.

#### ❌ Still Missing
- No GPS/live tracking — still the single biggest competitive gap vs. Strava/NRC
- No route map display
- No mile splits input
- No heart rate zones breakdown (Z1-Z5 from avg HR)
- No VO2 max estimation
- No shoe mileage tracker
- Weekly chart is 7 days only — no toggle for 30D/90D (Progress screen has this, Run screen doesn't)
- No training plan integration
- Duration display on history cards doesn't show elapsed time — only pace

#### 🔧 Top 3 Remaining Improvements
1. **Show duration on history cards** — add `duration_seconds` formatted as `H:MM:SS` to the `RunCard`. Total time is in the DB. Runners care about both total time and pace.
2. **Add 30D/90D toggle to weekly mileage chart** — same pattern already built in ProgressScreen. Reuse the component.
3. **Mile splits field** — repeating input where user can log per-mile splits. Serious runners live by their splits. Even manual entry is better than nothing.

---

### 7. PROGRESS SCREEN
**V2 Grade: C+ | 6/10** *(was D+ | 4/10)*

#### ✅ What Improved
- **Body weight logging** — confirmed. `LOG WEIGHT` section at top of screen. Numeric input + SAVE button. `supabase.upsert()` with `onConflict: 'user_id,date'` means one entry per day, no duplicates. Success alert confirms weight logged.
- **30-day body weight line chart** — confirmed. Custom SVG-less implementation using positioned `View` components. Dots are correctly positioned using normalized coordinates. Connecting lines use `transform: rotate` — FORGE-FIXES.md correctly notes that `transformOrigin` is unsupported on RN native, so lines may render incorrectly on device. Dots-only still convey the trend.
- **Time range toggle (7D/30D/90D)** — confirmed. `RANGE_OPTIONS` array with `TouchableOpacity` toggle buttons. `volumeRange` state drives query window in `loadProgress()`. Range labels adjust appropriately (weekly day letters for 7D, month/day shorthand for 30D+).
- **Weekly mileage chart** — confirmed. Blue bar chart of last 7 days of run mileage. Conditionally rendered when data exists.
- **PR sets×reps display** — confirmed. `PRRow` component shows `"225 lbs"` + `"3×8"` below it. Context makes the PR meaningful.

#### ❌ Still Missing
- Body weight line chart connecting lines unreliable on device (`transformOrigin` issue) — needs `react-native-svg` or `victory-native` for production
- No body composition tracking (body fat % trend)
- No strength standards comparison (Novice/Intermediate/Advanced/Elite per lift)
- No training frequency heatmap (GitHub commit-style calendar)
- No calendar view of workout days
- PR system uses `exercises.weight_lbs` max (raw first-set weight), not estimated 1RM
- Active Days consistency card still counts bar chart non-zero days, not consecutive days
- No way to delete an incorrect weight log entry

#### 🔧 Top 3 Remaining Improvements
1. **Replace custom line chart with `react-native-svg` implementation** — the dot-only chart works as a placeholder, but connecting lines are the visual signal users expect. `react-native-svg` is already likely in the Expo SDK.
2. **Add 30D/90D toggle to weekly mileage chart** — currently mileage is always 7-day only. Give it the same range control as the volume chart.
3. **Training frequency heatmap** — 12-week rolling calendar of workout days (green dots = trained, empty = rest). Garmin Connect and Hevy both do this. Extremely motivating visual.

---

### 8. PROFILE SCREEN
**V2 Grade: C+ | 6/10** *(was D | 3.5/10)*

#### ✅ What Improved
- **Non-functional Dark Mode switch removed** — confirmed. Replaced with `<Text style={styles.settingValue}>Dark ⚫</Text>`. Trust restoration complete. A broken control is worse than a missing one.
- **Functional units toggle** — confirmed. `TouchableOpacity` taps between `lbs` and `kg` with visual active state (`unitsOptionActive` style). Saves `preferred_units` to `profiles` table. Both options visible simultaneously with clear highlighting.
- **Goal editing modal** — confirmed. "Edit Goal" button in section header opens a bottom-sheet `Modal`. Same 5-goal chip grid from SignUpScreen. Saves to `profiles.goal`. Cancel without saving works correctly.
- **Physical metrics section** — confirmed. Displays weight/height/age in a clean 3-column row. "Edit" toggles to form with ft/in height inputs. Saves to `profiles.weight_lbs`, `profiles.height_inches`, `profiles.age`. Pre-fills from existing profile on load.

#### ❌ Still Missing
- Units preference saves to DB but **does not propagate to the rest of the app** — WorkoutScreen still shows "lbs" labels regardless of setting
- No profile photo upload (still letter avatar)
- No body fat % in physical metrics (important for AI personalization)
- No fitness level field (beginner/intermediate/advanced)
- No subscription status display (Free/Pro)
- No wearable devices section
- No notification preferences
- No data export
- No account deletion option (required by App Store guidelines)
- Email is read-only with no change mechanism

#### 🔧 Top 3 Remaining Improvements
1. **Propagate units preference throughout the app** — create a `useUnits()` hook or Context that reads `profile.preferred_units` and applies it in WorkoutScreen, ProgressScreen, and RunScreen. Currently the setting is cosmetic.
2. **Add account deletion** — App Store and Google Play both require it as of recent policy updates. `supabase.auth.admin.deleteUser()` or a server-side edge function. Without it the app cannot ship to production.
3. **Add fitness level to physical metrics** — Beginner/Intermediate/Advanced dropdown. This single field unlocks meaningful AI workout generation differentiation (progressive overload calibration).

---

### 9. FORGOT PASSWORD SCREEN (NEW)
**V2 Grade: B | 7/10** *(was ❌ absent)*

#### ✅ What It Does Well
- Clean, branded design — consistent with LoginScreen (same atom icon, same label/input styles)
- Correct Supabase call: `supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())`
- Rate limit error handling — specific message for rate limit vs. generic fallback
- Success alert with `goBack()` callback — clean flow
- Correct `keyboardType="email-address"` and `autoCapitalize="none"`

#### ❌ Missing vs. Competitors
- No inline email validation before submit — empty field shows Alert, which is fine, but malformed addresses get sent to Supabase anyway
- No deep link handler for the password reset URL — when user clicks the email link, they land in the browser, not the app. Requires `expo-linking` + Supabase `redirectTo` config to bring them back into the app for the reset form.
- No "Resend" option after sending — if user doesn't get the email, they must go back and resubmit with no confirmation of the re-send

#### 🔧 Top 3 Remaining Improvements
1. **Implement deep link handler** — configure `supabase.auth.resetPasswordForEmail()` with `redirectTo: 'at0mfit://reset-password'` and add a `ResetPassword` screen that handles the URL token. Without this, the reset flow ends in a browser.
2. **Inline email format validation** — simple regex check before calling Supabase, shows inline error text
3. **Resend / countdown** — show a "Resend in 60s" countdown after first send, with a resend button

---

## COMPONENTS & DESIGN SYSTEM

### Card.js | GoldButton.js | Theme
**Grade: A- | 8.5/10** *(unchanged from V1)*

No changes to the design system components — they remain clean and well-structured. The new screens (ForgotPassword) correctly inherit and use the existing component library. Consistency is maintained.

Still missing: typography scale tokens, spacing scale, icon button support in GoldButton, shadow variant for Card.

---

## NAVIGATION ARCHITECTURE

**V2 Grade: C+ | 5.5/10** *(was C | 5/10)*

#### What Improved
- `ForgotPassword` screen is now properly registered and wired in the Stack navigator — confirmed. Auth flow is complete: Login → ForgotPassword → back to Login.

#### Still Missing
- Same structural gaps as V1: no Competition tab, no Teams/Feed tab, no Gear Store
- No deep linking configuration (`expo-linking` not set up)
- No notification routing
- PRD calls for a more complex navigation architecture — current flat tab structure will need rework as features grow

---

## FEATURES STATUS vs. PRD

| PRD Feature | V1 Status | V2 Status |
|---|---|---|
| Full 9-screen onboarding | ❌ Screen 1 only | ❌ Still partial (metrics in Profile) |
| Liability waiver | ❌ | ✅ ToS checkbox on signup |
| AI workout generation | ❌ | ❌ Not yet (daily goal AI is live) |
| AI daily goal | ❌ | ✅ GPT-4o-mini live |
| Forgot Password | ❌ | ✅ Built and wired |
| Set-by-set workout logging | ❌ | ✅ Full ExerciseCard/SetRow |
| Session timer | ❌ | ✅ Live MM:SS |
| Total volume display | ❌ | ✅ Per-session |
| Previous performance | ❌ | ✅ "Last: X × Y × Z" |
| Body weight tracking | ❌ | ✅ Log + 30-day chart |
| Time range toggle on charts | ❌ | ✅ 7D/30D/90D |
| Weekly mileage chart | ❌ | ✅ Both Run + Progress screens |
| Run filter chips | ❌ | ✅ All/Outdoor/Indoor |
| Physical metrics in Profile | ❌ | ✅ Weight/height/age |
| Goal editing in Profile | ❌ | ✅ Modal chip selector |
| Functional units toggle | ❌ | ✅ Saves to DB |
| Real streak calculation | ❌ | ✅ Consecutive days |
| Rotating quotes | ❌ | ✅ 25-quote daily rotation |
| Wearable integrations (6 platforms) | ❌ | ❌ Not built |
| Competition / leaderboard system | ❌ | ❌ Not built |
| Teams + group chat + DMs | ❌ | ❌ Not built |
| Nutrition / meal logging | ❌ | ❌ Not built |
| Supplement tracker | ❌ | ❌ Not built |
| News feed | ❌ | ❌ Not built |
| Gear store | ❌ | ❌ Not built |
| GPS / live run tracking | ❌ | ❌ Not built |
| Rest timer | ❌ | ❌ Not built |
| Exercise library | ❌ | ❌ Not built (8 templates only) |
| Push notifications | ❌ | ❌ Not built |
| Subscription tiers / Stripe | ❌ | ❌ Not built |
| Social features (likes, follows, kudos) | ❌ | ❌ Not built |
| Account deletion | ❌ | ❌ Not built |

---

## OVERALL RE-ASSESSMENT

### New Overall Grade: C+ | 6.5/10 *(was D+ | 4.5/10)*

The app crossed a meaningful threshold: it went from a designed skeleton to a functional training tracker. A user can now:
- Create an account with a real password safety net
- Log daily body weight and see a 30-day trend
- Run a full workout session with set-by-set tracking, see their timer, and check sets off as they go
- Review their previous performance mid-session
- See their actual streak and a daily AI goal on the dashboard
- Track runs with a proper date picker and mileage chart
- Edit their physical profile and goal from the Profile screen

That's meaningful. V1 couldn't do most of that.

The C+ ceiling reflects the gap between current state and competitive parity. The benchmarks (Hevy, Strava, MyFitnessPal, WHOOP) still do significantly more. A user choosing between At0m Fit and Hevy today would still choose Hevy — until the exercise library, rest timer, and AI workout generation ship.

---

## TOP 5 REMAINING PRIORITIES

### 🥇 Priority #1: Rest Timer
**Effort:** 1 day | **Impact:** Very High | **Competitive parity with:** Hevy, Strong, Gravity

Triggered when a set is checked ✓ in WorkoutScreen. Modal with 60s/90s/120s/180s countdown. Auto-dismisses when timer hits zero. This is the single feature that separates "casual workout logger" from "serious training app" in user perception. At0m Fit has the set-by-set logging now — the rest timer is the natural next step.

### 🥇 Priority #2: Exercise Library / Search
**Effort:** 2–3 days | **Impact:** Very High | **Competitive parity with:** Hevy (1,000+ exercises), Strong

Replace the 8 hardcoded templates with a searchable exercise library. Database table: `exercises_library(id, name, muscle_group, equipment, description)`. In WorkoutScreen: search input → results list → tap to add. Hevy built an entire company on the depth of their exercise library. At0m needs at minimum 100+ exercises across major muscle groups.

### 🥇 Priority #3: AI Workout Generation
**Effort:** 3–5 days | **Impact:** Very High (PRD differentiator)

The daily goal AI is live — the infrastructure is there. Extend it to generate a complete workout: exercise selection based on goal + last workouts + physical metrics + user history. Generate as a structured JSON with exercise names, target sets/reps/weight. Load directly into WorkoutScreen. This is what justifies the Pro subscription and what separates At0m Fit from every manual-entry competitor.

### 🥈 Priority #4: Account Deletion
**Effort:** 4 hours | **Impact:** Critical (App Store requirement)

Apple and Google both require account deletion in apps that support user account creation (effective 2022/2023 policy). Without this, the app **cannot be submitted to either app store**. Supabase edge function + `supabase.auth.admin.deleteUser(userId)` + cascade delete of all user data + confirmation Alert. This is a blocker for shipping.

### 🥈 Priority #5: Units Propagation
**Effort:** 4 hours | **Impact:** Medium

The units preference now saves correctly to `profiles.preferred_units`. But WorkoutScreen, ProgressScreen, and RunScreen all hardcode "lbs" labels. Create a `useProfile()` context hook that exposes `preferred_units`, and apply it as the label throughout all input forms and displays. The feature is half-built — finish it.

---

## WHAT STILL NEEDS TO BE BUILT TO REACH A TIER

An A-tier fitness app requires:

1. **Live GPS run tracking** — Strava's entire value proposition. Requires `expo-location` + background tasks. Non-negotiable for run tracking to be competitive.
2. **Exercise library (500+ exercises)** — Searchable, filterable by muscle group and equipment. GIF/image demonstrations. This is Hevy's moat.
3. **Full AI workout generation** — Not just daily goals but a complete periodized program. The daily goal AI is a proof of concept — scale it to full workout output.
4. **Social layer** — Teams, leaderboards, kudos/reactions on workouts, activity feed. Strava and Hevy both retain users through social accountability.
5. **Wearable integrations** — Apple Health, WHOOP, Garmin Connect. HRV, sleep, and recovery scores on the dashboard change the entire value proposition.
6. **Nutrition tracking** — Macro calculator + meal logging. MyFitnessPal's entire user base is there for macro tracking. A fitness app that ignores nutrition covers half the picture.
7. **Subscription tiers + Stripe** — The revenue model. Without it the app has no business.
8. **Push notifications** — Streak reminders, goal completion nudges, rest day suggestions. Habit formation requires push.
9. **Competition / leaderboard system** — The PRD's true differentiator. Verified performance rankings across user-defined distances/lifts.
10. **Complete onboarding** — The 9-screen flow that collects fitness level, equipment access, training availability, and wearable credentials. Without this data, AI personalization is guessing.

---

## QUICK WINS FOR NEXT PASS (Sub-1-Day Builds)

| Win | Effort | Impact |
|---|---|---|
| Rest timer in WorkoutScreen | 4 hours | Very High |
| Account deletion in ProfileScreen | 4 hours | Critical (App Store blocker) |
| Units propagation via context | 4 hours | Medium |
| Deep link handler for password reset | 3 hours | High (UX completion) |
| Show/hide password on SignUpScreen | 30 min | Low (parity fix) |
| 30D/90D toggle on Run mileage chart | 1 hour | Medium |
| 1RM auto-calc in WorkoutScreen | 1 hour | High |
| Quick-log weight from HomeScreen | 2 hours | Medium |
| ToS link opens actual terms | 1 hour | Medium (legal) |
| Fitness level field in Profile metrics | 1 hour | High (AI unlock) |

---

## FINAL V2 SCORECARD

| Screen / Feature | V1 | V2 |
|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 |
| Login Screen | B- / 6.0 | B+ / 7.5 |
| Sign Up Screen | C / 5.0 | C+ / 6.0 |
| Home Screen | C+ / 5.5 | B- / 6.5 |
| Workout Screen | D+ / 4.0 | **B- / 6.5** |
| Run Screen | B- / 6.5 | B / 7.0 |
| Progress Screen | D+ / 4.0 | C+ / 6.0 |
| Profile Screen | D / 3.5 | **C+ / 6.0** |
| ForgotPassword Screen | ❌ / — | B / 7.0 |
| Navigation Architecture | C / 5.0 | C+ / 5.5 |
| Design System | A- / 8.5 | A- / 8.5 |
| **OVERALL** | **D+ / 4.5** | **C+ / 6.5** |

---

## BOTTOM LINE

Forge delivered. The grade jump from D+ to C+ (+2.0 points) is earned. The Workout screen's D+ → B- transformation is the headline — set-by-set logging is the core of any serious lifting app and it's now live. The Profile screen's D → C+ jump reflects trust restoration (killing broken switches) plus meaningful new functionality.

The app's trajectory is clear: each pass adds 1.5–2.5 points by shipping the right features. **Rest timer + exercise library + AI workout generation = a realistic path to B+.** After that, social features and GPS push toward A.

The bones are still good. The muscles are starting to show.

---

*Report generated by At0m Prime QC | 2026-03-14 | v2*
