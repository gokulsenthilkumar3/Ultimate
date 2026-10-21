# Payments Service

The Payments Service is a multi-rail payment orchestration engine. It routes payments based on country defaults or explicit user selection.

## 🚀 Features
- **Multi-Rail Routing:** Supports UPI (India), ACH (US), SEPA (EU), SWIFT (International), and Ox (On-chain/Off-chain).
- **Automatic Rail Selection:** Defaults to local rails based on the destination country.
- **Ox Token Integration:** Supports native payments using the Ox token ecosystem.
- **Persistence:** Full payment history stored in Postgres (optional).

## 🔌 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check. |
| POST | `/v1/payments` | Initiates a new payment intent. |
| GET | `/v1/payments/:id` | Fetches details and status of a specific payment. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENTS_PORT` | 3003 | Port for the service. |
| `PAYMENTS_DB_URL` | (None) | Postgres connection string. |
| `OX_SERVICE_URL` | `http://localhost:3005` | URL for Ox Service. |

## 🛤 Supported Rails
- `UPI`, `IMPS`, `NEFT`, `RTGS` (India)
- `ACH` (USA)
- `SEPA` (Europe)
- `SWIFT` (Global)
- `OX` (Internal Ledger)