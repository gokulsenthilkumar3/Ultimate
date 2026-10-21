# Ox Service

The Ox Service manages the Ox token ecosystem, including currency pegging and fee logic.

## 🚀 Features
- **CHF Peg:** Ox tokens are pegged 1:1 with the Swiss Franc (CHF).
- **Token Economy:**
  - **Buy:** 1% fee (101 CHF = 100 Ox).
  - **Domestic Transfer:** 1% fee.
  - **International Transfer:** 2% fee (min 2 Ox).
- **Internal Ledger:** Maintains balances and transaction history.
- **Persistence:** Stores wallets and transactions in Postgres (optional).

## 🔌 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check. |
| GET | `/v1/ox/wallet` | Returns the user's Ox wallet balance. |
| POST | `/v1/ox/buy` | Purchases Ox tokens with CHF. |
| POST | `/v1/ox/transfers` | Transfers Ox tokens to another user. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `OX_PORT` | 3005 | Port for the service. |
| `OX_DB_URL` | (None) | Postgres connection string. |