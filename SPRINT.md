# 🚀 Ultimate — 90-Day Execution Sprint

> **Started:** July 16, 2026 | **Target:** October 13, 2026

## 📊 Weekly Check-in (Update Every Friday 5pm)

| Week | Users | Week-1 Retention | MRR | Status |
|------|-------|-----------------|-----|--------|
| 1    | -     | -               | $0  | 🔴 In Progress |
| 2    | -     | -               | $0  | ⬜ Pending |
| 4    | 100   | >70%            | $0  | ⬜ Pending |
| 6    | 150   | >50%            | $0  | ⬜ Pending |
| 8    | 500   | >50%            | $1k | ⬜ Pending |
| 10   | 600+  | >50%            | $2k | ⬜ Pending |
| 12   | -     | >50%            | $3-5k | ⬜ Pending |

---

## ✅ Week 1-2: Emergency Mode

- [ ] Working login system (Supabase Auth)
- [ ] Static avatar renders based on user data
- [ ] Health data entry (manual weight sync)
- [ ] Landing page live on Vercel
- [ ] Privacy policy + Terms drafted
- [ ] Error tracking (Sentry) set up
- [ ] Deploy to Vercel

## ✅ Week 3-4: First 100 Users

- [ ] Post in r/fitness, r/health
- [ ] Text 50 friends for beta
- [ ] Typeform feedback survey live
- [ ] 20 user interviews scheduled
- [ ] Day-1 retention >70%

## ✅ Week 5-6: Retention & Iterate

- [ ] Mixpanel/Segment analytics set up
- [ ] Top 5 features from feedback built
- [ ] Week-1 retention >50%
- [ ] 150 total users

## ✅ Week 7-8: Scale to 500 + Paid Tier

- [ ] Stripe payments live
- [ ] Pricing page (Free / Pro $9.99/mo)
- [ ] Product Hunt launch prepared
- [ ] Hacker News Show HN posted
- [ ] 500 users
- [ ] $1k MRR

## ✅ Week 9-10: Viral Loop

- [ ] Referral system: "Refer a friend, get $10 credit"
- [ ] Share Avatar button (Instagram/Twitter)
- [ ] Weekly summary email
- [ ] Milestone push notifications
- [ ] 30% new users from referrals

## ✅ Week 11-12: Series A Prep

- [ ] 12-slide fundraising deck ready
- [ ] 3-min demo video recorded
- [ ] 20 angel investors emailed
- [ ] 5-10 investor meetings scheduled
- [ ] Co-founder hired/committed
- [ ] $3-5k MRR

---

## 🚨 Red Flag Thresholds

| Signal | Action |
|--------|--------|
| Week-1 retention < 40% | STOP scaling. Talk to every churned user. |
| < 20 user interviews by week 4 | Messaging wrong. Pivot or abandon. |
| No co-founder by week 6 | Stop. Find one. Give 20-50% equity. |
| Demo still broken by week 3 | Stop everything. Fix and redeploy. |

---

## 🏗️ Tech Stack

- **Frontend:** Vite + React (this repo: `growthtrack-ultimate/`)
- **Backend:** Node.js Express (`server/`)
- **Auth:** Supabase Auth
- **DB:** Supabase PostgreSQL
- **Deploy:** Vercel (frontend) + Render (backend)
- **Analytics:** Mixpanel (free tier)
- **Payments:** Stripe
- **Error tracking:** Sentry

---

## 📁 New Files Added (Sprint Week 1-2)

| File | Purpose |
|------|---------|
| `src/lib/supabaseClient.js` | Supabase client init |
| `src/context/AuthContext.jsx` | Global auth state |
| `src/hooks/useAuth.js` | Auth hook |
| `src/pages/LandingPage.jsx` | Public landing page |
| `src/pages/LoginPage.jsx` | Login + Signup tabs |
| `src/components/StaticAvatar.jsx` | Avatar that morphs by health data |
| `src/components/HealthSync.jsx` | Manual weight entry + CSV import |
| `src/components/ProtectedRoute.jsx` | Route guard for auth |
