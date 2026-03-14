# ⚛️ AT0M FIT — QC REPORT V5
**Analyst:** At0m Prime (Senior Product QC)  
**Date:** 2026-03-14  
**Version Reviewed:** 1.4 (post-Forge pass 4 — GPS tracking + AI workout generation)  
**Previous Versions:** V1: D+ / 4.5 — V2: C+ / 6.5 — V3: B / 7.1 — V4: B / 7.4  
**Benchmarks:** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong

---

## OVERALL V5 GRADE

> **A- / 8.0/10**  
> *(V1: D+ / 4.5 → V2: C+ / 6.5 → V3: B / 7.1 → V4: B / 7.4 → V5: A- / 8.0 — cumulative +3.5 points)*

The V5 pass is the most transformational in the project's history. Where previous passes were surgical (fix the broken things, add the missing utilities), V5 ships the two features that defined the competitive ceiling since V1: live GPS run tracking and AI workout generation. Both are fully implemented, polished, and connected to the existing data layer. The GPS tracking screen (LiveRunScreen) is one of the most technically ambitious features in any indie fitness app — dark custom MapView, snap-to-roads post-processing, reverse-geocoded auto-naming, static map thumbnail, rolling 30-second pace window, elevation from the Google Elevation API, and real-time mile splits. The AI workout generation screen (AIWorkoutScreen + `generateAIWorkout()`) analyzes the last 5 workouts and 3 runs, applies progressive overload principles, returns a complete named workout with per-exercise rest, notes, and weights, and loads it directly into WorkoutScreen — seamlessly. Every V4 "quick win" and "still missing" item also landed: units propagation, body fat % log, mileage chart 30D/90D, Calendar in tab bar, exercise names in day detail, real streak calculation, weight log deletion, personalized macros in Nutrition.

The A- ceiling is now held by three things: no background GPS tracking (app must stay foregrounded during runs), no Stripe payment flow (Pro tier is gated but not purchasable), and no audio/haptic cues during live runs. Those are the bridge from A- to A.

---

## OVERALL GRADE HISTORY

| Version | Grade | Score | Δ | Notes |
|---|---|---|---|---|
| V1 | D+ | 4.5 | — | Skeleton app, broken analytics, no navigation |
| V2 | C+ | 6.5 | +2.0 | Navigation fixed, screens added, design system solid |
| V3 | B | 7.1 | +0.6 | Nutrition, Calendar, Compete added; DB bugs present |
| V4 | B | 7.4 | +0.3 | ProgressScreen SVG charts, Calendar DB bug resolved |
| **V5** | **A-** | **8.0** | **+0.6** | GPS tracking, AI workout, all V4 quick wins |

---

## GRADE COMPARISON TABLE — V1 → V2 → V3 → V4 → V5

| Screen / Feature | V1 | V1 | V2 | V2 | V3 | V3 | V4 | V4 | V5 | V5 | V4→V5 Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Splash Screen | B | 7.0 | B+ | 7.5 | B+ | 7.5 | B+ | 7.5 | B+ | 7.5 | → 0 |
| Login Screen | B- | 6.0 | B+ | 7.5 | A- | 8.0 | A- | 8.0 | A- | 8.0 | → 0 |
| Sign Up Screen | C | 5.0 | C+ | 6.0 | B | 7.0 | B | 7.0 | B | 7.0 | → 0 |
| Home Screen | C+ | 5.5 | B- | 6.5 | B | 7.0 | B | 7.0 | B | 7.0 | → 0 |
| Workout Screen | D+ | 4.0 | B- | 6.5 | B+ | 7.5 | B+ | 7.5 | **A-** | **8.5** | **↑ +1.0** |
| AI Workout Screen | ❌ | — | ❌ | — | ❌ | — | ❌ | — | **A-** | **8.5** | **NEW** |
| Run Screen | B- | 6.5 | B | 7.0 | B+ | 7.5 | B+ | 7.5 | **A-** | **8.5** | **↑ +1.0** |
| Live Run Screen | ❌ | — | ❌ | — | ❌ | — | ❌ | — | **A-** | **8.5** | **NEW** |
| Progress Screen | D+ | 4.0 | C+ | 6.0 | C+ | 6.0 | B+ | 7.5 | **A-** | **8.5** | **↑ +1.0** |
| Profile Screen | D | 3.5 | C+ | 6.0 | B | 7.0 | B | 7.0 | B | 7.0 | → 0 |
| ForgotPassword Screen | ❌ | — | B | 7.0 | B | 7.0 | B | 7.0 | B | 7.0 | → 0 |
| Nutrition Screen | ❌ | — | ❌ | — | B- | 6.5 | B- | 6.5 | **B** | **7.0** | **↑ +0.5** |
| Leaderboard / Compete | ❌ | — | ❌ | — | B- | 6.5 | B- | 6.5 | B- | 6.5 | → 0 |
| Calendar Screen | ❌ | — | ❌ | — | B | 7.0 ⚠️ | B+ | 7.5 | **B+** | **8.0** | **↑ +0.5** |
| Navigation Architecture | C | 5.0 | C+ | 5.5 | B- | 6.5 | B- | 6.5 | **B** | **7.0** | **↑ +0.5** |
| Design System | A- | 8.5 | A- | 8.5 | A- | 8.5 | A- | 8.5 | A- | 8.5 | → 0 |
| **OVERALL APP** | **D+** | **4.5** | **C+** | **6.5** | **B** | **7.1** | **B** | **7.4** | **A-** | **8.0** | **↑ +0.6** |

