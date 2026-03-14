# ⚛️ AT0M FIT — QC REPORT
**Analyst:** At0m Prime (Senior Product QC)  
**Date:** 2026-03-14  
**Version Reviewed:** 1.0 (initial build)  
**Benchmarks:** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong

---

## EXECUTIVE SUMMARY

At0m Fit has a **clean design foundation and solid branding**, but the current build delivers roughly **15% of the PRD vision**. The screens that exist are functional and look good. The problem is everything that's *missing*. As a competitive fitness app it cannot yet stand next to Hevy, Strava, or MyFitnessPal. As an MVP scaffold it's a reasonable start. The gap between PRD ambition and current reality is enormous.

**Overall App Grade: D+ | 4.5 / 10**  
*(as a competitive product — B- / 6.5 as an MVP foundation for continued development)*

---

## SCREEN-BY-SCREEN GRADES

---

### 1. SPLASH SCREEN
**Grade: B | 7/10**

#### ✅ What it does well
- Polished fade-in + spring scale animation — looks premium
- Auth routing logic is correct (session check → Login or Main)
- Tagline lands: *"Train like an element. Perform at scale."*
- 2-second hold gives animation time to breathe

#### ❌ Missing vs. competitors
- No visual feedback if auth check hangs (network delay = frozen screen with no spinner)
- Static — no dynamic branding elements (particle effect, pulsing atom, etc.)
- No biometric/Face ID prompt on return visits
- No offline detection ("No connection — using cached data")

#### 🔧 Top 3 Improvements
1. **Add an ActivityIndicator** that appears after 1.5s if auth hasn't resolved — prevents frozen-screen anxiety
2. **Subtle background animation** (rotating atom orbit rings at low opacity) — sets the tone before anything loads
3. **Biometric auth shortcut** — on return visits, skip to FaceID/TouchID immediately instead of forcing manual login

---

### 2. LOGIN SCREEN
**Grade: B- | 6/10**

#### ✅ What it does well
- Clean, minimal — doesn't waste the user's time
- Correct keyboard type on email field, `autoCapitalize: none`
- Loading state on button is handled correctly
- "Welcome back, operator." — the voice is right

#### ❌ Missing vs. competitors
- **No "Forgot Password" link** — this is a basic table-stakes feature; every competitor has it
- **No social login** — Apple Sign In, Google — Nike Run Club, Strava, and every major app offers this; without it you lose a significant % of signups
- No biometric login option
- No "show password" eye toggle
- Error messages are raw Supabase strings — not user-friendly copy

#### 🔧 Top 3 Improvements
1. **Add "Forgot Password?" link** — one `navigation.navigate('ForgotPassword')` call + Supabase `resetPasswordForEmail()` — 1-hour build, massive UX impact
2. **Add "Show Password" eye icon** to the password input
3. **Humanize error messages** — map common Supabase errors to plain English ("Wrong password. Try again or reset it." instead of `Invalid login credentials`)

---

### 3. SIGN UP SCREEN
**Grade: C | 5/10**

#### ✅ What it does well
- Goal chip selector is clean and interactive
- Password length validation is correct
- Profile creation on sign up is the right pattern
- Layout is consistent with the rest of the app

#### ❌ Missing vs. competitors
- **PRD defines a 9-screen onboarding flow** — this is screen 1 only. Physical metrics (age/weight/height), training style, availability, equipment, gym link, wearable connection, and subscription are all completely absent
- No password confirmation field — users can mistype and get locked out
- No terms of service / liability waiver acceptance (legally required per PRD and arguably for any fitness app)
- No tagline/fitness identity field (feeds AI persona per PRD)
- Missing body fat %, fitness level, injuries, dominant hand — all required for AI workout generation
- No email format validation beyond Supabase
- Redirect after signup goes to Login, not directly into onboarding/app

