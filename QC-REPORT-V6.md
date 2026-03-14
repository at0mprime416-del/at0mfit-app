# ⚛️ AT0M FIT — QC REPORT V6
**Analyst:** At0m Prime (Senior Product QC)
**Date:** 2026-03-14
**Version Reviewed:** 1.5 (post-Forge pass 5 — Wall Street Compete UI, Gym Tier, Events, Navigation restructure)
**Previous Grade:** A- / 8.0 (V5)
**Benchmarks (Standard):** Strava, Nike Run Club, Apple Fitness+, MyFitnessPal, WHOOP, Garmin Connect, Hevy, Strong
**Benchmarks (CompeteScreen Special):** Webull, Robinhood, Bloomberg Terminal, Coinbase, thinkorswim (TD Ameritrade)

---

## OVERALL V6 GRADE

> **A- / 8.3/10**
> *(V1: D+ / 4.5 → V2: C+ / 6.5 → V3: B / 7.1 → V4: B / 7.4 → V5: A- / 8.0 → V6: A- / 8.3 — cumulative +3.8 points)*

V6 is the platform expansion pass. Where V5 made At0m Fit a serious solo training app (GPS + AI), V6 transforms it into a competitive fitness ecosystem. The Wall Street Compete UI is the most conceptually ambitious feature in the project's history — "fitness as financial market" is a distinctive brand identity that no competitor has attempted. Navigation was restructured from 8 flat tabs to 5 grouped stacks, solving the most persistent UX complaint since V1. Two new screens (GymScreen, EventsScreen) bring real-world social infrastructure: gym profiles with owner dashboards, public events with registration, and team discovery with join requests.

The ceiling at A- / 8.3 is still held by the same P0 items from V5 — background GPS and Stripe — plus one new gap introduced by V6: the CompeteScreen's data columns show placeholders (7D = "—", expanded row = "—") where real delta data should live. The Wall Street metaphor only fully lands when the numbers move. Static financial data is inert financial data.

---

## OVERALL GRADE HISTORY

| Version | Grade | Score | Δ | Notes |
|---|---|---|---|---|
| V1 | D+ | 4.5 | — | Skeleton app, broken analytics, no navigation |
| V2 | C+ | 6.5 | +2.0 | Navigation fixed, screens added, design system solid |
| V3 | B | 7.1 | +0.6 | Nutrition, Calendar, Compete added; DB bugs present |
| V4 | B | 7.4 | +0.3 | ProgressScreen SVG charts, Calendar DB bug resolved |
| V5 | A- | 8.0 | +0.6 | GPS tracking, AI workout, all V4 quick wins |
| **V6** | **A-** | **8.3** | **+0.3** | Wall Street Compete, Gym Tier, Events, 5-tab nav |

---

## GRADE COMPARISON TABLE — V1 → V6

| Screen / Feature | V1 | V2 | V3 | V4 | V5 | V6 | V5→V6 Δ |
|---|---|---|---|---|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | → 0 |
| Login Screen | B- / 6.0 | B+ / 7.5 | A- / 8.0 | A- / 8.0 | A- / 8.0 | A- / 8.0 | → 0 |
| Sign Up Screen | C / 5.0 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | → 0 |
| Home Screen | C+ / 5.5 | B- / 6.5 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | → 0 |
| Workout Screen | D+ / 4.0 | B- / 6.5 | B+ / 7.5 | B+ / 7.5 | A- / 8.5 | A- / 8.5 | → 0 |
| AI Workout Screen | ❌ | ❌ | ❌ | ❌ | A- / 8.5 | A- / 8.5 | → 0 |
| Run Screen | B- / 6.5 | B / 7.0 | B+ / 7.5 | B+ / 7.5 | A- / 8.5 | A- / 8.5 | → 0 |
| Live Run Screen | ❌ | ❌ | ❌ | ❌ | A- / 8.5 | A- / 8.5 | → 0 |
| Progress Screen | D+ / 4.0 | C+ / 6.0 | C+ / 6.0 | B+ / 7.5 | A- / 8.5 | A- / 8.5 | → 0 |
| Profile Screen | D / 3.5 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | → 0 |
| ForgotPassword Screen | ❌ | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | → 0 |
| Nutrition Screen | ❌ | ❌ | B- / 6.5 | B- / 6.5 | B / 7.0 | B / 7.0 | → 0 |
| Compete / Leaderboard | ❌ | ❌ | B- / 6.5 | B- / 6.5 | B- / 6.5 | **A- / 8.5** | **↑ +2.0** |
| Calendar Screen | ❌ | ❌ | B / 7.0 ⚠️ | B+ / 7.5 | B+ / 8.0 | B+ / 8.0 | → 0 |
| **Gym Screen** | ❌ | ❌ | ❌ | ❌ | ❌ | **B+ / 7.5** | **NEW** |
| **Events Screen** | ❌ | ❌ | ❌ | ❌ | ❌ | **B+ / 7.5** | **NEW** |
| Navigation Architecture | C / 5.0 | C+ / 5.5 | B- / 6.5 | B- / 6.5 | B / 7.0 | **A- / 8.5** | **↑ +1.5** |
| Design System | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | → 0 |
| **OVERALL APP** | **D+ / 4.5** | **C+ / 6.5** | **B / 7.1** | **B / 7.4** | **A- / 8.0** | **A- / 8.3** | **↑ +0.3** |

