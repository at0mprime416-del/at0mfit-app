# ⚛️ AT0M FIT — PRODUCT REQUIREMENTS DOCUMENT
**Version:** 1.0 | **Date:** 2026-03-14 | **Author:** At0m Prime

---

## 1. PRODUCT OVERVIEW

At0m Fit is a full-stack AI-powered fitness platform combining personalized workout generation, wearable integration, competition rankings, team social features, nutrition intelligence, a gear store, and gym networking — all wrapped in a brutally honest, cynically funny tone that respects the user's time.

**Tiers:** Free | Paid (Pro) | Creator

---

## 2. ONBOARDING FLOW

### 2.1 Liability Agreement (Screen 1)
- Full liability waiver before anything else
- User must scroll to bottom + tap "I Accept (and I won't sue you when I skip leg day)"
- Store: `accepted_liability_at` timestamp in profiles table
- Must re-accept if TOS updated

### 2.2 Account Creation (Screen 2)
- Name, email, password
- Optional: Profile photo
- Tagline field: "In one sentence, describe your fitness identity" (feeds AI persona)

### 2.3 Physical Metrics (Screen 3 — "The Numbers Don't Lie")
**Required for AI workout + nutrition generation:**
- Age
- Biological sex
- Height (ft/in or cm)
- Current weight (lbs or kg)
- Goal weight (optional)
- Body fat % (optional — or estimate via visual guide)
- Dominant hand (left/right) — for injury-aware programming
- Fitness level: Beginner / Intermediate / Advanced / "I used to be great" (Deload)

**Tone copy examples:**
- Height field label: *"How tall are you? Be honest. We can't verify this."*
- Weight field label: *"Current weight. The number you avoid looking at."*
- Body fat: *"Optional. Most people skip this. Most people also skip cardio. Coincidence?"*

### 2.4 Training Style (Screen 4 — "What's Your Damage")
**Multi-select checkboxes:**
- Powerlifting / Strength
- Bodybuilding / Hypertrophy
- CrossFit / Functional
- HIIT / Conditioning
- Calisthenics / Bodyweight
- Endurance / Cardio
- Sports Performance
- Rehab / Low Impact
- "I just wander around the gym hoping something works"

**Free text field:**
- *"Describe what you normally do in the gym. Don't filter yourself. We've heard worse."*
- (2-3 sentence prompt, stored for AI context)

### 2.5 Goals & Availability (Screen 5)
- Primary goal: Strength / Muscle / Fat Loss / Endurance / Performance / "Look better naked"
- Days per week available: 1–7 (slider)
- Session length: 30 / 45 / 60 / 90 / 120 min
- Equipment access: Full Gym / Home Gym / Dumbbells Only / Bodyweight / "Whatever's Around"
- Injuries or limitations: free text + common checkboxes (knee, shoulder, lower back, etc.)

**Tone copy:**
- Days per week: *"How many days can you actually commit? Not aspirationally. Actually."*
- Injuries: *"Anything broken, torn, or generally angry? List it. We'll work around it."*

### 2.6 Gym Link (Screen 6 — Optional)
- Search gym by name or zip code
- Link profile to a gym (pulls from gym database)
- Sets home gym in profile
- Copy: *"Find your gym. Or don't. The barbell doesn't care either way."*

### 2.7 Wearable Connection (Screen 7 — Optional)
- Connect: Apple Watch / Garmin / Fitbit / Whoop / Polar / Samsung / Suunto
- Permissions: heart rate, HRV, sleep, steps, calories, VO2 max
- Copy: *"Connect your watch. It's been judging your sleep for years — might as well make it useful."*

### 2.8 Subscription (Screen 8)
**Free Tier:**
- AI workout generation (3/month)
- Basic progress tracking
- Access to competition leaderboard (view only)
- News feed
- Team membership (join only)

**Pro Tier ($X/mo or $X/yr):**
- Unlimited AI workouts
- Full nutrition + macro calculations
- Wearable sync + AI summaries
- Team creation
- Competition submission
- Gear store access
- DMs + group chat

**Creator Tier ($X/mo):**
- Everything in Pro
- Create public workout programs
- Team branding
- Monetize programs (revenue share)
- Analytics dashboard

**Copy:** *"Free is free. Pro is cheap. Creator is for people who are serious. Pick one."*

### 2.9 Payment (Screen 9 — if Pro/Creator selected)
- Stripe integration
- Apple Pay / Google Pay supported
- Shows plan summary before charge
- Receipt emailed automatically

### 2.10 Completion → Feed
- Brief animation: "⚛️ Profile built. Workout incoming."
- AI immediately generates first workout based on onboarding data
- **Redirect straight to Feed** — no extra steps

---

## 3. NAVIGATION STRUCTURE

