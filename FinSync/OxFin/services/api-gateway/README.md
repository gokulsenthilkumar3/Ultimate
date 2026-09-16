# API Gateway Service

The API Gateway is the central entry point for the OxFin backend. It handles authentication, rate limiting, and request proxying to downstream microservices.

## 🚀 Features
- **Centralized Entry Point:** Single URL for all backend requests.
- **JWT Authentication:** Validates access tokens and extracts user context.
- **Rate Limiting:** Protects sensitive endpoints (e.g., payments) from abuse.
- **Error Handling:** Standardized error responses for service failures.

## 🔌 Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Service health check. |
| POST | `/v1/auth/*` | No | Proxies to Identity Service for auth. |
| POST | `/v1/wallets` | Yes | Proxies to Wallet Service. |
| POST | `/v1/payments` | Yes | Proxies to Payments Service (Rate limited). |
| GET | `/v1/bills` | Yes | Proxies to Bills Service. |
| POST | `/v1/ox/*` | Yes | Proxies to Ox Service. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Port for the gateway. |
| `AUTH_JWT_SECRET` | `dev-secret` | Secret for JWT validation. |
| `IDENTITY_SERVICE_URL` | `http://localhost:3001` | URL for Identity Service. |
| `WALLET_SERVICE_URL` | `http://localhost:3002` | URL for Wallet Service. |
| `PAYMENTS_SERVICE_URL` | `http://localhost:3003` | URL for Payments Service. |
| `BILLS_SERVICE_URL` | `http://localhost:3004` | URL for Bills Service. |
| `OX_SERVICE_URL` | `http://localhost:3005` | URL for Ox Service. |