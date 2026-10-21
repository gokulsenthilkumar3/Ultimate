# 📱 Expense Tracker — Offline Mobile App

> A single-user, fully offline mobile expense tracker with recurring payments, loan/chit-fund tracking, variable bills, budgeting, local payment reminders, and multi-format report exports.

---

## ✨ Features

- 🔐 Device-only login (PIN / password / biometric) — no cloud, no sync
- 📋 One-time, recurring fixed, and recurring variable expense entries
- 🏦 Loan & chit-fund installment tracking with tenure, paid/remaining count, due dates
- 💡 Variable bill support (Wi-Fi, EB, mobile) with expected amount range
- 🔔 Local payment reminders (1 day / 3 days / on due date / overdue)
- 💰 Monthly & category-wise budgeting with threshold alerts (80%, 100%)
- 📊 Dashboard with totals, category splits, pending dues, and overdue items
- 📤 Export reports in **PDF**, **CSV**, and **Excel (XLSX)**
- 🗓️ Custom date-range report filtering
- 🗂️ Fully customizable categories, subcategories, tags, and payment modes
- 💾 Manual backup & restore via local file
- 🌐 Works 100% offline — no internet required

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo) |
| Local DB | SQLite via `expo-sqlite` |
| Notifications | `expo-notifications` (local only) |
| PDF Export | `expo-print` + `expo-sharing` |
| Excel Export | `xlsx` (SheetJS) |
| CSV Export | Native string builder |
| Navigation | React Navigation v6 |
| State | Zustand |
| Charts | Victory Native / Gifted Charts |
| Styling | NativeWind (Tailwind for RN) |

---

## 📁 Project Structure

```
expense-tracker-mobile/
├── docs/
│   ├── PRD.md                   # Full Product Requirements Document
│   └── DB_SCHEMA.md             # Database entity & schema definitions
├── src/
│   ├── app/                     # Expo Router screens
│   │   ├── (auth)/              # Login / PIN setup
│   │   ├── (tabs)/              # Dashboard, Expenses, Recurring, Budget, Reports
│   │   └── modals/              # Add/Edit modals
│   ├── components/              # Shared UI components
│   ├── db/                      # SQLite schema, migrations, queries
│   ├── store/                   # Zustand state slices
│   ├── services/
│   │   ├── notifications.ts     # Local reminder scheduling
│   │   ├── export/
│   │   │   ├── pdf.ts           # PDF report generation
│   │   │   ├── excel.ts         # XLSX report generation
│   │   │   └── csv.ts           # CSV report generation
│   │   └── backup.ts            # Backup & restore helpers
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Date, currency, formatting helpers
│   └── constants/               # App-wide constants & enums
├── assets/                      # Icons and splash
├── docs/
├── app.json
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/gokulsenthilkumar3/expense-tracker-mobile.git
cd expense-tracker-mobile

# 2. Install dependencies
npm install

# 3. Start Expo dev server
npx expo start
```

> Requires Node 18+ and Expo CLI installed globally (`npm i -g expo-cli`)

---

## 📄 Documentation

- [Product Requirements Document](./docs/PRD.md)
- [Database Schema](./docs/DB_SCHEMA.md)

---

## 🗺️ Roadmap

- [ ] Phase 1 — Auth + DB setup + base navigation
- [ ] Phase 2 — Expense entry (one-time & recurring)
- [ ] Phase 3 — Loan / chit-fund installment tracker
- [ ] Phase 4 — Budgeting module + alerts
- [ ] Phase 5 — Local notifications & reminders
- [ ] Phase 6 — Reports & multi-format export
- [ ] Phase 7 — Backup / restore
- [ ] Phase 8 — UI polish & QA

---

## 📜 License

MIT — built and maintained by [Gokul S](https://github.com/gokulsenthilkumar3)
