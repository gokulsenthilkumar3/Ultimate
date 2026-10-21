# Identity Service

The Identity Service manages user authentication, registration, and communication consents.

## 🚀 Features
- **User Registration:** Creates new user profiles and issues JWTs.
- **Login & Refresh:** Secure login flow and token refresh mechanism.
- **Consent Management:** Tracks user preferences for SMS, Email, and WhatsApp communication.

## 🔌 Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check. |
| POST | `/v1/auth/register` | Registers a new user. |
| POST | `/v1/auth/login` | Authenticates a user and returns a JWT. |
| POST | `/v1/auth/refresh` | Refreshes an expired access token. |
| POST | `/v1/consents` | Updates user communication consents. |

## ⚙️ Configuration
| Variable | Default | Description |
|----------|---------|-------------|
| `IDENTITY_PORT` | 3001 | Port for the service. |
| `AUTH_JWT_SECRET` | `dev-secret` | Secret for JWT signing. |