```
FEED (home)                    ← default landing
├── Profile (top left avatar)
│   ├── Edit Profile
│   ├── Physical Stats
│   ├── Gym Link
│   ├── Wearable Devices
│   ├── Subscription
│   └── Settings
├── Dropdown Menu
│   ├── Workouts
│   │   ├── Today's Workout (AI generated)
│   │   ├── Workout History
│   │   └── Saved Programs
│   ├── Progress
│   │   ├── Body Metrics Over Time
│   │   ├── Strength PRs
│   │   └── Wearable Data Trends
│   ├── Injuries
│   │   ├── Active Injuries Log
│   │   ├── Recovery Tracking
│   │   └── Modified Workout History
│   ├── Nutrition
│   │   ├── Macros (AI calculated from profile)
│   │   ├── Supplement Stack
│   │   ├── Meal Log
│   │   └── AI Nutrition Summary
│   └── Teams
│       ├── My Team(s)
│       ├── Team Leaderboard
│       ├── Group Chat
│       └── DMs
├── Competition
│   ├── Submit Performance
│   ├── National Leaderboard
│   ├── State Leaderboard
│   └── County Leaderboard
├── News
│   ├── Powerlifting
│   ├── Bodybuilding
│   ├── CrossFit
│   ├── MMA / Combat Sports
│   └── Track & Field / Endurance
└── Gear Store
    ├── Featured
    ├── Apparel
    ├── Equipment
    └── Supplements
```

---

## 4. AI FEATURES

### 4.1 Workout Generation
**Input data:**
- Onboarding metrics (age, weight, height, body fat, level)
- Training style preferences
- Goals, availability, equipment
- Injury flags
- Wearable data (HRV, sleep score, recovery)
- Recent workout history (progressive overload logic)
- Free-text gym description

**Output:**
- Full workout plan with sets/reps/weights/rest
- Exercise swap suggestions for injuries
- Warm-up + cool-down
- Estimated time
- Motivational note (in cynical At0m voice)

### 4.2 Wearable AI Summary (Daily)
- Pulls last 24h wearable data
- Generates: Recovery Score / Readiness / Efficiency Recommendations
- Tone: *"Your HRV suggests you had a rough night. Either train light or explain yourself."*

### 4.3 Nutrition & Macro Calculator
- Inputs: age, weight, height, goal, activity level, dietary preference
- Outputs: calories / protein / carbs / fats
- Supplement recommendations based on goals
- Updates dynamically as weight/goals change

### 4.4 Progress Intelligence
- Weekly AI summary emailed/notified
- Identifies plateaus, recommends adjustments
- Compares current week vs last 4 weeks

---

## 5. COMPETITION SYSTEM

### 5.1 How It Works
- Members submit performance numbers (lifts, times, distances)
- **Verified documents required** to appear on leaderboard:
  - Official meet results (PDF/photo)
  - Coach/official signature
  - Video submission (optional, for unverified lifts)
- Numbers only displayed (no names unless user opts in)
- Rankings: National / State / County

### 5.2 Categories
- Powerlifting (Total: S/B/D)
- Weightlifting (Snatch / Clean & Jerk / Total)
- Strongman (individual events)
- HYROX / Functional Fitness
- Run (1mi, 5K, 10K, Half, Full)
- CrossFit benchmark workouts (Fran, Murph, etc.)
- Body Transformation (before/after, judged)

### 5.3 Verification Flow
1. Submit numbers + supporting document
2. At0m review queue (manual + AI flag)
3. Approved → appears on board within 24h
4. Disputed → flagged for manual review

---

## 6. TEAMS FEATURE

### 6.1 Structure
- Any Pro/Creator user can create a team
- Teams have: name, logo, description, privacy (public/invite-only)
- Members can join multiple teams
- Team gym link (optional)

### 6.2 Communication
- **Group Chat** — all team members
- **DMs** — member to member (within same team)
- Push notifications for messages
- @mention support
- Media sharing (workout videos, progress photos)

### 6.3 Team Leaderboard
- Ranks teams by aggregate competition points
- Weekly activity score (workouts logged by team members)
- Team challenges (create a custom challenge, invite teams)

---

## 7. GYM NETWORK

### 7.1 Gym Database
- Search by name, city, zip
- Gym profile: name, address, hours, equipment list, photo
- "Claim your gym" — gym owners can verify and manage listing
- Member count displayed per gym

### 7.2 Gym Features
- See other members at your gym (if they opt in)
- Gym-specific leaderboard
- Gym news/announcements (owner-posted)
- Link gym to team

---

## 8. GEAR STORE

### 8.1 Frontend (User-Facing)
- Browse by category: Apparel / Equipment / Supplements
- Featured drops / limited items
- Team merch (Creator tier — custom team store)
- Add to cart → checkout via Stripe

### 8.2 Backend (Admin)
- Product management (name, price, SKU, inventory, images)
- Order management
- Revenue dashboard
- Creator revenue share tracking (Creator tier)
- Fulfillment integration (Printful or Shopify backend)

---

## 9. NEWS FEED