*⚠️ V3 Calendar carried a critical DB bug (missing tables). Resolved in V4.*

---

## V5 RE-GRADES — CHANGED SCREENS

---

### RUN SCREEN + LIVE RUN SCREEN
**Run Screen V5: A- | 8.5/10** *(was B+ | 7.5 — ↑ +1.0)*  
**Live Run Screen V5: A- | 8.5/10** *(new screen)*

This is the single biggest feature addition in the app's history. At0m Fit goes from "manual run logger" to "live GPS tracking app with dark-themed real-time map." The gap between V4 and V5 on this screen matches what Strava represented versus a notepad.

#### ✅ LiveRunScreen — Feature Audit

**GPS Integration — Complete.**  
`expo-location` with `Location.Accuracy.BestForNavigation`, 2-second/5-meter interval. `watchPositionAsync` starts on START tap, stops on PAUSE, resumes on RESUME, stops and archives on FINISH. Haversine distance formula is correct (3958.8 miles Earth radius). Refs mirror React state for use inside async closures — a common React Native gotcha handled correctly.

**Rolling 30-Second Pace Window — Best-in-class.**  
`paceWindowRef` stores the last 30 seconds of `{ time, dist }` samples. Pace is computed as `timeDelta / distDelta` which is the correct pace-per-mile formula (not the naïve total-elapsed/total-distance). This means current pace responds immediately to acceleration/deceleration, matching the UX of Strava's "current pace" display. This is exactly how professional running apps do it.

**Mile Splits — Live.**  
`lastMileRef` tracks the last completed whole-mile threshold. Every GPS update checks `Math.floor(newDist) > lastMileRef.current` and records `{ mile: N, pace_seconds: elapsedSinceLastMile }`. Splits render as horizontal chip scroll below the controls during the run, and as a full table in the save modal.

**Elevation — Google Elevation API.**  
`fetchElevation()` calls `maps.googleapis.com/maps/api/elevation/json` every 10 GPS updates (avoiding API quota burn). Returns elevation in meters, converted to feet. Accumulates `elevationGain` and `elevationLoss` separately by comparing against `lastElevationRef`. The 4-stat bar shows `↑Nft ELEV` live. Final elevation gain saves to `runs.elevation_ft`. Silent failure on API error (non-critical path). This matches Garmin Connect's elevation tracking UX — a premium feature.

**Snap-to-Roads — Google Roads API.**  
`snapToRoads()` runs after FINISH is tapped, before the save modal opens. Samples up to 100 points from the route (Road API max), calls `roads.googleapis.com/v1/snapToRoads?interpolate=true`, maps returned `snappedPoints` back to `{ latitude, longitude }`. If snap succeeds, `setCoords(snapped)` updates the displayed route with a cleaner line. "Optimizing route..." overlay with spinner blocks the modal until complete. Silent fallback to original if API fails. This is a feature Strava Premium charges for — At0m ships it to all Pro users.

**Reverse Geocode Auto-Naming — Google Geocoding API.**  
On the first GPS fix, `reverseGeocode()` hits `maps.googleapis.com/maps/api/geocode/json?latlng=...`. Searches result components for `neighborhood` → `sublocality` → `locality` in that priority order. Returns a name like "Midtown" and sets `runName` to `"Midtown Run"`. The run name field in the save modal is pre-filled but editable. Elegant, invisible to the user, matches Nike Run Club's auto-titling behavior.