#### 🔧 Top 3 Improvements
1. **Add password confirmation field** — prevents typo lockouts, standard UX
2. **Add a "Screen 2 of 2: Your Stats" step** collecting age/weight/height/fitness level — minimum viable data for AI workout generation (the app's core differentiator)
3. **Add liability waiver** before account creation — even a minimal checkbox "I accept the Terms of Service" — required to ship a fitness app

---

### 4. HOME SCREEN (Dashboard)
**Grade: C+ | 5.5/10**

#### ✅ What it does well
- Greeting with time-of-day detection is a nice touch
- Weekly stats row (sessions, exercises, streak emoji, run miles) gives a quick pulse check
- Last Run card on homepage bridges workout + cardio data well
- Pull-to-refresh is implemented correctly with gold tint
- Visual hierarchy is clean — gold section labels are readable

#### ❌ Missing vs. competitors
- **Static Jim Rohn quote** — hardcoded, never changes. WHOOP, Apple Fitness+, and Garmin show dynamic AI-generated daily insights. This should at minimum rotate from a quote array
- **No AI workout suggestion** — the PRD's core promise is "AI generates your first workout." The home screen should show *"Today's AI Workout: Upper Body A – Click to start"*
- **Streak card shows emoji, not a number** — `🔥 or 📈` based on `>= 4 workouts` is not a streak. A streak is consecutive days. This is misleading data
- No wearable data (HRV, sleep score, recovery readiness) — WHOOP and Garmin lead with this
- No nutrition summary (calories remaining, macros hit)
- No team activity feed
- No news headlines
- No quick action buttons beyond "Start Workout" (no "Log meal," "Log weight," "Log water")
- Weekly stats don't include total volume (lbs), calories burned, or body weight delta

#### 🔧 Top 3 Improvements
1. **Fix the streak** — calculate actual consecutive days with workouts logged and display a real number. This is the most misleading metric in the current app
2. **Rotate motivational quotes** — simple array of 20+ quotes, random selection on load. Static content is dead content
3. **Add "Today's AI Workout" placeholder card** — even if AI isn't built yet, mock the UI with a static "AI workout coming soon" card so users understand the value proposition

---

### 5. WORKOUT SCREEN
**Grade: D+ | 4/10**

#### ✅ What it does well
- Loads today's existing workout on open (correct UX)
- Quick-add templates for 8 common lifts are a nice time-saver
- Name input for the session is clean
- Save/update logic handles the create vs. update path correctly

#### ❌ Missing vs. competitors — this is the most critical gap in the app
- **No set-by-set tracking** — Hevy and Strong (the market leaders) track each set individually with its own weight and reps logged in real time. At0m Fit logs one static sets/reps/weight per exercise — not how serious lifters train. This is the #1 functional problem
- **No rest timer** — Hevy, Strong, Gravity all have a rest timer that starts automatically after logging a set. It's a core lifter workflow
- **No workout timer** — no elapsed session time display
- **No RPE/RIR field** — intermediate/advanced lifters rate perceived exertion per set; Hevy/Strong both support this
- **No exercise search/library** — only 8 hardcoded quick-add templates. Hevy has 1,000+ exercises with muscle group tags, equipment filters, GIF demonstrations
- **No 1RM calculation** — should auto-calculate estimated 1RM from sets x reps x weight (Brzycki/Epley formula)
- **No previous performance shown** — Strong's killer feature: "Last time you did Bench: 185x5x3". At0m shows nothing
- **No superset/circuit support**
- **No volume total per exercise** or per session
- **No notes per exercise**
- **No workout template saving**
- **No AI workout generation** (core PRD feature)
- Exercises are deleted and re-inserted on every save — this means partial saves can corrupt data

#### 🔧 Top 3 Improvements
1. **Build set-by-set logging** — replace the single sets/reps/weight inputs with a "+" button that adds logged set rows (each row: weight + reps, tap to complete). This is the fundamental data model that serious lifters need and that Hevy built their entire business on
2. **Add a rest timer** — triggered after each set is logged. Start with a simple 60/90/120/180-second countdown modal. One-day build, massive perceived quality lift
3. **Show previous performance** — query last workout containing this exercise and show "Last: 185×5" next to each exercise row. Requires zero new DB tables — the data is already there

---

### 6. RUN SCREEN
**Grade: B- | 6.5/10**

*This is the best-built screen in the app.*

#### ✅ What it does well
- Header stats (monthly miles, avg pace, last run date) are genuinely useful
- Form has the right fields: date, type, distance, duration (split min/sec), HR, cadence, elevation, notes
- Auto-calculates pace from distance + duration — correct math
- History cards display all key data cleanly (pace, HR, elevation, cadence per run)
- `formatPace()` utility is clean and reused across screens

#### ❌ Missing vs. competitors
- **No GPS/live tracking** — this is the single biggest gap vs. Strava and Nike Run Club. Manual entry only means the app can't compete for the primary use case (tracking runs as they happen)
- **No route map display** — even a static map of the route would add significant value
- **No mile splits** — Strava/Garmin show pace per mile for every run; this is expected data
- **No heart rate zones** — showing avg HR is basic; breaking it down by zone (Z1-Z5) is what endurance athletes want
- **No trend chart** — RunScreen has no visualization of pace/mileage over time. ProgressScreen doesn't include runs at all
- **No run type filter** on history list
- **No shoe mileage tracker** (Strava staple)
- **No training plan integration**
- **No VO2 max estimation**
- Date entry is raw text `YYYY-MM-DD` — should be a DatePicker component

#### 🔧 Top 3 Improvements
1. **Add a run trend chart** — weekly mileage bar chart (same pattern as ProgressScreen) specific to RunScreen. Data is already in the DB. 2-hour build
2. **Replace text date input with DateTimePicker** — using `@react-native-community/datetimepicker`, standard UX, eliminates bad date entries
3. **Add mile splits input** — a repeating field where users can enter splits (Mile 1: 8:30, Mile 2: 8:15...). Serious runners live by their splits

---

### 7. PROGRESS SCREEN
**Grade: D+ | 4/10**

#### ✅ What it does well
- Custom native bar chart (no charting library dependency) is technically clean
- PR tracker concept is correct — max weight per exercise name
- Consistency section (days active this week, tracked PRs) is a decent start

#### ❌ Missing vs. competitors
- **No body weight tracking** — the single most-tracked metric in any fitness app. MyFitnessPal, WHOOP, Garmin, Apple Health — all center around body weight over time. At0m has zero weight logging capability
- **Chart only shows 7 days** — no weekly/monthly/all-time toggle. Garmin Connect shows 1 day / 1 week / 4 weeks / 1 year for every metric
- **PRs are not 1RM estimates** — just raw max weight logged. A lifter who does 225×8 has a higher 1RM than someone who maxed 245×1 at an angle... the displayed PR is misleading without context (sets/reps shown alongside)
- **No run progress charts** — ProgressScreen ignores all run data despite a full RunScreen existing
- **No volume trend** (total weekly lbs lifted over time)
- **No body composition tracking** (weight + body fat % trend line)
- **No strength standards comparison** — Hevy shows where your lifts rank (Novice/Intermediate/Advanced/Elite) against population norms
- **No training frequency heatmap** (GitHub-style) — Hevy and Garmin both do this
- **No calendar view** of workout days

#### 🔧 Top 3 Improvements
1. **Add body weight logging** — a simple weight entry card (today's weight in lbs/kg) + a line chart of the last 30 days. New table: `body_weight_logs(user_id, date, weight_lbs)`. Half-day build, highest impact missing feature
2. **Add time range toggle** to the volume chart — 7 days / 30 days / 90 days. The data is there; just change the query window
3. **Show sets×reps alongside PR weight** — display "225 lbs — 3×8 — Jan 15" instead of just "225 lbs" — makes the PR actually meaningful

---

### 8. PROFILE SCREEN
**Grade: D | 3.5/10**

#### ✅ What it does well
- Lifetime stats (total sessions, total exercises) are pulled correctly
- Inline name editing with tap-to-edit is clean UX
- Sign out confirmation dialog is correct
- Letter avatar fallback is a reasonable placeholder

#### ❌ Missing vs. competitors
- **No physical metrics** — no weight, height, age, body fat % displayed or editable. These are *required* for AI workout generation per PRD
- **No goal editing** — goal is displayed but there's no way to change it from this screen
- **No profile photo** — only a letter avatar. Every competitor supports photo uploads
- **Dark mode toggle is non-functional** — a disabled Switch showing "Dark Mode: On" that does nothing. This is worse than hiding it — it communicates broken functionality
- **Units toggle is non-functional** — hardcoded "lbs" with no way to switch to kg
- **No subscription status** — no indication of Free/Pro/Creator tier
- **No wearable devices section**
- **No gym link**
- **No notification settings**
- **No data export**
- **No account deletion**
- Email is shown but not editable

#### 🔧 Top 3 Improvements
1. **Remove or fix the non-functional settings** — either build the Dark Mode toggle and Units toggle, or hide them. Broken UI elements destroy trust faster than missing features
2. **Add physical metrics section** — weight, height, fitness level as editable fields. Without this the AI system can never be built on top of the current data model
3. **Make goal editable** — same chip-selector from SignUpScreen, surfaced in Profile. 30-minute build

---

## COMPONENTS & DESIGN SYSTEM

### Card.js
**Grade: A- | 8.5/10**
- Clean, reusable, parameterized padding
- Consistent dark surface with subtle border
- Missing: press state variant, shadow variant for depth hierarchy

### GoldButton.js
**Grade: A | 9/10**
- Three variants (filled/outline/ghost) — all correctly implemented
- Loading state with ActivityIndicator — correct
- Disabled state — correct
- `activeOpacity: 0.75` — right feel
- Missing: icon support (left/right icon in button)

### Theme / colors.js
**Grade: A | 9/10**
- Deep black background (#0a0a0a) — premium feel, not "#000000 flat"
- Gold (#C9A84C) — warm, not gaudy. Distinctive
- Accent colors (electric blue #00d4ff, neon green #39ff14) — bold but not overused
- Missing: typography scale (no font size tokens), spacing scale, shadow tokens

---

## NAVIGATION ARCHITECTURE

**Grade: C | 5/10**

#### Current state
- Stack (Splash → Login/SignUp → Main) + 5-tab bottom navigator
- Tabs: Home | Workout | Run | Progress | Profile
- Clean header styling, consistent across all tabs

#### Missing vs. PRD
- No Competition tab
- No News/Feed tab
- No Teams tab
- No Gear Store tab
- PRD calls for a Feed-first architecture with dropdown menus — current nav is too flat for the planned feature set
- No deep linking support
- No notification routing

---

## FEATURES COMPLETELY ABSENT (PRD vs. Reality)

| PRD Feature | Status |
|---|---|
| Full 9-screen onboarding | ❌ Screen 1 only |
| Liability waiver | ❌ Not built |
| AI workout generation | ❌ Not built |
| Wearable integrations (6 platforms) | ❌ Not built |
| Competition / leaderboard system | ❌ Not built |
| Teams + group chat + DMs | ❌ Not built |
| Nutrition / macro calculator | ❌ Not built |
| Meal logging | ❌ Not built |
| Supplement stack tracker | ❌ Not built |
| Injury log + recovery tracking | ❌ Not built |
| News feed (5 sport categories) | ❌ Not built |
| Gear store | ❌ Not built |
| Gym network + search | ❌ Not built |
| Subscription tiers + Stripe | ❌ Not built |
| Push notifications | ❌ Not built |
| Body weight tracking | ❌ Not built |
| Social features (likes, follows, kudos) | ❌ Not built |

---

## OVERALL ASSESSMENT

### Top 5 Highest-Priority Features to Add

1. **Set-by-set workout logging** — The current single-entry model is not how serious lifters train. This is the core function of the app and the direct competitor to Hevy/Strong. Everything else is secondary to getting this right
2. **Body weight tracking with trend chart** — The most universally tracked fitness metric. Zero other data means anything without knowing if the scale is moving. Required for AI personalization and nutrition features
3. **Expanded onboarding (physical metrics)** — Age, weight, height, fitness level, equipment access. Without this data, AI workout generation is impossible. This is the technical debt that blocks the app's entire differentiator
4. **Forgot Password flow** — A login screen without password recovery is broken. People forget passwords. This is day-1 table stakes
5. **AI workout generation (GPT/Claude integration)** — The entire PRD differentiator. Even a basic implementation using the existing profile data + a system prompt calling an LLM would put At0m Fit miles ahead of manual-entry competitors. This is what justifies the Pro subscription

### Strengths to Double Down On

- **Brand voice / tone** — The "operator" language, the cynical copy, the gold-on-black aesthetic — this is distinctive and should be everywhere. Competitors are generic. At0m Fit has a personality. Lean all the way in
- **Run tracking data fields** — The RunScreen captures more useful fields (cadence, elevation, HR, type, notes) than many basic trackers. Solid foundation
- **Design system** — The Card + GoldButton + color palette is clean, consistent, and premium-feeling for a v1. Build on it, don't diverge from it
- **PRD ambition** — The competition system with verified leaderboards is genuinely novel. Strava has segments; At0m has a legit ranked performance system. If built properly, this could be the killer feature

---

## QUICK WINS (Sub-1-Day Builds That Would Raise the Grade)

### 🥇 Quick Win #1: Fix the Streak Counter
**Effort:** 2 hours | **Impact:** High
The "streak" currently shows an emoji based on workout count ≥ 4. Replace with an actual consecutive-days calculation. Loop backwards from today through the `workouts` table, count until there's a gap. Display the real number. This is core user engagement — MyFitnessPal, Duolingo, and every habit app in existence uses streaks because they work.

### 🥇 Quick Win #2: Add "Forgot Password" Link
**Effort:** 1 hour | **Impact:** Critical
Two lines of code + a new screen. `supabase.auth.resetPasswordForEmail(email)`. Without this, every user who forgets their password churns permanently. This should've shipped on day 1.

### 🥇 Quick Win #3: Rotating Motivational Quotes
**Effort:** 30 minutes | **Impact:** Medium
Replace the hardcoded Jim Rohn quote with an array of 20+ quotes. Random selection on each load or daily rotation based on `date % array.length`. Dead static content on a homepage reads like a forgotten placeholder.

### 🥈 Quick Win #4: Body Weight Log Entry
**Effort:** 3-4 hours | **Impact:** Very High
Add a single card to ProgressScreen: today's weight input + last 7 entries in a small line chart. New table: `body_weight_logs(user_id, date, weight_lbs)`. This single feature would make the Progress screen actually useful for the majority of users.

### 🥈 Quick Win #5: Fix Non-Functional Profile Settings
**Effort:** 2-3 hours | **Impact:** Medium (trust restoration)
The disabled Dark Mode switch and hardcoded "lbs" unit setting communicate brokenness. Either remove them or build them. For units: add a state variable, store in `profiles.preferred_units`, and apply globally. For dark mode: the app is already dark-only — just remove the toggle or label it "Theme: Dark" as static info text.

### 🥈 Quick Win #6: Previous Performance Display in Workout
**Effort:** 2-3 hours | **Impact:** Very High (the Strong "killer feature")
When a user adds an exercise, query the most recent time they logged that exercise and show "Last: 185 lbs × 5" below the exercise name. The data is already in the DB. This is why users keep coming back to Strong — the memory. At0m should have it.

### 🥈 Quick Win #7: DatePicker for Run Entry
**Effort:** 1 hour | **Impact:** Medium (UX polish)
Replace the raw `YYYY-MM-DD` text input with `@react-native-community/datetimepicker`. Eliminates bad date entries and looks professional.

---

## FINAL SCORECARD

| Screen / Feature | Grade | Score |
|---|---|---|
| Splash Screen | B | 7/10 |
| Login Screen | B- | 6/10 |
| Sign Up Screen | C | 5/10 |
| Home Screen | C+ | 5.5/10 |
| Workout Screen | D+ | 4/10 |
| Run Screen | B- | 6.5/10 |
| Progress Screen | D+ | 4/10 |
| Profile Screen | D | 3.5/10 |
| Navigation Architecture | C | 5/10 |
| Design System (components/theme) | A- | 8.5/10 |
| **OVERALL APP** | **D+** | **4.5/10** |

---

## BOTTOM LINE

At0m Fit v1.0 is a clean skeleton wearing impressive clothes. The design system is legitimately good — better than most indie fitness apps at this stage. But a fitness app that can't track body weight, doesn't show previous performance in workouts, has no password recovery, and delivers 15% of its own PRD is not yet competitive.

The path to a B+ rating:
1. Fix the quick wins (1 week)
2. Set-by-set workout logging + body weight tracking (1–2 weeks)
3. Full onboarding + physical metrics (1 week)
4. AI workout generation (2 weeks with GPT integration)
5. Competition system + leaderboards (the true differentiator — 3–4 weeks)

The bones are good. Build on them.

---

*Report generated by At0m Prime QC | 2026-03-14*
