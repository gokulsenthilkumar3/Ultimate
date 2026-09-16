# Bills Service

The Bills Service handles bill detection, tracking, and automated payments.

## 🚀 Features
- **Bill Detection:** Placeholder for NLP-based detection from SMS/Email.
- **Autopay Rules:** Users can set rules for fixed amounts or full statement payments.
- **Scheduled Execution:** Executes due payments via the Payments Service.
- **Persistence:** Stores bills and autopay rules in Postgres (optional).

## 🔌 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check. |
| GET | `/v1/bills` | Lists all bills for the authenticated user. |
| POST | `/v1/bills` | Manually adds a new bill. |
| POST | `/v1/bills/:id/autopay` | Enables autopay rule for a specific bill. |
| GET | `/v1/autopay-rules` | Lists all active autopay rules. |
| POST | `/v1/autopay/execute-due` | Triggers execution of all currently due bills. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `BILLS_PORT` | 3004 | Port for the service. |
| `BILLS_DB_URL` | (None) | Postgres connection string. |
| `PAYMENTS_SERVICE_URL` | `http://localhost:3003` | URL for Payments Service. |