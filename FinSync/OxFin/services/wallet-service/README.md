# Wallet Service

The Wallet Service manages multi-currency fiat wallets for OxFin users.

## 🚀 Features
- **Multi-Currency Wallets:** Each user can hold balances in multiple currencies.
- **Deposit & Withdraw:** Supports adding and removing funds from wallets.
- **Internal Ledger:** In-memory store with optional Postgres persistence.

## 🔌 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check. |
| GET | `/v1/wallets` | Lists all wallets for the authenticated user. |
| POST | `/v1/wallets` | Creates a new wallet for a given currency. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `WALLET_PORT` | 3002 | Port for the service. |
| `WALLET_DB_URL` | (None) | Postgres connection string. |