### 9.1 Sources (Top 5 Civilian Fitness Sports)
1. Powerlifting (IPF, USAPL, SPF)
2. Bodybuilding (NPC, IFBB)
3. CrossFit (CrossFit Games, Open)
4. Endurance (RunnerWorld, Triathlon, HYROX)
5. MMA / Combat Sports (UFC, Bellator fitness coverage)

### 9.2 Features
- User subscribes to 1–5 categories during onboarding or in settings
- RSS/API aggregation
- Bookmark articles
- Share to team chat

---

## 10. NOTIFICATIONS

- New team message (group + DM)
- Daily workout reminder (user-set time)
- Weekly AI progress summary
- Competition result approved/rejected
- Wearable sync alert
- Gear order shipped
- Team challenge started/ended

---

## 11. DATABASE SCHEMA (EXPANDED)

### New tables needed (beyond current profiles/workouts/exercises):

```sql
-- ONBOARDING
user_metrics (id, user_id, age, sex, height_cm, weight_kg, body_fat_pct, dominant_hand, fitness_level, training_styles[], gym_description, goals, days_per_week, session_length_min, equipment_type, injuries_text, created_at, updated_at)

-- WEARABLES
wearable_devices (id, user_id, device_type, connected_at, access_token_encrypted)
wearable_data (id, user_id, date, hrv, resting_hr, sleep_hours, sleep_score, steps, calories_burned, vo2_max, recovery_score, source)

-- SUBSCRIPTIONS
subscriptions (id, user_id, tier ['free','pro','creator'], stripe_customer_id, stripe_subscription_id, status, current_period_end)

-- GYMS
gyms (id, name, address, city, state, zip, lat, lng, equipment[], hours, claimed_by, created_at)
user_gyms (id, user_id, gym_id, is_primary, joined_at)

-- TEAMS
teams (id, name, logo_url, description, privacy ['public','invite'], creator_id, gym_id, created_at)
team_members (id, team_id, user_id, role ['leader','member'], joined_at)
team_messages (id, team_id, sender_id, content, media_url, created_at)
direct_messages (id, from_user_id, to_user_id, team_id, content, media_url, read_at, created_at)

-- COMPETITION
competition_submissions (id, user_id, category, lift_type, value_numeric, unit, event_date, document_url, video_url, status ['pending','approved','rejected'], verified_at, location_city, location_state)
competition_leaderboard (id, submission_id, user_id, category, value_numeric, rank_national, rank_state, rank_county, updated_at)

-- NUTRITION
nutrition_profiles (id, user_id, calories_target, protein_g, carbs_g, fat_g, dietary_preference, calculated_at)
supplement_stacks (id, user_id, name, timing, notes, created_at)
meal_logs (id, user_id, date, meal_name, calories, protein_g, carbs_g, fat_g, notes)

-- INJURIES
injury_logs (id, user_id, body_part, severity ['mild','moderate','severe'], description, started_on, resolved_on, active)

-- GEAR STORE
products (id, name, category, description, price_cents, sku, inventory, image_url, active, creator_id)
orders (id, user_id, stripe_payment_intent_id, status, total_cents, created_at)
order_items (id, order_id, product_id, quantity, price_cents)

-- LIABILITY
liability_acceptances (id, user_id, version, accepted_at, ip_address)

-- NEWS
news_subscriptions (id, user_id, categories[])
```

---

## 12. WEARABLE INTEGRATIONS

| Platform | API | Data Available |
|---|---|---|
| Apple Health | HealthKit (iOS only) | HR, HRV, sleep, steps, VO2, workouts |
| Garmin | Garmin Connect IQ | HR, HRV, sleep, GPS, VO2, stress |
| Fitbit / Google Fit | Fitbit Web API | HR, sleep, steps, calories, active min |
| Whoop | WHOOP API | Recovery, HRV, strain, sleep, RHR |
| Polar | Polar AccessLink | HR, HRV, sleep, VO2, training load |
| Samsung | Samsung Health SDK | HR, sleep, steps, stress |

---

## 13. MONETIZATION SUMMARY

| Revenue Stream | Model |
|---|---|
| Pro Subscription | $14.99/mo or $99/yr |
| Creator Subscription | $29.99/mo or $199/yr |
| Gear Store (house products) | Direct margin |
| Creator Store | 70/30 split (creator keeps 70%) |
| Gym Listings (premium) | $19.99/mo per gym |
| Competition Entry Fees (future) | Per-submission fee |

---

## 14. OPEN ITEMS / NEXT STEPS

- [ ] Define exact Pro/Creator pricing
- [ ] Choose fulfillment partner (Printful vs Shopify)
- [ ] Finalize wearable API priority order (Apple Health + Garmin first?)
- [ ] Write full liability agreement text (consult template or attorney)
- [ ] Design Feed UI (post types: workouts, progress photos, news, team updates)
- [ ] Build expanded Supabase schema (all new tables above)
- [ ] Set up Stripe account + webhook handling
- [ ] Onboarding screen UI/UX design pass
- [ ] AI prompt engineering for workout generator
- [ ] News aggregation API selection (RSS vs Feedly vs custom scraper)
