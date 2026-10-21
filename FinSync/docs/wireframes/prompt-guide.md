# Wireframe Generation Prompts for FinSync Super

**Last Updated**: November 1, 2025  
**Design System**: Material Design 3 (Android) + iOS Human Interface Guidelines  
**Tools**: Figma with Magician plugin, Galileo AI, or Claude/ChatGPT with DALL-E

---

## Design Principles

### Color Palette
```css
Primary (Income/Positive): #10b981 (Green)
Danger (Expense/Negative): #ef4444 (Red)
Warning (Alerts): #f59e0b (Orange)
Info (Investments): #3b82f6 (Blue)
Neutral: #6b7280 (Gray)
Background Light: #f9fafb
Background Dark: #111827
Text Primary: #1f2937
Text Secondary: #6b7280
```

### Typography
- **Headings**: Inter Bold, 24-32px
- **Body**: Inter Regular, 14-16px
- **Captions**: Inter Medium, 12px
- **Numbers**: Roboto Mono, 16-24px (for amounts)

### Spacing System
- Base unit: 4px
- Small: 8px
- Medium: 16px
- Large: 24px
- XL: 32px

---

## Screen 1: Splash & Onboarding

### 1.1 Splash Screen

**Prompt:**
```
Design a modern splash screen for a financial super app called "FinSync Super":

Layout (Mobile 375x812px):
- Centered logo: Stylized "FS" monogram in gradient (green #10b981 to blue #3b82f6)
- App name below logo: "FinSync Super" in Inter Bold, 28px
- Tagline: "Your CFO in Your Pocket" in Inter Regular, 14px, gray
- Bottom: Loading indicator (3 animated dots in primary green)
- Background: Clean white with subtle geometric pattern (light grid)

Style: Minimalist, professional, trustworthy
Include: Small "Powered by AI" badge at bottom in light gray
```

**Figma Instructions:**
- Frame: iPhone 14 Pro (393x852px) or Generic Mobile
- Auto Layout: Vertical, centered, padding 48px
- Components: Logo (vector), Text layers, Loading animation

---

### 1.2 Onboarding Carousel (3 Screens)

**Prompt for Step 1 (Welcome):**
```
Design the first onboarding screen for FinSync Super financial app:

Layout:
- Top: Progress indicator (3 dots, first active in green)
- Center: Large illustration showing smartphone with transaction notifications and money flowing into organized categories (use clean line art style, green/blue accent colors)
- Title: "Track Every Penny Automatically" (Inter Bold, 24px)
- Description: "We parse your SMS and emails to capture all transactions without manual entry" (Inter Regular, 16px, gray)
- Bottom: Two CTAs - "Next" button (green, full-width) and "Skip" text link (gray)
- Background: White with subtle gradient at top

Responsive: Web version (1024px wide) shows all 3 steps side-by-side
```

**Prompt for Step 2 (Permissions):**
```
Design the second onboarding screen for FinSync Super:

Layout:
- Progress: Second dot active
- Center: Grid of 4 permission cards (2x2 on mobile, 4x1 on web):
  1. SMS Access - Icon: Message bubble, Toggle switch (off), "Why?" info icon
  2. Email Sync - Icon: Envelope, Toggle, "Why?" info
  3. Bank Connect - Icon: Bank building, Toggle, "Why?" info
  4. Location - Icon: Pin marker, Toggle (optional), "Why?" info
- Each card: White background, 12px rounded corners, shadow
- Title: "Grant Permissions for Full Experience"
- Description: "We need these to automatically track your finances. All data is encrypted."
- Bottom: "Continue" button (disabled until at least SMS/Email toggled)

Micro-interaction: Tapping "Why?" shows tooltip explaining permission use
```