*⚠️ V3 Calendar carried a critical DB bug (missing tables). Resolved in V4.*

---

## COMPETE SCREEN — WALL STREET UI (FULL RE-GRADE)

### CompeteScreen V6: A- / 8.5/10 *(was B- / 6.5 — ↑ +2.0)*

This is the single largest grade jump in the project's history. The previous Compete screen was a static leaderboard list with team tokens — functional but indistinguishable from any other fitness app. V6 reimagines it as a financial trading terminal where athletic performance is the market, tokens are market cap, and the daily reset is the opening bell. The execution is technically sophisticated and conceptually original. No competing fitness app — Strava, Hevy, Nike, WHOOP — has attempted this metaphor.

---

## COMPETE SCREEN — TRADING APP BENCHMARK (SPECIAL ANALYSIS)

### What Was Built

**1. Ticker Tape (`TickerTape` component)**
`Animated.timing` scrolling from `SCREEN_W` to `-textWidth` using `useNativeDriver: true`. Pulls real data: recent events from Supabase + top 5 leaderboard entries with medals. Falls back to platform stats if no recent activity. Gold Courier/monospace text on `#111111` surface with 1px gold top/bottom borders. Duration calculated as `(textWidth + SCREEN_W) * 30` — correct proportional speed. Auto-restarts on completion.

**2. AT0M FITNESS INDEX**
Left-bordered gold card. 36px bold white number derived from total platform tokens / 10. "↑ LIVE" indicator in gold. Subtitle: "Platform activity index · updates daily." Presents exactly like a market index (Dow Jones / S&P equivalent).

**3. Market Bell Overlay (`MarketBellOverlay` component)**
Full-screen `rgba(0,0,0,0.92)` overlay. 72px bell emoji, "MARKETS OPEN" in 28px gold monospace with `textShadowRadius: 20` gold glow, "AT0M FITNESS EXCHANGE" in 12px muted monospace. `Animated.sequence` (300ms fade in → 1000ms hold → 400ms fade out). AsyncStorage check (`marketBellDate`) prevents repeat shows. This is a precise recreation of NYSE/Nasdaq opening bell ceremony in fitness context.

**4. Gainers / Losers Panel**
Side-by-side columns: "▲ TOP GAINERS" in `#00C853` green vs "▼ BIGGEST DROPS" in `#FF1744` red. Three-row monospace name/delta pairs. Left column has right border divider. This mirrors Bloomberg's gainers/losers widget and Webull's heat-mapped mover list.

**5. Market Cap Leaderboard (TEAMS tab)**
Column headers: `RANK | TEAM | MBR | MKT CAP | 7D`. All monospace. Alternating `#0a0a0a` / `#111111` row backgrounds. My-team row gets 1px gold border highlight + `rgba(201,168,76,0.05)` tint. MANAGE button for team creators. This is the most Bloomberg Terminal-adjacent component in the app.

**6. Competition Cards (Futures-Style)**
`compCard` with 1px gold border on `#111111`. Title with ⚔️ prefix. Live countdown in monospace (`Closes in HH:MM:SS`). Host badge in gold. "📊 RESULTS / SUBMIT" gold-bordered action button. Maps cleanly to a futures contract card: instrument name, expiry countdown, position indicator.

**7. Terminal-Style Search Input**
`terminalInput` with `#0e0e0e` background, 1px `#2a2a2a` border, monospace font. Placeholder: `> SEARCH BY CITY, STATE, OR TEAM NAME...` — the `>` prompt prefix is a direct terminal metaphor. Focuses to gold border (`terminalInputFocused`).

**8. Market Close Countdown**
Footer: `"🔔 MARKETS OPEN · Next close in HH:MM:SS"` counting to midnight. One of the most distinctive brand touches in the screen — treating 24-hour reset as a trading day.

---

### BENCHMARK: WEBULL
*Criteria: data density, real-time ticker, color coding conventions*

