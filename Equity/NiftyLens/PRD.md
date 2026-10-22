# PRD — NiftyLens

## Overview
NiftyLens is a real-time Indian stock market dashboard for NSE and BSE. It provides live price feeds, technical indicators (RSI, MACD, Bollinger Bands), portfolio tracking, F&O option chain viewer, and price alert triggers for Indian retail investors.

---

## Problem Statement
Indian retail investors (10+ crore active Demat accounts) lack a free, clean, data-rich dashboard. Existing tools (Zerodha Kite, Groww) are brokerage-locked. Independent dashboards are either too basic or too expensive.

---

## Goals
- Real-time NSE/BSE price feeds with <2s latency
- Technical indicator overlays on TradingView-style charts
- F&O option chain with OI, IV, and Greeks
- Portfolio tracker with P&L, XIRR, and sector allocation
- Price and indicator-based alert system via email/Telegram

---

## Non-Goals
- No order placement / brokerage integration (v1)
- No mutual fund tracking (v1)
- No paid data feed dependency for basic features

---

## Target Users
- Indian retail stock investors
- Options traders (F&O)
- Personal finance enthusiasts tracking their portfolio

---

## Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | TradingView Lightweight Charts |
| Data Pipeline | Python FastAPI + NSEPy / Angel One SmartAPI |
| Backend BFF | Node.js (Next.js API routes) |
| Database | Supabase PostgreSQL |
| Real-time | Supabase Realtime / WebSocket |
| Alerts | Supabase Edge Functions → Telegram Bot + Nodemailer |
| Deployment | Vercel (frontend), Render (Python pipeline) |

---

## Database Schema
```
watchlists (id, user_id, symbols_array, created_at)
portfolios (id, user_id, symbol, qty, avg_price, buy_date)
alerts (id, user_id, symbol, condition, threshold, channel, triggered_at)
price_cache (symbol, ltp, open, high, low, volume, updated_at)
```

---

## Core Features

### v1.0 (MVP)
- [ ] Live price table for NSE top 200 stocks
- [ ] Candlestick chart with RSI and MACD overlays
- [ ] Watchlist management (add/remove symbols)
- [ ] Portfolio entry (manual) with P&L calculation
- [ ] Price alert creation (above/below threshold)

### v1.1
- [ ] F&O option chain viewer (weekly + monthly expiry)
- [ ] Sector heatmap
- [ ] Telegram alert delivery
- [ ] XIRR and CAGR portfolio analytics

### v2.0
- [ ] Zerodha Kite API integration (read-only portfolio sync)
- [ ] Stock screener with custom filters
- [ ] Backtesting integration with BacktestIQ

---

## Business Model
| Plan | Price | Features |
|------|-------|----------|
| Free | ₹0 | Watchlist, basic charts, 3 alerts |
| Pro | ₹299/mo | Unlimited alerts, F&O chain, portfolio analytics |
| Pro Annual | ₹2,499/yr | 30% discount vs monthly |

**Market size:** 10+ crore Demat accounts in India, growing 30% YoY.

---

## Success Metrics
- 1,000 signups in first month (organic, dev Twitter/X)
- 8% free → Pro conversion
- < 2s data refresh latency
- Telegram alert delivery < 5s from trigger

---

## Risks
| Risk | Mitigation |
|------|------------|
| NSE data rate limits | Cache aggressively, use multiple free API sources |
| SEBI compliance for financial data | Prominent disclaimer: not investment advice |
| Python pipeline cold starts on Render free | Keep-alive ping every 14 min |