**Prompt for Step 3 (Profile Setup):**
```
Design the third onboarding screen for profile creation:

Layout:
- Progress: Third dot active
- Form (vertical stack, 16px gaps):
  1. PAN Card Input: Text field with format mask (AAAAA9999A), validation icon
  2. Date of Birth: Date picker (DD/MM/YYYY), calendar icon
  3. Annual Income: Slider with labels (₹0 - ₹10L - ₹50L - ₹1Cr+), current value shown above
  4. Family Size: Dropdown (1, 2, 3, 4, 5+ members)
  5. Primary Goal: Radio buttons (Save for Emergency, Invest, Pay Debt, Buy Home)
- Title: "Personalize Your Experience"
- Description: "Help us tailor budgets and advice for you"
- Bottom: "Get Started" button (green, with arrow icon)
- Security badge: "🔒 Your data is encrypted and never shared"

Style: Clean form design, clear labels above inputs, helper text below
```

---

## Screen 2: Authentication

### 2.1 Login Screen

**Prompt:**
```
Design a secure login screen for FinSync Super:

Layout (Mobile):
- Top: Small logo + app name (centered)
- Title: "Welcome Back!" (Inter Bold, 28px)
- Form:
  1. Email input field (with email icon prefix, autocomplete enabled)
  2. Password input field (with eye icon to toggle visibility)
  3. "Forgot Password?" link (right-aligned, small, blue)
- Primary CTA: "Log In" button (full-width, green, 48px height)
- Divider: "OR" text with horizontal lines
- Social login buttons (stacked):
  - "Continue with Google" (white button, Google logo)
  - "Continue with Microsoft" (white button, Microsoft logo)
- Bottom: "Don't have an account? Sign Up" link

Security: Small "Protected by Firebase Auth" badge at bottom

Web version (500px wide): Same layout, centered in viewport
```

### 2.2 Biometric Authentication Prompt

**Prompt:**
```
Design a biometric authentication overlay (appears on top of app):

Layout:
- Semi-transparent dark overlay (backdrop blur)
- Center card (white, rounded 24px):
  - Large fingerprint/face icon (animated pulse effect)
  - Title: "Unlock FinSync Super"
  - Description: "Place your finger on the sensor" or "Look at your device"
  - Button: "Use PIN instead" (text link)
  - Cancel button (subtle)

Animation: Icon should have gentle pulsing glow effect
Platform-specific icons: Touch ID (iOS), Fingerprint (Android)
```

---

## Screen 3: Main Dashboard

### 3.1 Dashboard Home (Mobile)

**Prompt:**
```
Design the main dashboard for FinSync Super financial app (mobile view, dark mode enabled):

Header (sticky):
- Left: Hamburger menu icon
- Center: Current month "November 2025" with dropdown arrow
- Right: Notification bell (with red badge "3"), profile avatar

Balance Cards Section (horizontal scroll):
Card 1 - Savings Account:
  - Icon: Bank building (green)
  - Label: "HDFC Savings"
  - Balance: "₹50,234.50" (large, white, Roboto Mono)
  - Change: "+₹2,500 this month" (small, green, up arrow)
  - Background: Dark gradient (green accent)
  
Card 2 - Investments:
  - Icon: Chart line (blue)
  - Label: "Total Portfolio"
  - Balance: "₹2,45,678.00"
  - Change: "+12.5% returns" (green)
  - Background: Dark gradient (blue accent)

Quick Stats Row (2 columns):
- Income This Month: "₹50,000" (green box)
- Expenses This Month: "₹32,450" (red box)

Charts Section:
1. Donut Chart: "Spending by Category"
   - Segments: Bills 40% (red), Food 20% (orange), Shopping 15% (purple), Transport 10% (blue), Others 15% (gray)
   - Center: "₹32,450" total
   - Tap to expand to full breakdown

2. Line Chart: "Last 6 Months Trend"
   - X-axis: Jun, Jul, Aug, Sep, Oct, Nov
   - Two lines: Income (green), Expenses (red)
   - Y-axis: ₹0 to ₹60K
   - Area fill under lines (subtle gradient)

Quick Actions Grid (4 items, 2x2):
- "Scan QR" (UPI icon)
- "Add Transaction" (plus icon)
- "AI Budget" (sparkle icon)
- "Reports" (document icon)

Recent Transactions (list, show top 3):
- Each row: Icon, Merchant, Category badge, Amount, Time
- "View All" link at bottom

Bottom Navigation:
- Home (active), Transactions, Invest, Insights, More

Background: Dark #111827, cards have subtle border glow
```