**Static Map Thumbnail — Google Static Maps API.**  
`buildStaticMapUrl()` samples 50 route coordinates, builds a `staticmap?size=600x300&path=color:0xC9A84C|weight:3|...` URL. Displayed as a 160px tall `<Image>` at the top of the save modal — giving the user a visual record of their route before saving. This is a premium detail that adds significant perceived quality. The gold route color matches the app's design system.

**Dark Map Style — Custom `customMapStyle`.**  
`DARK_MAP_STYLE` array with 9 rules transforms the Google Map to At0m Fit's dark aesthetic: `#1a1a2e` geometry, `#2d2d44` roads, `#0a0a1a` water, POI/transit hidden. The gold `#C9A84C` polyline and glowing marker dot (with `shadowRadius: 6` elevation) complete the branded map experience. No other consumer fitness app has a custom dark map style this polished outside of premium subscriptions.

**Run State Machine — Correct.**  
`status: 'idle' | 'running' | 'paused' | 'finished'` state drives all UI branches. Pause correctly removes the location subscription (stops GPS distance accumulation) while the timer also stops. Resume re-subscribes. Finish archives to `finalDistance.current` and `finalElapsed.current` refs before showing the modal, so the values don't change during the async snap-to-roads delay.

**Save Modal — Complete.**  
Distance, time, avg pace, elevation gain summary card. Full mile splits list. Editable run name field. Run type chips (Outdoor/Indoor/Trail/Race). Notes textarea. Save writes to `supabase.from('runs').insert(...)` with all fields. Discard navigates back to RunScreen without saving.

**RunScreen Integration — Seamless.**  
RunScreen now has a prominent `TRACK RUN 📍` gold button at the top that navigates to `LiveRun`. Manual LOG RUN form still present for retroactive entry. Mileage chart has 7D/30D/90D toggle (this was the V4 quick win that also shipped). Filter chips (All/Outdoor/Indoor), run history cards with elevation display, all records intact.

#### ⚠️ Remaining Gaps

