# 📋 Product Requirements Document
## Offline Personal Expense Tracker — Mobile App

**Version:** 1.0  
**Author:** Gokul S  
**Date:** June 2026  
**Status:** In Progress

---

## 1. Overview

Build a single-user offline mobile expense tracker app. All data is stored locally on the device. No cloud sync, no external API calls, no third-party account linking. The app runs fully offline after installation.

---

## 2. Goals

- Allow the user to record all personal monthly expenses with full customization
- Track recurring payments with period, tenor, and due dates
- Alert the user for upcoming and overdue dues via local notifications
- Enforce budgeting discipline through alerts and prompts
- Export any custom-period report in PDF, CSV, and Excel formats

---

## 3. Out of Scope

- Cloud sync or remote backup
- Multi-user or family sharing
- Bank account / SMS / UPI auto-read
- Investment tracking (stocks, mutual funds)
- External authentication (Google, Apple, etc.)

---

## 4. User Stories

### Authentication
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-01 | Set up a PIN or password on first launch | App creates a local auth credential, stored encrypted on device |
| US-02 | Log in with PIN, password, or biometric | Access blocked until valid credential entered |
| US-03 | Reset my PIN with a security question/backup code | Recovery without deleting data |

### Expense Entry
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-04 | Add a one-time expense with date, amount, category, note, and payment mode | Record saved to local DB, visible in dashboard |
| US-05 | Edit or delete any expense entry | Changes reflected immediately across all views |
| US-06 | Tag expenses for better filtering | Multi-tag support per entry |

### Recurring Expenses — Fixed
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-07 | Add a recurring fixed expense (EMI, rent, subscription) with start/end date and frequency | Auto-generates due entries per cycle |
| US-08 | Track a loan with total tenure, paid installments, and remaining count | Completion progress visible; marks complete when last installment paid |
| US-09 | Track a chit-fund with amount, total months, and monthly due date | Shows paid/remaining months, completion flag |

### Recurring Expenses — Variable
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-10 | Add a recurring variable bill (Wi-Fi, EB, mobile) with expected min/max range | Recurring entry created with no end date |
| US-11 | Enter the actual amount when a variable bill arrives each month | Actual amount stored against that month's entry |
| US-12 | Set a variable bill as open-ended (no end date) until manually stopped | Entry remains active until user deactivates it |

### Notifications & Reminders
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-13 | Get a local notification before a payment is due | Notification fires at user-configured lead time (1d, 3d, 7d, on due date) |
| US-14 | Get an overdue notification if I miss a payment | Fires 1 day after due date if payment status is still pending |
| US-15 | Configure reminder timing per recurring item | Each recurring expense has its own reminder setting |
| US-16 | Snooze or dismiss a reminder | Snooze reschedules for next day; dismiss marks as acknowledged |

### Budgeting
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-17 | Create a monthly overall budget | Budget stored per month, editable anytime |
| US-18 | Create per-category budgets | Individual category budget limits per month |
| US-19 | Be prompted to set a budget if none exists for the current month | Prompt shown on dashboard or on adding the first expense |
| US-20 | See a warning when I reach 80% of my budget | Alert/badge shown in dashboard and notification sent |
| US-21 | See an alert when I exceed my budget | High-priority notification sent; dashboard shows exceeded state |

### Dashboard & Analytics
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-22 | See a monthly summary of total spent, total budgeted, and remaining | Dashboard renders live from local DB |
| US-23 | See a category-wise breakdown of spending | Pie chart and list view with percentages |
| US-24 | See all upcoming dues for the next 7 or 30 days | Sorted chronologically with payment status |
| US-25 | See overdue items highlighted | Overdue items visually distinct with overdue badge |

### Reports & Export
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-26 | Select a custom date range for a report | Date picker with presets (this month, last month, custom) |
| US-27 | Filter report by category, type, payment mode, and status | Filters stack and update preview in real time |
| US-28 | Export report as PDF | Formatted, readable PDF generated on device and shareable |
| US-29 | Export report as CSV | Raw data rows exportable to Files app or share sheet |
| US-30 | Export report as Excel (XLSX) | Structured XLSX file with columns, generated on device |

### Settings & Customization
| ID | As a user, I want to... | Acceptance Criteria |
|---|---|---|
| US-31 | Create, edit, and delete custom categories and subcategories | Changes reflected instantly in all entry forms |
| US-32 | Manage payment modes (cash, UPI, card, etc.) | Custom list, fully editable |
| US-33 | Set default currency and locale | Applied globally to all amounts and reports |
| US-34 | Export a local backup file | Generates a JSON/ZIP backup file shareable to local storage |
| US-35 | Restore from a backup file | Imports backup and replaces current data after confirmation |