### 3.2 Dashboard Home (Web/Desktop)

**Prompt:**
```
Design the web dashboard for FinSync Super (1440px width, responsive):

Layout:
Left Sidebar (240px width, fixed):
- Top: Logo + "FinSync Super"
- Navigation menu:
  - Dashboard (active, green highlight)
  - Transactions
  - Investments
  - Budgets
  - Reports
  - Settings
- Bottom: User profile card (avatar, name, "Pro Plan" badge)

Main Content Area:
Top Bar:
- Breadcrumb: "Dashboard / Overview"
- Right: Date range picker, Sync status ("Synced 2 mins ago" with green dot), Notifications, Profile

Grid Layout (12 columns):
Row 1 - Balance Cards (4 cards, 3 cols each):
1. Total Balance, 2. Monthly Income, 3. Monthly Expenses, 4. Savings Rate
Each card: Icon, Label, Large number, Sparkline chart, % change

Row 2 - Main Charts (8 cols + 4 cols):
Left (8 cols): Line/Area Chart - "Income vs Expenses Trend" (6 months)
Right (4 cols): Donut Chart - "Expense Breakdown" with legend

Row 3 - Tables (6 cols each):
Left: Recent Transactions (table with 5 rows)
Right: Upcoming Bills (table with 5 rows, due dates in red if <7 days)

Row 4 - Quick Actions + News:
Left (8 cols): Quick action buttons (horizontal)
Right (4 cols): Financial News widget (Pulse feature, 3 headlines)

Style: Clean, professional, plenty of white space, cards with subtle shadows
Responsive: Collapses to mobile view at <768px
```

---

## Screen 4: Transactions List

### 4.1 Transaction Feed (Mobile)

**Prompt:**
```
Design a transaction list screen for FinSync Super:

Header:
- Title: "Transactions"
- Right: Filter icon, Search icon

Filter Bar (horizontal scroll):
- Chips: "All", "Income", "Expenses", "This Month", "Categories ▼"
- Active chip has green background

Date Range Selector:
- "Last 30 days ▼" dropdown

Transaction Cards (infinite scroll):
Group by date ("Today", "Yesterday", "Nov 15, 2025"):

Each card (white/dark mode):
- Left: Category icon in colored circle (e.g., food icon in orange circle)
- Center:
  - Top: Merchant name "Swiggy" (bold, 16px)
  - Bottom: Category badge "Food & Dining" (small, orange outline), Location pin "Mumbai" (gray, small)
- Right:
  - Amount: "₹450" (bold, red for expense, green for income)
  - Time: "2:30 PM" (gray, 12px)

Swipe Actions:
- Swipe left: Delete (red), Edit (blue)
- Swipe right: Categorize (orange)

Tap to Expand:
- Shows: Full merchant name, Payment method (UPI/Card), Notes field, Receipt thumbnail (if any), Map preview (if location tagged)
- Actions: Edit Category, Add Note, Upload Receipt

Floating Action Button (bottom right):
- "+" icon (green circle, elevated shadow)
- Tap to manually add transaction

Bottom: "Showing 50 of 234 transactions" with "Load More" button

Empty State (if no transactions):
- Illustration: Empty wallet
- Text: "No transactions yet. We'll auto-parse from SMS/Email or you can add manually."
```

### 4.2 Transaction Detail Modal