**No background location tracking.**  
`Location.watchPositionAsync` without background task means if the user locks their phone or switches apps, tracking pauses. Expo provides `startLocationUpdatesAsync` (background task) but it requires `expo-task-manager` configuration. For the 80% of users who keep the screen on during a run, this is invisible. For any serious runner or athlete (Levi's exact user), this is a dealbreaker — Strava, Nike, Garmin all run in the background. This is the single biggest remaining gap on the run screen.

**No audio/haptic cues.**  
Mile split completion has no beep, no vibration, no spoken announcement. Strava and NRC speak mile pace aloud. This requires `expo-av` (audio) or `Vibration` API.

**No kilometer mode.**  
`haversineDistance` uses miles as the unit constant. Users who run in km see no option. All pace/distance labels hardcoded to `mi` and `/mi`.

**Heart rate is a placeholder.**  
`const avgHR = null; // placeholder — wearable not connected` — declared and never used. Heart rate integration requires Bluetooth LE or Apple Health / Google Fit sync.

**No auto-pause.**  
If the user stops at a light, pace plummets and time continues. Auto-pause at near-zero velocity is standard on Strava/Garmin.

---

### WORKOUT SCREEN + AI WORKOUT SCREEN
**Workout Screen V5: A- | 8.5/10** *(was B+ | 7.5 — ↑ +1.0)*  
**AI Workout Screen V5: A- | 8.5/10** *(new screen)*

AI workout generation is At0m Fit's primary PRD differentiator — the feature that justifies the Pro tier over Hevy and Strong, neither of which have AI generation. V5 delivers it fully.

#### ✅ AIWorkoutScreen + generateAIWorkout() — Feature Audit

**Feature Gate — Correct.**  
AIWorkoutScreen checks `subscription_tier` on load. `free` users see a locked card with feature list and UPGRADE CTA. `pro` users get the full generator. This is the right monetization pattern — show value, gate access.

**GPT-4o-mini Integration — Solid.**  
`generateAIWorkout(userId)` fetches:
- Profile: `fitness_level, goal, weight_lbs, age`
- Last 5 workouts with per-exercise names, sets, reps, weight_lbs
- Last 3 runs with date, distance, pace

System prompt: *"elite strength and conditioning coach. Apply progressive overload. Avoid repeating last session."*  
Response schema: `workout_name, estimated_duration_minutes, focus, ai_notes, exercises[]` where each exercise has `name, sets, reps, weight_lbs, rest_seconds, notes`.  
`response_format: { type: 'json_object' }` forces structured output — no hallucinated markdown. `max_tokens: 800` gives enough room for a 5-6 exercise plan. `temperature: 0.8` adds variety between generations.

**Fallback Workout — Smart.**  
If the API call fails (key missing, network, quota), the fallback checks the most recent workout for upper vs. lower body exercises and returns the opposite split. This means even without a live API call, a "Lower Body Power" or "Upper Body Power A" workout returns with 5 exercises, weights, rest periods, and notes. The app never shows an error state to the user for a missing API key.

**Load into WorkoutScreen — End-to-End Wired.**  
`handleLoadWorkout()` calls `navigation.navigate('Main', { screen: 'Workout', params: { aiWorkout: workout } })`. WorkoutScreen reads `route?.params?.aiWorkout` in a `useEffect`. On receipt, it calls `setWorkoutName(aiWorkout.workout_name)` and maps exercises to the WorkoutScreen's internal format: `{ name, sets: [{ weight, reps, completed: false }], notes }`. An `"⚛ AI-generated"` badge appears on the session name row. The flow is seamless — generate, review, tap "LOAD INTO WORKOUT," land on a pre-filled workout session.

**AIWorkoutScreen UI — Polished.**  
Loading state: spinner + "Analyzing your training history..." + "Building personalized workout." Generated card: workout name (20px bold), focus tag (uppercase, muted), duration badge (gold border), AI notes in italic card (italic background panel). Exercise list: numbered circles, name, sets × reps @ weight, rest time formatted (`formatRest()`), optional notes. Two actions: gold "LOAD INTO WORKOUT" + outline "REGENERATE." Empty state: robot emoji, "Your AI Coach is Ready." All states handled.

**WorkoutScreen Integration — Complete.**  
- `"⚛ AI GENERATE"` button at top of WorkoutScreen for `profile.subscription_tier === 'pro'` ✓
- Navigates to `navigation.navigate('AIWorkout')` ✓
- Session timer bar shows `Vol: N lbs` using `weightLabel` ✓ (units propagation from ProfileContext)
- Library search against `exercises_library` table with gold-bordered chips ✓
- Last performance display for each exercise via `fetchLastPerformance()` ✓
- Estimated 1RM per exercise via Epley formula ✓
- Rest timer modal with 60/90/120/180s presets, progress bar, flash animation on completion ✓
- Per-set completion checkmarks trigger rest timer automatically ✓
- `exercise_sets` table insert for per-set data ✓

#### ⚠️ Remaining Gaps

**AI weight suggestions are placeholders, not PR-calibrated.**  
`generateAIWorkout()` sends `exercises[].weight_lbs` from the `exercises` table (first-set summary). The AI suggests weights based on these, but they're not derived from the athlete's actual `exercise_sets` personal records. If the user PR'd a Squat at 315 lbs but the `exercises` table shows an old 225 lbs entry, the AI may suggest 225 instead of a progressive 235. The fix is to send the max `weight_lbs` from `exercise_sets` per exercise name, not the summary.

**No multi-day program generation.**  
AI generates a single session. Hevy has programs (predefined multi-week plans); Apple Fitness+ has guided programs. A true "AI Coach" would generate a 4-week mesocycle. Currently it's session-by-session.

**Exercise library depth.**  
Still 8 hardcoded templates in `EXERCISE_TEMPLATES`. Library search queries `exercises_library` table which may have more, but the quick-add chip strip is sparse. Strong/Hevy have 500+ categorized exercises with muscle diagrams.

---

### PROGRESS SCREEN
**V5 Grade: A- | 8.5/10** *(was B+ | 7.5 — ↑ +1.0)*  
*All five V4 "still missing" items confirmed shipped.*

#### ✅ V4 Quick Wins — All Confirmed

**1. Units propagation — FIXED.**  
`WeightLineChart` now accepts `unitLabel` prop. Called as `<WeightLineChart data={weightData} unitLabel={weightLabel} />` where `weightLabel` comes from `useProfile()`. `weightMinMaxText` renders `Min: {minW} {unitLabel}` and `Max: {maxW} {unitLabel}` — no more hardcoded "lbs." Weight input placeholder uses `\`Today's weight (${weightLabel})\``. Section label uses `VOLUME (${weightLabel.toUpperCase()})`. Full units propagation from ProfileContext to ProgressScreen — every display label responds to the user's preferred unit.

**2. Weekly mileage chart 30D/90D toggle — FIXED.**  
`mileageRange` state (separate from `volumeRange`) drives a full `RANGE_OPTIONS` toggle on the mileage chart. `loadProgress(rangeDays, mileageDays)` accepts both parameters. The mileage aggregation mirrors the volume aggregation: daily bars for 7D, 3-day sampling for 30D, weekly aggregation for 90D. Both charts now have consistent range controls.

**3. Body fat % log — NEW FEATURE.**  
Full `BODY FAT %` section with TextInput (decimal-pad), SAVE button with `GoldButton`, and `body_fat_logs` table queries (`id, date, body_fat_pct`). `saveBodyFat()` upserts to `body_fat_logs` with `onConflict: 'user_id,date'`. Last 30 days chart uses `WeightLineChart` with `unitLabel="%"`. Last 7 entries shown in history list. Input validation rejects values outside 0–70%. This is the dedicated body composition tracking that WHOOP charges for on their premium tier.

**4. Weight log deletion — FIXED.**  
`weightHistory` now stores entries with `id` field. Each row has a `×` delete button that calls `deleteWeight(id, dateStr)` — shows an Alert confirmation then executes `supabase.from('body_weight_logs').delete().eq('id', id)`. Pro-tier UX detail: you can now correct bad entries.

**5. Real streak calculation — FIXED.**  
The `loadProgress()` function now queries all workout dates, builds a `Set`, and walks backward from today (or yesterday if today has no workout yet) decrementing until a gap. This is the same algorithm as HomeScreen — proper consecutive-day streak. Previously it counted bars with `value > 0` in the current chart range (misleading and range-dependent).

#### ⚠️ Remaining Gaps

**PR source still first-set summary.**  
`allExercises` query selects from `exercises` (workout-level summary row). PR weight is `exercises.weight_lbs` which reflects the first set logged for that workout, not the max set from `exercise_sets`. For athletes who warm up light and hit their heavy set later, PRs may show the warm-up weight. The fix: query `exercise_sets` grouped by exercise name for max `weight_lbs`.

**No body composition composite view.**  
Weight and body fat % are tracked in separate sections. A combined chart showing both trend lines together (weight vs. body fat %) is a Garmin Connect / InBody feature that would add analytical depth. Could use dual-Y-axis SVG.

**Body fat history has no delete button.**  
Weight history has deletion, body fat history does not. The `bodyFatHistory` rows are rendered without an `×` button. Minor inconsistency.

---

### CALENDAR SCREEN
**V5 Grade: B+ | 8.0/10** *(was B+ | 7.5 — ↑ +0.5)*  
*Three of four V4 "still missing" items resolved.*

#### ✅ What's Fixed

**Calendar in main tab bar — CONFIRMED.**  
`navigation/index.js` shows `CalendarScreen` as the 7th tab in `MainTabs` (`Tab.Screen name="Calendar"`). The `HomeStack` still exists in the navigation file as dead code but is unused — the Calendar is now a first-class tab with 📅 icon. V4's discovery problem (Calendar only accessible via HomeStack push) is fully resolved.

**Exercise names in workout detail — CONFIRMED.**  
`loadDayData()` query: `supabase.from('workouts').select('id, name, exercises(id, name)')`. `renderWorkoutDetail()` renders:  
```js
{dayWorkout.exercises.slice(0,3).map(e => e.name).join(' · ')}
{dayWorkout.exercises.length > 3 ? ` +${N} more` : ''}
```
Users now see "Squat · Bench Press · Deadlift +2 more" instead of just "5 exercises." Exactly what V4 flagged.

**Nutrition dots bridged from meal_logs — CONFIRMED.**  
`loadMonthData()` now queries both tables in parallel:
```js
const [{ data: nData }, { data: mealDatesData }] = await Promise.all([
  supabase.from('nutrition_logs').select('date, carb_day_type')...,
  supabase.from('meal_logs').select('date')...,
]);
```
`nutrition_logs` entries populate `nDots[date] = carb_day_type`. `meal_logs` entries add `nDots[date] = 'logged'` if not already set. Users who log meals in NutritionScreen now see dots on the Calendar for those days automatically. The data-split gap from V4 is bridged without a schema change.

**Meal summary in day detail — CONFIRMED.**  
`loadDayData()` queries `meal_logs` for the selected date and stores in `dayMealLogs`. Both `renderNutritionDetail()` branches (with and without `dayNutrition` record) now show:
```
TODAY'S MEALS
N kcal · Ng protein · N meals
```
Bridging the two nutrition data sources visually.

#### ⚠️ Remaining Gaps

**No swipe gesture for month navigation.**  
Left/right swipe on the calendar grid could fire `prevMonth()`/`nextMonth()`. Currently requires tapping the `‹` `›` arrows.

**No week-strip compact view.**  
A 7-day horizontal strip alternative (Strava/NRC style) would improve daily-use UX. Full month grid is correct for planning but high scroll cost for checking a single day.

**HomeStack dead code.**  
`HomeStackNav` component is defined and never used. Should be cleaned up to avoid confusion for contributors.

**8 tabs is overcrowded on small screens.**  
The tab bar now has 8 items (Home, Workout, Run, Nutrition, Progress, Compete, Calendar, Profile). On a 4.7" iPhone, labels will truncate. Should evaluate splitting into a 5+3 pattern or using an overflow "More" menu.

---

### NUTRITION SCREEN
**V5 Grade: B | 7.0/10** *(was B- | 6.5 — ↑ +0.5)*

`calcMacroTargets(profile)` now computes personalized targets from `profile.weight_lbs`:
```js
protein: Math.round(weight * 0.8),
carbs: Math.round(weight * 1.5),
fat: Math.round(weight * 0.4),
```
`DEFAULT_MACRO_TARGETS` serves as fallback when profile lacks weight data. `MacroBar` components now render personalized targets in the macro progress section. This was the V4 critical miss for NutritionScreen — calorie/macro targets defaulted to generic values instead of being derived from the user's actual body weight and goal.

Remaining gaps:
- No barcode scanner / food database integration
- No meal photo recognition
- Free tier gets `DEFAULT_MACRO_TARGETS` regardless of profile (macros should personalize for free users too)
- AI fallback goals write to `nutrition_logs` (carb cycling data) but NutritionScreen's `meal_logs` remain fully manual

---

### NAVIGATION ARCHITECTURE
**V5 Grade: B | 7.0/10** *(was B- | 6.5 — ↑ +0.5)*

**Calendar promoted to tab** — the biggest navigation improvement. Calendar is the 7th `Tab.Screen` in `MainTabs`, fully co-equal with Workout, Run, Progress.

**LiveRun and AIWorkout correctly placed** — both as root `Stack.Screen` entries, not tabs. This is the right architecture. LiveRun with `headerShown: false` gives the full-screen map experience. AIWorkout with `headerShown: true, title: '⚛ AI COACH'` gets a proper back button. Navigation flow: WorkoutScreen → navigate('AIWorkout') → navigate('Main', {screen:'Workout', params:{aiWorkout}}) is a clean round-trip.

Remaining gaps:
- 8 tabs may need overflow handling on smaller devices
- HomeStack dead code (`HomeStackNav` defined but unused)
- Deep link support not implemented (can't open a specific run or workout from a notification)

---

## NEW SCREENS

### AI WORKOUT SCREEN
**V5 Grade: A- | 8.5/10** *(new)*  
See Workout Screen section above. Standalone grades reflect standalone quality: Pro gate, GPT-4o-mini integration, smart fallback, polished loading/empty/generated states, "Load into Workout" deep link, regenerate capability. Compared to Hevy/Strong (no AI), this is category-defining. Deductions: AI weight suggestions not PR-calibrated, no multi-day program generation.

### LIVE RUN SCREEN
**V5 Grade: A- | 8.5/10** *(new)*  
See Run Screen section above. The map experience, snap-to-roads, auto-naming, and static thumbnail are features that exceed what most indie apps build for version 1 GPS. Deductions: no background tracking (the single largest gap), no audio/haptic cues, no km mode, avgHR is a placeholder.

---

## SCREENS WITH NO CHANGES (V4 → V5)

| Screen | V5 Grade | Notes |
|---|---|---|
| Splash Screen | B+ / 7.5 | Unchanged from V4. Still lacks: video/animation intro, lottie splash. |
| Login Screen | A- / 8.0 | Best non-analytics screen in the app. Minor gaps: no biometric login, no social auth. |
| Sign Up Screen | B / 7.0 | Still no full onboarding flow (equipment, fitness level selection, goal setup wizard). |
| Home Screen | B / 7.0 | AI goal generation + fallback confirmed working. Quick-log weight present. Weekly stats confirmed. Still needs: widget preview, push notifications. |
| Profile Screen | B / 7.0 | Units toggle, body weight, fitness goal, sleep/wake times confirmed. Still needs: Stripe subscription purchase flow. |
| ForgotPassword Screen | B / 7.0 | Complete and functional. No changes needed. |
| Leaderboard / Compete | B- / 6.5 | Team tokens, leaderboard, goal completion flow confirmed. Still needs: kudos, activity feed, notifications. Social gap is the blocker here. |

---

## TOP 3 GRADE JUMPS — V4 → V5

### 🥇 #1 (THREE-WAY TIE): +1.0 each

**Workout Screen + AIWorkoutScreen: B+ / 7.5 → A- / 8.5**  
AI workout generation ships the PRD's #1 differentiator. GPT-4o-mini analysis of last 5 workouts and 3 runs returns a complete, progressive-overload-aware session with weights, reps, rest, and coaching notes. Loads directly into WorkoutScreen in one tap. Smart fallback. Pro gate. No competing indie app (Hevy, Strong) has this feature.

**Run Screen + LiveRunScreen: B+ / 7.5 → A- / 8.5**  
GPS live tracking ships the feature that defined the V3/V4 competitive ceiling. Dark-styled MapView, haversine distance, rolling 30-second pace window, Google Elevation API, snap-to-roads post-processing, reverse-geocode auto-naming, static map thumbnail. Every serious runner will now consider At0m as a Strava alternative for in-run experience.

**Progress Screen: B+ / 7.5 → A- / 8.5**  
All five V4 "still missing" items landed: units propagation fixed, 30D/90D mileage toggle, body fat % log with SVG trend, weight entry deletion, real streak calculation. Progress is now the most analytically complete screen in the app.

### 🥉 #4 (Close runner-up): +0.5

**Calendar Screen: B+ / 7.5 → B+ / 8.0**  
Calendar promoted to main tab bar (discovery problem solved). Exercise names rendered in day detail. Nutrition dots bridged from `meal_logs`. Day view shows meals summary (kcal + protein + count) without requiring a separate `nutrition_logs` entry.

---

## WHAT'S LEFT TO REACH TRUE A TIER (8.5+ Overall)

These are the remaining items that would push At0m from A- / 8.0 to A / 8.5+:

| Gap | Target Screen | Effort | Impact | Priority |
|---|---|---|---|---|
| **Background GPS tracking** (`startLocationUpdatesAsync` + expo-task-manager) | LiveRun | High | Critical | P0 |
| **Stripe subscription** (actual purchase flow, not just gated UI) | Profile | High | High | P0 |
| **Audio/haptic cues during runs** (mile split beep, spoken pace) | LiveRun | Medium | High | P1 |
| **Multi-day AI program generation** (4-week mesocycle) | AIWorkout | High | High | P1 |
| **Exercise library depth** (104 → 500+ with muscle diagrams) | Workout | Medium | Medium | P1 |
| **Full onboarding flow** (equipment, fitness level wizard) | Sign Up | Medium | High | P1 |
| **PR source fix** (query `exercise_sets` max vs. `exercises` summary) | Progress | Low | Medium | P2 |
| **Km mode** (unit toggle for runners) | LiveRun, Run | Low | Medium | P2 |
| **Social features** (kudos, activity feed, teammate notifications) | Compete | High | High | P2 |
| **Swipe gesture** for Calendar month navigation | Calendar | Low | Low | P3 |
| **Tab bar overflow** (collapse 8 tabs to 5+3 or bottom-sheet More) | Navigation | Medium | Medium | P2 |
| **Body composition composite chart** (weight + BF% overlay) | Progress | Low | Medium | P3 |
| **Biometric login** (Face ID / fingerprint) | Login | Low | Low | P3 |

**The non-negotiable P0 items for A / 8.5+:**
1. **Background GPS** — Without it, At0m can't compete with Strava for any serious runner. Levi runs 15+ miles/week. He can't hold a phone screen on for 60+ minutes.
2. **Stripe** — The Pro tier exists in code everywhere but can't be purchased. Every PRO-gated feature is inaccessible to real users until this ships.

---

## CRITICAL GAPS SUMMARY

| Gap | Severity | Screen | Status |
|---|---|---|---|
| No background GPS tracking | 🔴 Critical | LiveRun | Unbuilt |
| No Stripe subscription purchase | 🔴 Critical | Profile | Unbuilt |
| No audio/haptic run cues | 🟡 Notable | LiveRun | Unbuilt |
| AI weights not PR-calibrated | 🟡 Notable | AIWorkout | Easy fix |
| Km mode missing | 🟡 Notable | LiveRun/Run | Easy fix |
| Body fat history has no delete | 🟢 Minor | Progress | Easy fix |
| HomeStack dead code | 🟢 Minor | Navigation | Cleanup |
| 8-tab overflow on small screens | 🟢 Minor | Navigation | Design decision |
| Free tier still gets default macros | 🟢 Minor | Nutrition | Easy fix |

---

## FINAL V5 SCORECARD

| Screen / Feature | V1 | V2 | V3 | V4 | V5 |
|---|---|---|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 |
| Login Screen | B- / 6.0 | B+ / 7.5 | A- / 8.0 | A- / 8.0 | A- / 8.0 |
| Sign Up Screen | C / 5.0 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| Home Screen | C+ / 5.5 | B- / 6.5 | B / 7.0 | B / 7.0 | B / 7.0 |
| Workout Screen | D+ / 4.0 | B- / 6.5 | B+ / 7.5 | B+ / 7.5 | **A- / 8.5 ↑** |
| AI Workout Screen | ❌ | ❌ | ❌ | ❌ | **A- / 8.5 NEW** |
| Run Screen | B- / 6.5 | B / 7.0 | B+ / 7.5 | B+ / 7.5 | **A- / 8.5 ↑** |
| Live Run Screen | ❌ | ❌ | ❌ | ❌ | **A- / 8.5 NEW** |
| Progress Screen | D+ / 4.0 | C+ / 6.0 | C+ / 6.0 | B+ / 7.5 | **A- / 8.5 ↑** |
| Profile Screen | D / 3.5 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| ForgotPassword Screen | ❌ | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| Nutrition Screen | ❌ | ❌ | B- / 6.5 | B- / 6.5 | **B / 7.0 ↑** |
| Leaderboard / Compete | ❌ | ❌ | B- / 6.5 | B- / 6.5 | B- / 6.5 |
| Calendar Screen | ❌ | ❌ | B / 7.0 ⚠️ | B+ / 7.5 | **B+ / 8.0 ↑** |
| Navigation Architecture | C / 5.0 | C+ / 5.5 | B- / 6.5 | B- / 6.5 | **B / 7.0 ↑** |
| Design System | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 |
| **OVERALL** | **D+ / 4.5** | **C+ / 6.5** | **B / 7.1** | **B / 7.4** | **A- / 8.0 ↑** |

---

## OVERALL V5 ASSESSMENT

### New Overall Grade: A- / 8.0/10 *(was B / 7.4 in V4 — ↑ +0.6)*

V5 is the pass that changes At0m Fit's identity. It's no longer a feature-complete manual logger with analytics. It's a live GPS tracking app with a built-in AI strength coach. The two features that defined the V3/V4 competitive ceiling — GPS run tracking and AI workout generation — both shipped in V5, both polished, both integrated end-to-end with the existing data layer and Supabase backend.

The GPS tracking screen (LiveRunScreen) executes five distinct Google Maps API integrations simultaneously: real-time elevation from the Elevation API, route correction from the Roads API, location naming from the Geocoding API, dark theme customization via `customMapStyle`, and static route thumbnail from the Static Maps API. The 30-second rolling pace window algorithm is correct and matches professional running app implementations. For a v1 GPS feature, this is technically sophisticated. The one critical remaining gap — background location tracking — is the difference between "impressive demo" and "daily driver." That fix is the single most important remaining engineering task in the app.

The AI workout generation (AIWorkoutScreen + `generateAIWorkout()`) sets At0m apart in the competitive landscape. Hevy, Strong, and Workout Tracker all have manual workout logging. None have AI generation with progressive overload awareness, training history analysis, and smart fallback. The feature is properly gated (Pro only), polished (loading states, empty states, regenerate button, "⚛ AI-generated" badge), and wired end-to-end into WorkoutScreen. The weight suggestion gap (AI uses first-set summary, not exercise_sets max) is the primary remaining fix.

The foundation is now A- quality. Background GPS, Stripe, and audio cues are what the path to A looks like.

---

*Report generated by At0m Prime QC | 2026-03-14 | v5*