---

## 5. Functional Requirements

### 5.1 Authentication
- Device-only PIN (4–6 digit) or password setup on first launch
- Optional biometric unlock (fingerprint / face) using device APIs
- No remote auth; credentials stored encrypted in device secure storage
- Recovery via user-set security question or backup code shown at setup

### 5.2 Expense Types

#### One-Time Expense
Fields: date, amount, category, subcategory, note, payment mode, tags

#### Fixed Recurring Expense
Fields: name, amount, frequency (daily/weekly/monthly/yearly), start date, end date (optional), category, payment mode, reminder setting

#### Installment-Based (Loan / Chit Fund)
Fields: name, total amount, installment amount, frequency, start date, total periods, paid count (auto-tracked), remaining count (auto-calculated), next due date, status (active / completed)

#### Variable Recurring (Open-Ended Bills)
Fields: name, category, frequency, expected min amount, expected max amount, start date, no end date, actual amount per cycle (entered when bill arrives), reminder setting, status (active / paused)

### 5.3 Notification System
- All notifications are local (no push server)
- Scheduled using device alarm/notification APIs
- Types:
  - **Due Soon** — fires N days before due date (configurable per item)
  - **Due Today** — fires on due date morning
  - **Overdue** — fires 1 day after due date if status is still pending
  - **Budget Warning** — fires when monthly spend reaches 80% of budget
  - **Budget Exceeded** — fires when spend crosses 100% of budget
  - **Budget Missing** — prompt shown in-app when no budget set for current month

### 5.4 Budgeting
- Monthly overall budget
- Per-category monthly budget
- Budget vs. actual comparison on dashboard
- Threshold alerts: 80%, 100%, and configurable custom %
- If no budget exists for the month, the dashboard shows a setup prompt

### 5.5 Reports & Export
- Custom date range picker
- Filters: category, expense type, payment mode, status
- Export formats: PDF (formatted), CSV (raw rows), XLSX (structured)
- All exports generated on-device — no API calls
- Share via device share sheet (Files, WhatsApp, email, etc.)

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Offline operation | 100% — no feature requires internet |
| Local DB | SQLite via expo-sqlite |
| Data persistence | Survives app restarts and device reboots |
| Notification delivery | Reliable even when app is closed (background scheduling) |
| Performance | App launch < 2s; list render < 200ms for 1000 records |
| Export speed | Report generation < 5s for up to 5000 records |
| Security | Auth credential stored in device secure enclave / Keychain |
| Backup | Manual file export/import only |
| Platform | Android (primary), iOS (secondary) via Expo |

---

## 7. Screens

| Screen | Description |
|---|---|
| Splash / PIN Setup | First-run auth setup |
| Login | PIN / biometric entry |
| Dashboard | Monthly summary, upcoming dues, budget status, quick add |
| Expense List | Filterable, searchable list of all entries |
| Add / Edit Expense | Form for one-time expense entry |
| Recurring List | All active recurring items |
| Add / Edit Recurring | Form for fixed, installment, or variable recurring |
| Installment Detail | Loan/chit-fund progress view |
| Budget | Monthly and category budget setup and status |
| Reports | Date range picker, filters, preview, and export buttons |
| Settings | Categories, payment modes, currency, reminder defaults, backup |
| Category Manager | CRUD for categories and subcategories |

---

## 8. Reminder Flow

```
User adds recurring expense
        │
        ▼
App schedules local notification(s)
        │
        ├── N days before due date  →  "⏰ [Name] due in N days — ₹X"
        ├── On due date             →  "🔴 [Name] is due today — ₹X"
        └── 1 day after (if unpaid) →  "⚠️ [Name] is OVERDUE — mark as paid?"

User pays / marks as paid
        │
        ▼
Notification cancelled; next cycle scheduled automatically
```

---

## 9. Budget Alert Flow

```
User adds expense
        │
        ▼
App totals monthly spend
        │
        ├── No budget set?     →  Show in-app prompt: "Set a budget for this month?"
        ├── Spend >= 80%       →  Push notification: "You've used 80% of your budget"
        ├── Spend >= 100%      →  Push notification: "Budget exceeded for this month"
        └── Spend < 80%       →  No alert
```