**Prompt:**
```
Design a transaction detail overlay (modal) for mobile:

Layout (slides up from bottom, 90% height):
Header:
- Title: "Transaction Details"
- Right: Edit icon, Delete icon, Close X

Content (scrollable):
Section 1 - Amount (large, centered):
- "₹450.00" (red/green based on type)
- Type badge: "Expense" or "Income"

Section 2 - Merchant Info:
- Icon + Name: "Swiggy"
- Category: Dropdown "Food & Dining" (editable)
- Date/Time: "Nov 15, 2025, 2:30 PM"
- Payment Method: "HDFC Credit Card •••• 1234"

Section 3 - Location (if available):
- Mini map showing transaction location
- Address: "Koramangala, Bangalore"

Section 4 - Receipt:
- Image thumbnail (tap to view full)
- "Upload Receipt" button if none

Section 5 - Notes:
- Text area: "Team lunch" (editable)

Section 6 - Tags:
- Pills: "Work Expense", "Reimbursable" (can add/remove)

Bottom Actions:
- "Split Expense" button
- "Add to Budget" button
- "Mark as Recurring" toggle

Style: Clean sections with dividers, easy-to-tap buttons
```

---

## Screen 5: Investment Dashboard

### 5.1 Investment Overview

**Prompt:**
```
Design an investment portfolio screen for FinSync Super:

Header:
- Title: "Investments"
- Right: "Add Investment" button (plus icon)

Portfolio Summary Card (gradient background, green to blue):
- Total Value: "₹2,45,678" (large, white)
- Total Invested: "₹2,00,000" (smaller, white)
- P&L: "+₹45,678 (+22.8%)" (bright green, with up arrow)
- Period: "All Time" dropdown

Asset Allocation Section:
Stacked Donut Chart (interactive):
- Center: "Total Assets"
- Segments:
  1. Stocks 40% (blue) - ₹98,271
     - Sub-segments visible on tap: ETF 20%, Equity 20%
  2. Mutual Funds 30% (purple) - ₹73,703
     - Sub: Debt 15%, Equity 15%
  3. Crypto 20% (orange) - ₹49,136
     - Sub: Bitcoin, Ethereum
  4. Fixed Deposits 10% (green) - ₹24,568

Legend below chart with color codes and values

Holdings Table:
Headers: Asset, Qty, Current Price, P&L, %
Rows:
1. NIFTY 50 ETF | 50 units | ₹185.50 | +₹2,500 | +12.5% (green)
2. HDFC Equity MF | 100 units | ₹520.00 | +₹8,000 | +18.2% (green)
3. Bitcoin | 0.5 BTC | ₹42,00,000 | +₹5,000 | +3.5% (green)
4. ICICI FD | - | ₹50,000 | +₹2,500 | +5.0% (green)

Each row expandable to show:
- Buy date, Buy price, Current value trend (mini line chart)
- "Sell" / "Buy More" action buttons

Quick Actions:
- "Invest in SIP" (recommended)
- "Rebalance Portfolio" (AI suggestion)

Bottom: "Data synced from Zerodha, Groww" (with provider logos)
```

### 5.2 Investment Detail View

**Prompt:**
```
Design a detailed view for a single investment (e.g., Bitcoin):

Header:
- Back arrow
- Asset name: "Bitcoin (BTC)"
- Star icon (to favorite)

Price Card (large):
- Current price: "₹42,00,000" (large, Roboto Mono)
- 24h change: "-₹50,000 (-1.18%)" (red, with down arrow)
- Last updated: "2 mins ago" (gray, small)

Your Holdings Card:
- Quantity: "0.5 BTC"
- Invested: "₹20,00,000"
- Current Value: "₹21,00,000"
- P&L: "+₹1,00,000 (+5.0%)" (green)

Price Chart (interactive):
- Time filters: 1D, 1W, 1M, 3M, 1Y, All (tabs)
- Candlestick or line chart
- Volume bars below
- Crosshair on touch to show exact price/time

Stats Grid (2x2):
- Market Cap, 24h Volume, Circulating Supply, All-time High

Recent Transactions (your buys/sells):
- Table: Date, Type (Buy/Sell), Qty, Price, Total
- "View All" link

Action Buttons (bottom, sticky):
- "Buy More" (green, primary)
- "Sell" (red, outline)

News Feed:
- 3 latest news headlines related to Bitcoin
- Source, time, thumbnail

Style: Professional trading app feel, clear hierarchy
```