| Feature | Webull Has | At0m Has | Match? |
|---|---|---|---|
| Scrolling ticker tape | ✅ | ✅ | ✅ Full match |
| Green/red gainers color | ✅ | ✅ | ✅ Full match (#00C853 / #FF1744) |
| Monospace data columns | ✅ | ✅ | ✅ Full match |
| Dark market UI | ✅ | ✅ | ✅ Full match |
| Real-time WebSocket data refresh | ✅ | ❌ | ❌ Miss — static after load |
| Sparkline mini-charts in rows | ✅ | ❌ | ❌ Miss |
| Numeric delta per ticker item | ✅ | ❌ | ❌ Ticker shows text, not `ATHLETE ▲2.3%` |
| % change column in leaderboard | ✅ | ❌ | ❌ 7D column shows `—` |
| Volume data | ✅ | ❌ | ❌ No volume proxy |
| Filter by sector/category | ✅ | ✅ | ✅ Sport filter matches |

**Webull Score: 5/10 criteria met** — The aesthetic and metaphor match. The live-data layer is the gap.

### BENCHMARK: ROBINHOOD
*Criteria: dark UI polish, number animations, portfolio feel*

| Feature | Robinhood Has | At0m Has | Match? |
|---|---|---|---|
| Dark theme, minimal chrome | ✅ | ✅ | ✅ Full match |
| Portfolio "total value" hero number | ✅ | ✅ | ✅ AT0M FITNESS INDEX is this |
| Animated number counter | ✅ | ❌ | ❌ Miss — no Animated.Value number transitions |
| Portfolio sparkline graph | ✅ | ❌ | ❌ Index card has no historical chart |
| Position cards with P&L | ✅ | partial | ⚠️ Competition cards = positions, but no P&L |
| Swipe-to-trade gesture | ✅ | ❌ | ❌ No swipe interactions |
| Color flash on price change | ✅ | ❌ | ❌ No number flash animation |
| Clean type hierarchy | ✅ | ✅ | ✅ Strong hierarchy: 36px index > 16px row > 10px label |
| Pull-to-refresh | ✅ | ✅ | ✅ Gold tintColor on RefreshControl |

**Robinhood Score: 5/9 criteria met** — Polish is there. The signature Robinhood number animation (green flash on gain, red flash on loss) is the standout miss. Without it, the financial metaphor is visual, not kinetic.

### BENCHMARK: BLOOMBERG TERMINAL
*Criteria: information architecture, monospace data, data density*

| Feature | Bloomberg Has | At0m Has | Match? |
|---|---|---|---|
| Monospace font throughout | ✅ | ✅ | ✅ Courier/monospace on all data |
| ALL_CAPS section headers | ✅ | ✅ | ✅ Perfect match |
| Multi-column data table | ✅ | ✅ | ✅ Teams tab: RANK/TEAM/MBR/MKT CAP/7D |
| Color-coded status fields | ✅ | ✅ | ✅ Green/red/gold status correctly coded |
| Command-line input | ✅ | ✅ | ✅ `>` prefix on search input |
| Real-time streaming data | ✅ | ❌ | ❌ Data is request-response, not stream |
| 7D / YTD / MTD delta columns | ✅ | ❌ | ❌ 7D shows `—` placeholder |
| Keyboard command shortcuts | ✅ | ❌ | ❌ Touch-only, no quick commands |
| Data drill-down on tap | ✅ | partial | ⚠️ Expanded row shows "—" placeholders |
| High info density per screen | ✅ | partial | ⚠️ Gains/losers panel is dense; main LB is moderate |

**Bloomberg Score: 6/10 criteria met** — Best match of the five benchmarks. The monospace architecture and multi-column table in the TEAMS tab are genuinely Bloomberg-esque. The 7D column with live data would push this to 8/10.

### BENCHMARK: COINBASE
*Criteria: crypto leaderboard/portfolio aesthetic, live price feel*

| Feature | Coinbase Has | At0m Has | Match? |
|---|---|---|---|
| Dark UI with primary accent color | ✅ | ✅ | ✅ (gold instead of blue) |
| Token-denominated values | ✅ | ✅ | ✅ ⚛ tokens = crypto symbol |
| Leaderboard with rank + value | ✅ | ✅ | ✅ Full match |
| Open/Full status badges | ✅ | ✅ | ✅ Green OPEN / Red FULL |
| Portfolio "all holdings" view | ✅ | partial | ⚠️ TEAMS tab is portfolio-like |
| Live price feed | ✅ | ❌ | ❌ Static |
| 24h % change | ✅ | ❌ | ❌ No daily delta |
| Candlestick / price chart | ✅ | ❌ | ❌ No chart |
| Market cap rank | ✅ | ✅ | ✅ Labeled "MKT CAP" with rank |
| Send/receive equivalent | ✅ | ❌ | ❌ No token transfer |

**Coinbase Score: 6/10 criteria met** — The token metaphor maps cleanly to crypto. Static data is the limiting factor.

### BENCHMARK: THINKORSWIM (TD AMERITRADE)
*Criteria: market depth, professional trading terminal, data density*

| Feature | thinkorswim Has | At0m Has | Match? |
|---|---|---|---|
| Professional terminal aesthetic | ✅ | ✅ | ✅ Dark/mono/gold matches pro look |
| Multi-panel layout | ✅ | partial | ⚠️ Three tabs, not simultaneous panels |
| Opening bell metaphor | ✅ | ✅ | ✅ MarketBellOverlay is best-in-class |
| Market hours tracking | ✅ | ✅ | ✅ Close countdown in footer |
| Real-time data streams | ✅ | ❌ | ❌ No streaming |
| Order book / depth chart | ✅ | ❌ | ❌ No competition depth visualization |
| Custom alerts / triggers | ✅ | ❌ | ❌ No notification on rank change |
| Historical chart overlay | ✅ | ❌ | ❌ No AT0M INDEX history chart |
| Watchlist | ✅ | ❌ | ❌ No "watching" specific athletes/teams |
| Hotkeys / power user features | ✅ | ❌ | ❌ Touch-only |

**thinkorswim Score: 4/10 criteria met** — The opening bell and close countdown are the strongest thinkorswim-adjacent touches. The rest of the professional terminal depth (order book, real-time alerts, chart overlays) is out of scope for a fitness app but represents the gap between "looks like a terminal" and "functions like one."

---

### TRADING APP BENCHMARK SUMMARY

| Benchmark | Score | Top Match | Biggest Gap |
|---|---|---|---|
| Webull | 5/10 | Ticker + color coding | Real-time data, sparklines |
| Robinhood | 5/9 | Dark UI polish, index card | Number animations, sparkline graph |
| Bloomberg Terminal | 6/10 | Monospace architecture, multi-column | Live 7D delta, data drill-down |
| Coinbase | 6/10 | Token metaphor, rank system | Live prices, 24h change |
| thinkorswim | 4/10 | Opening bell, market hours | Real-time streams, order book depth |

**CompeteScreen vs. Trading Apps: The concept executes at 50-60% of the trading app standard — which is exceptional for a fitness app.** The visual and conceptual layer is there. The live-data layer is not. Adding Supabase real-time subscriptions (`supabase.channel().on('postgres_changes'...)`) would push this into 70-80% territory. The number animation gap (Robinhood-style green flash on token gain) is a one-weekend implementation that would dramatically increase perceived liveness.

### CompeteScreen V6 Grade Breakdown

| Dimension | Grade | Notes |
|---|---|---|
| Concept originality | A+ | No fitness app has attempted this metaphor |
| Visual execution | A | Dark/gold/mono consistently applied |
| Market Bell overlay | A+ | Best single component in the app |
| Ticker tape implementation | A- | Correct animation; data could be richer |
| Gainers/losers panel | A- | Colors correct; `bottomDrop` is actually bottom of LB, not worst performance |
| Teams market cap table | A- | Column structure correct; 7D = "—" breaks the metaphor |
| Competition cards | A- | Live countdown is strong; no bid/ask depth equivalent |
| Find Team (terminal UX) | B+ | `>` prompt is a nice detail; no Near Me GPS |
| Join/Manage flows | A- | Approve/decline, pending requests, team status — complete |
| Expanded row data | C+ | "Weekly workouts: — · Runs: — · Top lift: —" are dead placeholders |
| Real-time data | C | Static after load — the core gap vs. trading apps |

**Overall CompeteScreen: A- / 8.5/10**

---

## GYM SCREEN — NEW SCREEN REVIEW

### GymScreen V6: B+ / 7.5/10 *(new screen)*

A full gym discovery and management platform implemented as a single screen with nested navigation. Comparable to a stripped-down Mindbody or Gympass discovery flow, delivered in React Native with the At0m design system.

#### ✅ What Works

**DISCOVER tab** — Search input + filter chips (All/Premium/Verified). GymCard renders: name, verified badge (✓ VERIFIED in green), premium badge (⭐ PREMIUM in gold), location, member count, description, follow/owner/member CTA. Filtered by text search across name/city/state and chip selection.

**MY GYM tab — Gym Profile** — Cover placeholder with initial-letter logo (gold circle, dark bg border). Gym name + verified + premium badges in header. Website clickable via `Linking.openURL`. Description. MANAGE GYM button for owners.

**Three inner tabs** (Events / Merch / Members):
- **Events**: Owner can tap "+ CREATE EVENT" → slide-up modal with full form (title, type, date/time, location, distance, capacity, visibility). Type chips: Group Run / Group Workout / Competition / Open. `evDate` + `evTime` combined to ISO string.
- **Merch**: 2-column grid with 👕 placeholder image, name, price, BUY button → `Linking.openURL(purchase_url)`. Owner "+ ADD MERCH" modal with name/desc/price/URL.
- **Members**: Avatar (initial), name, location, role badge. Fetches `gym_members` joined with `profiles`.

**MANAGE GYM modal** — Name/description/website/city/state/tier (basic/premium chip). Quick actions row: "📅 CREATE EVENT" + "👕 ADD MERCH" buttons inline. Tier note for basic tier explaining upgrade path.

**Owner flow is complete** — Create gym → owner automatically joined as `role: 'owner'` → gym profile populates → inner tabs for management. This is a full gym CMS in one screen.

#### ⚠️ Remaining Gaps

**No image upload.** Cover photo and gym logo are placeholders. This is the single most visible gap — every real gym app (Mindbody, Facebook groups, Google My Business) has a photo. Even a simple `expo-image-picker` for the logo would dramatically increase the professional feel.

**Premium tier is gated but not purchasable.** Same Stripe gap as ProfileScreen. The `subscription_tier` toggle exists in the Manage modal but selecting "premium" doesn't trigger a payment flow — it just updates the database field. A gym owner can self-upgrade for free, which defeats the business model.

**EVENTS tab is redundant.** The third outer tab "EVENTS" in GymScreen shows the same `gymEvents` already visible under MY GYM → Events inner tab. It adds no new functionality for the screen count cost.

**No analytics dashboard for gym owners.** Strava Clubs and Apple Fitness+ gym features show workout counts, popular times, and member activity. GymScreen has no owner analytics.

**No map view for Discover.** "Find gyms near you" with no map is misleading — it's text search, not proximity discovery. A simple MapView pin display would make this genuine location-based discovery.

**Merch BUY goes to external URL.** No in-app cart, no payment, no order tracking. This is correct for V1 but limits the revenue capture potential significantly.

---

## EVENTS SCREEN — NEW SCREEN REVIEW

### EventsScreen V6: B+ / 7.5/10 *(new screen)*

A unified public events feed that aggregates gym-hosted and team-hosted events in one view. Clean, registration-capable, Near Me filtered.

#### ✅ What Works

**EventCard** — Emoji type indicator (🏃 / 🏋️ / 🏆 / ⚔️), title in 16px bold, host name with GYM/TEAM badge (gold for gym, blue for team — correct visual hierarchy). Full date format (`Saturday Apr 1 · 7:00 AM`). Location with 📍. Distance for runs (`📏 3.1 mi`). Registration capacity bar (`N / 50 registered`). REGISTER button (gold fill → dark background text) or FULL badge in red. REGISTERED ✓ badge for already-registered.

**Registration flow** — `supabase.from('event_registrations').insert(...)` with `error.code === '23505'` duplicate protection. Alert confirmation on success. Real-time count update via `loadData()` after register.

**Filter chips** — All / Group Run / Group Workout / Competition / Open. `FILTER_TO_TYPE` map converts label to DB enum. Horizontal scroll for overflow.

**Near Me filter** — Switch toggle. Pulls `profile.state` and filters `ev.state === userState`. Graceful no-state state: "Add your state to your profile to use Near Me filter." This is a real feature, not a placeholder.

**MY EVENTS section** — `myUpcomingEvents` derived from `myRegistrations`. `MyEventCard` with date box (day number + month in gold), countdown string (`3d 2h away`), event title, host name. Correct sorting by `event_date`.

**Host resolution** — Separate `gymHostIds` and `teamHostIds` arrays, parallel Supabase fetches for `gyms.name` and `teams.name`, merged into `hostNames` map keyed by `host_id`. Correct even when gyms and teams share UUIDs.

#### ⚠️ Remaining Gaps

**Near Me uses state, not GPS.** The switch is labeled "Near Me" but filters by `profile.state` string match — this is state-level, not actual proximity. A user in Atlanta and a user in rural Georgia see the same results. True Near Me requires `expo-location` + Haversine filtering against event lat/lng.

**No event detail page.** Tapping an EventCard opens nothing. Full description, directions, roster preview, and who-else-is-going are expected standard features (Eventbrite, Meetup, Strava Local Events all have detail pages). Currently the description field in the events table is loaded but not displayed on the card.

**No unregister/cancel flow.** Users can register but cannot cancel. For real-world events with limited capacity, this is a UX and operational gap.

**No push notifications for registered events.** "You have an event in 24h" is a standard feature of every event platform (Eventbrite, Meetup, Facebook Events). Without push notifications, EventsScreen is self-service only.

**Competition events in EventsScreen are read-only.** A user can register for an `open_competition` from EventsScreen but must navigate to CompeteScreen to submit results. The split creates a broken mental model: "I registered here, why do I submit there?"

**No host profile tap.** Tapping the gym or team name should navigate to the gym/team profile. Currently non-interactive.

---

## NAVIGATION ARCHITECTURE — V6 RE-GRADE

### Navigation V6: A- / 8.5/10 *(was B / 7.0 — ↑ +1.5)*

The navigation restructure is the second-biggest grade jump in V6 (behind CompeteScreen). Going from 8 flat tabs to 5 grouped stacks solves the crowded tab bar problem that was flagged as a minor-to-medium gap in every report since V3.

#### ✅ What Changed

**5 bottom tabs, each with a logical stack:**
- `Home` → HomeScreen (flat, `headerShown: true`)
- `Train` → TrainNavigator (Workout → Run → AIWorkout → Progress)
- `Compete` → CompeteNavigator (CompeteScreen → EventsScreen)
- `Community` → CommunityNavigator (GymScreen → CalendarScreen → NutritionScreen)
- `Profile` → ProfileScreen (flat, `headerShown: true`)

**TabIcon component** — Emoji at `fontSize: 20`, opacity: `focused ? 1 : 0.45`. Clean, no dependencies, works cross-platform.

**Shared screenOptions** — Single `screenOptions` object applied to all stacks: `surface` header background, `border` separator, `text` tint color, 700 weight + 1 letterSpacing on title. Consistent across all five navigators.

**Dead code removed** — `HomeStackNav` (defined but unused since V5) is gone. Navigation file is clean.

**LiveRun still root-level** — `LiveRunScreen` remains a root `Stack.Screen` with `headerShown: false` giving the full-screen map. This is the correct architecture — LiveRun should not live inside a tab.

#### ⚠️ Remaining Gaps

**Progress is buried in Train stack.** A user who only wants to check analytics must navigate to Train tab first, then scroll/navigate to Progress. This is better than V5 (where Progress was a tab), but Progress is an analytics tool that arguably deserves direct access. However, grouping it under Train is architecturally logical — it's not a regression, it's a design tradeoff.

**Community stack groups unlike features.** Gym, Calendar, and Nutrition share the "Community" tab, but Nutrition and Calendar are personal tools, not community features. The Community → Calendar path is counterintuitive. A user looking for their workout calendar will look in Train first. That said, this is a V6 structural decision that works — it just needs user testing to validate.

**Events is nested under Compete.** CompeteNavigator has `CompeteScreen → EventsScreen`. Events from gyms and teams are conceptually Community-level features, not purely Compete features. A gym's yoga class showing up under "Compete" may create category confusion. This is navigable but not ideal.

**No deep links.** Still no `Linking` scheme to open a specific event, competition, or profile from a push notification.

---

## TOP 3 GRADE JUMPS — V5 → V6

### 🥇 #1: Compete / Leaderboard Screen — +2.0 points

**B- / 6.5 → A- / 8.5**

The transformation from static token leaderboard to Wall Street trading terminal. Ticker tape, AT0M FITNESS INDEX, Market Bell overlay, gainers/losers panel, market cap table with Bloomberg columns, futures-style competition cards, terminal input, market close countdown — all executed with monospace font, gold-on-dark palette, and correct financial color conventions. No competing fitness app has built anything like this. The concept alone is worth the grade jump; the execution quality confirms it.

### 🥂 #2: Navigation Architecture — +1.5 points

**B / 7.0 → A- / 8.5**

8 flat tabs collapsed to 5 grouped stacks. `HomeStackNav` dead code deleted. LiveRun correctly placed at root. Each group (Train / Compete / Community) contains logically related screens in nested stacks. The `TabIcon` component with opacity-based focus state is clean. `screenOptions` shared across all navigators ensures visual consistency. This is the structural fix the app needed since V1 — it finally has a mature navigation architecture.

### 🥉 #3 (TIE): GymScreen + EventsScreen — New Platform Layer

**❌ → B+ / 7.5 (both)**

Two complete new screens establishing the community infrastructure. GymScreen delivers a full gym CMS: discovery, follow, owner profile with events/merch/member sub-tabs, manage modal with tier system. EventsScreen delivers a public events aggregator with registration, capacity tracking, Near Me filter, and My Events section. Together these elevate At0m from "solo training app" to "fitness platform." Strava has Clubs (partial), Mindbody has gym profiles (partial), no fitness app has both unified with competitions and team discovery in one product.

---

## REMAINING GAPS TO REACH A / 8.5+ OVERALL

### P0 — Non-Negotiable for A Tier

| Gap | Screen | Effort | Impact |
|---|---|---|---|
| **Background GPS tracking** (`startLocationUpdatesAsync`) | LiveRun | High | Critical — still the #1 missing feature for serious runners |
| **Stripe subscription purchase** (actual payment flow) | Profile + Gym | High | Critical — Pro and Premium tiers exist but can't be purchased |

### P1 — CompeteScreen Data Quality (kills the Wall Street metaphor)

| Gap | Component | Effort | Impact |
|---|---|---|---|
| **Live 7D token delta** for teams leaderboard | TEAMS tab | Medium | High — 7D = "—" breaks Bloomberg metaphor |
| **Expanded leaderboard row data** (real weekly stats) | LeaderboardRow | Medium | High — "Weekly workouts: —" breaks click-to-detail UX |
| **Animated number transitions** on token counts | Global | Medium | High — Robinhood's signature feature; makes data feel live |
| **Supabase real-time subscription** for leaderboard | CompeteScreen | Medium | High — live updates without pull-to-refresh |
| **INDEX history sparkline** in AT0M Fitness Index card | CompeteScreen | Low | Medium — portfolio chart under the headline number |

### P1 — New Screen Gaps

| Gap | Screen | Effort | Impact |
|---|---|---|---|
| **Event detail page** (description, directions, roster) | EventsScreen | Medium | High — no tap destination is a UX dead end |
| **Image upload** for gym logo/cover | GymScreen | Medium | High — placeholder is the most visible gap |
| **Unregister from event** | EventsScreen | Low | Medium — basic CRUD |
| **Near Me GPS** (true distance, not state match) | EventsScreen | Medium | Medium — current implementation is misleading |
| **Competition result in EventsScreen** (eliminate CompeteScreen split) | EventsScreen | Medium | Medium — broken UX split |

### P2 — Carry-forward from V5

| Gap | Screen | Effort | Impact |
|---|---|---|---|
| Audio/haptic cues during runs (mile split beep/speak) | LiveRun | Medium | High |
| Multi-day AI program generation (4-week mesocycle) | AIWorkout | High | High |
| PR source fix (query `exercise_sets` max vs. summary) | Progress | Low | Medium |
| Km mode | LiveRun/Run | Low | Medium |
| Full onboarding flow (equipment/goal wizard) | SignUp | Medium | High |
| Body composition composite chart (weight + BF% overlay) | Progress | Low | Medium |
| Push notification support | Global | High | High |

---

## SPECIFIC TRADING APP FEATURE GAPS

*What Webull / Robinhood have that At0m doesn't — ordered by implementation effort*

### Easy Wins (< 1 week each)

1. **Number animation on token value change** (Robinhood) — `Animated.timing` on the token count in LeaderboardRow when refreshed. Flash green for gain, red for loss.
2. **Percentage change column** (Webull) — Add 24h delta query and a `Δ%` column to the individual leaderboard alongside token count.
3. **Ticker items with numeric values** (Webull) — Change `"ATHLETE — 1,250 tokens"` to `"ATHLETE ▲ +125 (+11.2%)"` format.

### Medium Effort (1–2 weeks each)

4. **INDEX sparkline chart** (Robinhood portfolio graph) — Line chart of AT0M FITNESS INDEX over last 30 days below the hero number. SVG via react-native-svg (already in project for ProgressScreen).
5. **7D delta for team market cap** (Bloomberg/Webull) — `team_token_snapshots` table with daily inserts; 7D delta = `today - 7_days_ago`.
6. **Supabase realtime leaderboard** (all trading apps) — `supabase.channel('leaderboard').on('postgres_changes', ...)` subscription. Updates rows without pull-to-refresh.
7. **Expanded row real data** (Bloomberg drill-down) — On leaderboard row tap, query the user's `workouts` and `runs` from the last 7 days and display actual stats.

### Larger Effort (2-4 weeks)

8. **Athlete "watchlist"** (Webull/Coinbase) — Star/watch specific athletes or teams. "Following 3 · 1 up, 1 down today."
9. **Competition order book** (thinkorswim depth chart) — Show how many athletes have submitted results in each score range. Distribution histogram = market depth equivalent.
10. **Custom alerts** (thinkorswim alerts) — "Notify me when I fall out of the top 10" / "Notify me when a team opens near me."

---

## FINAL V6 SCORECARD

| Screen / Feature | V1 | V2 | V3 | V4 | V5 | V6 |
|---|---|---|---|---|---|---|
| Splash Screen | B / 7.0 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 | B+ / 7.5 |
| Login Screen | B- / 6.0 | B+ / 7.5 | A- / 8.0 | A- / 8.0 | A- / 8.0 | A- / 8.0 |
| Sign Up Screen | C / 5.0 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| Home Screen | C+ / 5.5 | B- / 6.5 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| Workout Screen | D+ / 4.0 | B- / 6.5 | B+ / 7.5 | B+ / 7.5 | A- / 8.5 | A- / 8.5 |
| AI Workout Screen | ❌ | ❌ | ❌ | ❌ | A- / 8.5 | A- / 8.5 |
| Run Screen | B- / 6.5 | B / 7.0 | B+ / 7.5 | B+ / 7.5 | A- / 8.5 | A- / 8.5 |
| Live Run Screen | ❌ | ❌ | ❌ | ❌ | A- / 8.5 | A- / 8.5 |
| Progress Screen | D+ / 4.0 | C+ / 6.0 | C+ / 6.0 | B+ / 7.5 | A- / 8.5 | A- / 8.5 |
| Profile Screen | D / 3.5 | C+ / 6.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| ForgotPassword Screen | ❌ | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 | B / 7.0 |
| Nutrition Screen | ❌ | ❌ | B- / 6.5 | B- / 6.5 | B / 7.0 | B / 7.0 |
| Compete / Leaderboard | ❌ | ❌ | B- / 6.5 | B- / 6.5 | B- / 6.5 | **A- / 8.5 ↑** |
| Calendar Screen | ❌ | ❌ | B / 7.0 ⚠️ | B+ / 7.5 | B+ / 8.0 | B+ / 8.0 |
| **Gym Screen** | ❌ | ❌ | ❌ | ❌ | ❌ | **B+ / 7.5 NEW** |
| **Events Screen** | ❌ | ❌ | ❌ | ❌ | ❌ | **B+ / 7.5 NEW** |
| Navigation Architecture | C / 5.0 | C+ / 5.5 | B- / 6.5 | B- / 6.5 | B / 7.0 | **A- / 8.5 ↑** |
| Design System | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 | A- / 8.5 |
| **OVERALL** | **D+ / 4.5** | **C+ / 6.5** | **B / 7.1** | **B / 7.4** | **A- / 8.0** | **A- / 8.3 ↑** |

*⚠️ V3 Calendar carried a critical DB bug (missing tables). Resolved in V4.*

---

## OVERALL V6 ASSESSMENT

### New Overall Grade: A- / 8.3/10 *(was A- / 8.0 in V5 — ↑ +0.3)*

V6 is the platform expansion pass — the pass where At0m Fit stops being a training utility and starts being a fitness ecosystem. Three major additions define it:

**1. Wall Street Compete UI** is the most original feature in the project's history. The "fitness as financial market" metaphor is executed with genuine craft: working ticker tape, opening bell ceremony, market cap tables with Bloomberg column structure, futures-style competition cards, terminal-prompt search input, and market close countdown. No competing fitness app has attempted this positioning. The gap versus actual trading apps is real-time data — static numbers in a market UI are inert. But the visual and conceptual layer is production-quality and brand-defining.

**2. Navigation restructure** from 8 flat tabs to 5 grouped stacks solves the app's most persistent structural problem. `HomeStackNav` dead code is deleted. LiveRun is correctly root-scoped. The `TrainNavigator`, `CompeteNavigator`, and `CommunityNavigator` stacks are logically grouped and share consistent screen options. This is the navigation architecture the app should have had at V2.

**3. Gym + Events platform layer** establishes At0m as an ecosystem rather than a solo app. Gym owners have a full CMS (create gym, manage events, list merch, approve members). Users have a public events feed with registration, type filtering, Near Me toggle, and their registered events tracked. These two screens together exceed what Strava Clubs offers and approach Mindbody's gym discovery UX.

The delta from A- / 8.0 to A- / 8.3 is +0.3 — significant but measured, because the P0 carry-forwards (background GPS, Stripe) are still unresolved and one new gap was introduced (CompeteScreen placeholder data). The path from 8.3 to A / 8.5+ is:

1. **Background GPS** — Levi runs 15+ miles/week. At0m cannot be his daily driver until GPS runs in the background.
2. **Stripe** — Every Pro/Premium gate in the app is inaccessible to real users.
3. **CompeteScreen data** — 7D delta, expanded row stats, and number animations. The Wall Street metaphor demands live numbers.

Those three items are the bridge from A- to A.

---

*Report generated by At0m Prime QC | 2026-03-14 | v6*
