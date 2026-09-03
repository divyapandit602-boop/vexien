# VEXIEN — Fitness Tracking Web App

A complete, responsive fitness tracker built with **HTML5 · CSS3 · vanilla JavaScript** and an optional **Firebase** backend (Auth + Realtime Database). Pastel design system, 10 feature modules, 500+ food database, 110+ exercises, 100 recipes.

## ✨ Runs in two modes

| Mode | When | Data storage |
|---|---|---|
| **Local Demo Mode** (default) | No Firebase keys configured | Your browser (localStorage) — fully functional, incl. a simulated community for social/leaderboards |
| **Firebase Mode** | Real keys in `firebase-config.js` | Firebase Auth + Realtime Database with live sync |

Demo login (auto-created on first run): **demo@vexien.app** / **demo123**

## 🚀 Quick start

```bash
cd vexien
python3 -m http.server 8000     # or any static server
# open http://localhost:8000
```

> Opening `index.html` directly (file://) also works in demo mode.

## ☁️ Firebase setup (production)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Build → Authentication → Sign-in method → Email/Password** → Enable
3. **Build → Realtime Database → Create Database**
4. **Project settings → Your apps → Web app** → copy the config object
5. Paste it into `firebase-config.js` (replace the `YOUR_...` placeholders)
6. In the Realtime Database **Rules** tab, paste the contents of `database.rules.json`
7. (Optional) Seed the public nodes `food_items/`, `recipes/`, `challenges/`, `achievements/` from the arrays in `data/*.js` via the console or Admin SDK — the app ships these datasets client-side so seeding is optional.
8. Email notifications require a Cloud Function / email provider (e.g. SendGrid) triggered from `notifications/` or user prefs — the toggles are stored on the user profile ready for this.

## 🗂 Project structure

```
vexien/
├── index.html            # App shell: auth, onboarding, 9 views, modals, nav
├── styles.css            # Pastel design system, dark mode, mobile-first
├── firebase-config.js    # ← put your Firebase keys here
├── db.js                 # Dual-mode data layer (Firebase RTDB ⇄ localStorage)
├── auth.js               # Sign up / login / reset / session / onboarding
├── diet.js               # Food logging, DB search, macros, meal plans, recipes
├── fitness.js            # Workouts, exercise DB, steps, activity calendar
├── analytics.js          # FX chart engine (Chart.js + offline SVG fallback), reports
├── social.js             # Challenges + friends, leaderboards, feed, compare
├── script.js             # Router, dashboard, weight, achievements, settings, notifications
├── database.rules.json   # Realtime Database security rules
├── assets/chart.umd.min.js  # Chart.js 4 (vendored; CDN fallback in index.html)
└── data/
    ├── foods.js          # 500+ foods  [name, cat, serving, kcal, P, C, F, fiber]
    ├── exercises.js      # 110+ exercises with MET values
    ├── recipes.js        # 100 recipes (ingredients, steps, macros)
    └── content.js        # Quotes, 8 challenges, 26 achievements, 4 meal plans, demo community
```

## 🧮 Calculations

- **BMR** — Mifflin-St Jeor; **TDEE** = BMR × activity factor (1.2–1.9)
- **Daily target** = TDEE − 500 (lose) / TDEE (maintain) / TDEE + 350 (gain), clamped 1200–4000 kcal
- **Macros** — goal-based default split (35/35/30 lose, 30/45/25 maintain & gain), customizable in Settings
- **Exercise burn** — MET formula: `kcal = MET × 3.5 × kg / 200 × minutes × intensity` (low 0.8 / medium 1 / high 1.2)
- **Steps** — distance = steps × 0.762 m; burn ≈ steps × 0.042 kcal

## 📦 Modules

1. **Dashboard** — greeting, rings, summary, macros, water, quick actions, quote, meals, challenge card, 7-day chart
2. **Diet** — today's counter & meals, autocomplete search, custom foods, favorites/recents, food DB browser, 7-day history, 4 meal plans + save-your-own, shopping lists, 100 recipes with filters
3. **Fitness** — workout logging (sets/reps/weight/intensity, MET estimates), exercise DB with details, steps (goal/streak/milestones), activity calendar & burned-vs-consumed
4. **Weight** — logging, trend chart (30/90/all), goal ring & rate, history table, milestone celebrations
5. **Analytics** — week/month reports, in-vs-out line, macro doughnut, steps bars, deficit/surplus diverging chart, printable summary
6. **Challenges** — 8 templates (30/60/90-day, steps, deficit, consistency, hydration), auto daily evaluation, progress %, days left, ETA, rewards
7. **Social** — friends (add/accept/remove), friends & global leaderboards (steps/burned/workouts, week/month), feed with likes & comments, head-to-head compare
8. **Achievements** — 26 badges with live progress, auto-unlock, shareable
9. **Settings** — profile + photo, target recalculation, macro customization, notification & email prefs, dark mode, privacy, change password, data export, delete account
10. **Notifications** — bell with unread count, daily meal/workout/water/weigh-in/challenge reminders

## 📱 Responsive

Mobile-first: bottom navigation + "More" sheet under 900 px, sidebar on desktop, tested 320 px → 1920 px.