---

## Screen 6: Budget Planner (AI-Powered)

### 6.1 Budget Creation Flow

**Prompt:**
```
Design an AI budget planner wizard for FinSync Super:

Step 1 - Income Input:
- Title: "Let's Plan Your Budget" (with AI sparkle icon)
- Form:
  1. Monthly Income: Input field "₹50,000"
  2. Additional Income: Checkbox "Include side income?" → Extra field appears
  3. Family Earners: Dropdown (1, 2, 3+)
- AI Suggestion Box (blue background):
  - "💡 Based on your transaction history, your average monthly income is ₹48,500. We've pre-filled that for you."
- CTA: "Next Step" button

Step 2 - Rule Selection:
- Title: "Choose Your Budget Rule"
- Cards (3 options, selectable):
  1. 50/30/20 Rule (recommended badge)
     - Description: "50% Needs, 30% Wants, 20% Savings"
     - Icon: Pie chart visualization
  2. 80/20 Rule
     - "80% Expenses, 20% Savings"
  3. Custom
     - "Set your own percentages"
- Selected card has green border/shadow
- CTA: "Continue"

Step 3 - Category Allocation:
- Title: "Allocate Your Budget"
- Visual: Three columns (for 50/30/20):
  
  Needs (50% = ₹25,000):
  - Rent: Slider (default ₹10,000)
  - Groceries: Slider (default ₹5,000)
  - Bills: Slider (default ₹3,000)
  - Transport: Slider (default ₹2,000)
  - Healthcare: Slider (default ₹5,000)
  - Total bar shows ₹25,000 / ₹25,000 (green when exact)
  
  Wants (30% = ₹15,000):
  - Dining Out, Shopping, Entertainment, etc.
  
  Savings (20% = ₹10,000):
  - Emergency Fund, Investments, etc.

- AI Tips Section:
  - "💡 Your rent (₹10K) is 20% of income. Recommended is <30%. Great job!"
  - "⚠️ You spent ₹8K on dining last month. Consider reducing wants budget."

- CTA: "Generate Budget" button (with AI animation)

Step 4 - Budget Summary:
- Visual: Large donut chart showing allocation
- Table: Category, Allocated, Spent (This Month), Remaining
- Calendar Integration:
  - "Add bill reminders?" toggle
  - "Sync with Google Calendar" button
- CTA: "Activate Budget" button (green, prominent)

Style: Clean, encouraging, use AI sparkle icons for suggestions
```

### 6.2 Active Budget Tracking

**Prompt:**
```
Design a budget tracking screen (shows active budget status):

Header:
- Title: "November Budget"
- Right: Edit icon, Settings icon

Overall Progress Card:
- Circular progress ring: 65% (₹32,450 spent of ₹50,000)
- Center text: "₹17,550 remaining"
- Days left: "15 days left in month"
- Pace indicator: "On track" (green) or "Over budget" (red)

Category Breakdown (list of cards):
Each card:
- Category icon + name: "Food & Dining"
- Progress bar: 80% filled (₹4,000 / ₹5,000)
- Amount remaining: "₹1,000 left"
- Alert badge if >90%: "⚠️ Almost at limit"
- Trend: "↑ 20% more than last month" (red) or "↓ 10% less" (green)

Top 3 cards expanded by default, rest collapsible

Smart Insights Section (AI-generated):
- "🎯 You're spending 20% less on shopping this month. Keep it up!"
- "⚠️ Bills are ₹500 over budget. Consider switching to a lower plan."
- "💡 You have ₹2,000 unspent. Add it to savings?"

Action Buttons:
- "Adjust Budget" (outline)
- "View Detailed Report" (primary)

Bottom Sheet (appears if over budget):
- "You're over budget by ₹2,500"
- Suggestions: "Cut dining by ₹1,000", "Skip one shopping trip"
- "Extend Budget" or "Stick to Plan" options

Style: Gamified feel, use colors to show health (green=good, orange=warning, red=over)
```

---

## Screen 7: Settings & Profile

### 7.1 Settings Home

**Prompt:**
```
Design a comprehensive settings screen for FinSync Super:

Header:
- Title: "Settings"
- User card at top:
  - Large avatar (circular)
  - Name: "Rahul Sharma"
  - Email: "rahul@example.com"
  - Plan badge: "Pro Plan" (gold)
  - "Edit Profile" button

Settings List (grouped sections):

Section 1 - Account:
- Linked Accounts (3 cards: SMS, Email, Banks) - shows count
- Sync Preferences
- Data Export

Section 2 - Security:
- Change Password
- Two-Factor Authentication (toggle, currently ON)
- Biometric Login (toggle)
- App Lock (PIN/Pattern)

Section 3 - Notifications:
- Push Notifications (master toggle)
- Transaction Alerts (toggle)
- Bill Reminders (toggle)
- Weekly Reports (toggle)
- Marketing (toggle, off by default)

Section 4 - Preferences:
- Language (English, हिंदी, etc.)
- Currency (₹ INR, $ USD)
- Theme (Light, Dark, Auto) - with preview thumbnails
- Date Format (DD/MM/YYYY, MM/DD/YYYY)

Section 5 - Privacy:
- Data Sharing (toggle: "Share anonymized data for AI improvements")
- Location Tracking (toggle)
- Download My Data (GDPR compliance)
- Delete Account (red text)

Section 6 - Support:
- Help Center
- Chat Support (with online status dot)
- FAQs
- Rate App
- Version: v1.0.0 (build 123)

Bottom:
- "Log Out" button (red, outline)

Style: Clean list design, clear grouping, icons for each item
```

---

## Screen 8: Empty States & Errors

### 8.1 Empty Transaction List

**Prompt:**
```
Design an empty state for when user has no transactions:

Layout (centered):
- Illustration: Empty wallet with sad face (friendly, not depressing)
- Title: "No Transactions Yet"
- Description: "We'll automatically track your expenses from SMS and emails. Or add one manually to get started."
- Primary CTA: "Add First Transaction" button (green, with plus icon)
- Secondary CTA: "Connect Bank Account" (outline button)
- Help text: "Need help? Watch our 2-min tutorial" (with play icon link)

Style: Friendly, encouraging, avoid making user feel bad
```

### 8.2 Error States

**Prompt:**
```
Design error screens for common failures:

1. No Internet Connection:
- Icon: Broken wifi symbol
- Title: "You're Offline"
- Description: "Some features may not work. We'll sync when you're back online."
- CTA: "Retry" button
- Note: "Last synced: 2 hours ago"

2. Sync Failed:
- Icon: Sync symbol with X
- Title: "Sync Failed"
- Description: "We couldn't connect to your bank. Check your credentials."
- CTA: "Reconnect Bank" button
- Link: "Contact Support"

3. Payment Declined:
- Icon: Credit card with exclamation
- Title: "Transaction Not Saved"
- Description: "There was an error saving this transaction. Please try again."
- CTA: "Retry" button
- Secondary: "Save Offline" (will sync later)

Style: Clear, actionable, not blaming the user
```

---

## Screen 9: Financial Literacy (Pulse)

### 9.1 Learning Modules

**Prompt:**
```
Design a financial literacy hub screen:

Header:
- Title: "FinPulse - Learn & Grow"
- Subtitle: "Master your finances with bite-sized lessons"

Hero Section:
- Current module card (large, featured):
  - "Mutual Funds Masterclass"
  - Progress: "3 of 10 lessons complete" (progress bar)
  - Time: "25 mins remaining"
  - CTA: "Continue Learning" button
  - Background: Gradient with related illustration

Learning Paths (horizontal scroll):
Cards for:
1. Beginner Path: "Finance 101" (6 modules, 2h total)
2. Investing Path: "Build Wealth" (8 modules, 3h)
3. Tax Planning: "Save Smart" (5 modules, 1.5h)
4. Debt Management: "Get Debt-Free" (7 modules, 2h)

Each card shows: Icon, Title, Module count, Duration, "Start" or "Resume" button

News Feed:
- "Today's Financial News"
- Cards with: Thumbnail, Headline, Source, Time
- Categories: Market, Policy, Tips, Tech

Quizzes Section:
- "Test Your Knowledge"
- Weekly quiz card: "Can you beat 80%?"
- Leaderboard preview (top 3 users with scores)

Achievements:
- Badges earned: "Budget Master", "7-Day Streak", "Quiz Champion"
- Progress to next badge

Bottom: "Powered by Zerodha Varsity + Investopedia"

Style: Educational but fun, use illustrations, gamify with badges
```

---

## Screen 10: Responsive Web Navigation

### 10.1 Desktop Sidebar Navigation

**Prompt:**
```
Design a collapsible sidebar for FinSync Super web app:

Expanded State (240px width):
- Top:
  - Logo + "FinSync Super" (horizontal)
  - User avatar + name + dropdown arrow
  
- Navigation items (with icons + labels):
  - Dashboard (home icon) - Active state: green bg, bold text
  - Transactions (receipt icon)
  - Investments (chart icon) - Has red notification badge "2"
  - Budgets (target icon)
  - Reports (document icon)
  - FinPulse (lightbulb icon)
  - Settings (gear icon)

- Bottom:
  - Sync status: "Synced" with green dot, timestamp
  - Help button
  - Collapse arrow (< icon)

Collapsed State (64px width):
- Only icons visible
- Tooltip appears on hover with label
- Logo becomes just "FS" monogram

Hover Effect:
- Item background lightens
- Smooth transition (200ms)

Active State:
- Green left border (4px)
- Light green background
- Icon and text in primary green

Style: Clean, professional, matches Material Design nav drawer
```

---

## Design System Export for Developers

### Component Specifications

**Button Variants:**
```
Primary: bg-green-600 hover:bg-green-700, text-white, h-12, rounded-lg
Secondary: border-2 border-green-600, text-green-600, hover:bg-green-50
Danger: bg-red-600 hover:bg-red-700, text-white
Text: no background, text-green-600, hover:underline
```

**Card Component:**
```
Background: white (light mode), gray-800 (dark mode)
Border: 1px solid gray-200 (light), gray-700 (dark)
Radius: 12px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Padding: 16px (mobile), 24px (desktop)
```

**Input Fields:**
```
Height: 48px
Border: 1px solid gray-300, focus:border-green-600
Radius: 8px
Padding: 12px 16px
Font: Inter Regular, 16px
Placeholder: gray-400
```

---

## Figma Plugin Recommendations

1. **Magician** - AI wireframe generation from text prompts
2. **Galileo AI** - Natural language to UI design
3. **Anima** - Export to React/React Native code
4. **Autoflow** - User flow diagrams
5. **Stark** - Accessibility checker (WCAG compliance)

---

## Next Steps for Designers

1. Import color palette and typography to Figma
2. Create component library (buttons, cards, inputs)
3. Generate wireframes using above prompts
4. Create interactive prototype with clickable flows
5. Conduct user testing with 5-10 people
6. Iterate based on feedback
7. Hand off to developers with Anima or Figma Dev Mode

---

**Total Screens to Design**: 25-30 (including variants)  
**Estimated Design Time**: 2-3 weeks  
**Review Cycles**: 2-3 iterations

**Document Owner**: UI/UX Lead  
**Last Updated**: November 1, 2025
