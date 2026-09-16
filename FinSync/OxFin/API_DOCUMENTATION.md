# API Documentation

## Authentication API

### Register User
**POST** `/api/auth/register`

Registers a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error Responses:**
- 400: Invalid input data
- 409: Email already exists
- 500: Internal server error

### Login
**POST** `/api/auth/[...nextauth]`

Handles user authentication via NextAuth.js.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123",
  "mfaCode": "123456" // Optional if MFA enabled
}
```

**Response:**
```json
{
  "ok": true,
  "url": "/dashboard",
  "status": 200
}
```

**Authentication Errors:**
- `MFA_REQUIRED`: 2FA code needed
- `ACCOUNT_LOCKED`: Account locked due to failed attempts
- `INVALID_MFA_CODE`: Incorrect 2FA code
- `INVALID_CREDENTIALS`: Wrong email/password

## User Management API

### Get User Balance
**GET** `/api/user/balance`

Retrieves user's wallet balances and total portfolio value.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "totalBalance": 15420.50,
  "wallets": [
    {
      "id": 1,
      "balance": 10000.00,
      "currency": "INR",
      "type": "full"
    },
    {
      "id": 2,
      "balance": 5420.50,
      "currency": "OX",
      "type": "lite"
    }
  ],
  "currency": "USD"
}
```

### Get User Transactions
**GET** `/api/user/transactions`

Fetches user's transaction history.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50)
- `offset` (optional): Pagination offset
- `type` (optional): Filter by transaction type

**Response:**
```json
{
  "transactions": [
    {
      "id": "tx_123",
      "amount": -150.00,
      "type": "debit",
      "description": "Grocery shopping",
      "category": "food",
      "timestamp": "2024-01-15T14:30:00Z",
      "status": "completed"
    }
  ]
}
```

### Transfer Funds
**POST** `/api/user/transfer`

Transfers funds between user's wallets.

**Request Body:**
```json
{
  "fromWalletId": 1,
  "toWalletId": 2,
  "amount": 500.00,
  "description": "Transfer to investment wallet"
}
```

**Response:**
```json
{
  "message": "Transfer successful",
  "amount": 500.00,
  "fromWalletId": 1,
  "toWalletId": 2,
  "transactionId": "tx_456"
}
```

**Error Responses:**
- 400: Invalid transfer details or insufficient funds
- 404: Wallet not found
- 500: Transfer failed

### Get Security Status
**GET** `/api/user/security-status`

Retrieves user's security configuration.

**Response:**
```json
{
  "twoFactorEnabled": true,
  "lastPasswordChange": "2024-01-01T00:00:00Z",
  "failedLoginAttempts": 0,
  "accountLocked": false
}
```

### Setup MFA
**POST** `/api/user/mfa/setup`

Initiates MFA setup process.

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,..."
}
```

### Verify MFA
**POST** `/api/user/mfa/verify`

Verifies MFA setup with code.

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "MFA enabled successfully"
}
```

## Investment API

### Place Order
**POST** `/api/investments/order`

Places a buy/sell order through integrated broker.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "quantity": 10,
  "side": "buy",
  "price": 150.00 // Optional for market orders
}
```

**Response:**
```json
{
  "orderId": "ord_123",
  "status": "placed",
  "symbol": "AAPL",
  "quantity": 10,
  "side": "buy",
  "price": 150.00,
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**Error Responses:**
- 400: Invalid order parameters
- 401: Unauthorized
- 429: Rate limit exceeded
- 500: Order placement failed

## Payment API

### Create Checkout Session
**POST** `/api/payments/checkout`

Creates a payment checkout session.

**Request Body:**
```json
{
  "amount": 1000,
  "currency": "INR",
  "description": "Wallet top-up",
  "successUrl": "https://example.com/success",
  "cancelUrl": "https://example.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_123",
  "url": "https://checkout.stripe.com/pay/cs_test_123"
}
```

## Bill Management API

### Parse Bill
**POST** `/api/bills/parse`

Parses bill details from uploaded document.

**Request Body (multipart/form-data):**
```
file: <bill_image_or_pdf>
```

**Response:**
```json
{
  "billerName": "Electricity Company",
  "amount": 1250.00,
  "dueDate": "2024-02-01T00:00:00Z",
  "category": "electricity",
  "billNumber": "EC123456789"
}
```

## OxCrypto API

### Convert Currency
**POST** `/api/oxcrypto/convert`

Converts between INR and OX cryptocurrency.

**Request Body:**
```json
{
  "fromCurrency": "INR",
  "toCurrency": "OX",
  "amount": 10000
}
```

**Response:**
```json
{
  "fromAmount": 10000,
  "toAmount": 9900.99,
  "rate": 1.01,
  "fees": 99.01,
  "total": 9900.99
}
```

## Wallet API

### Get Wallets by Type
**GET** `/api/wallets/[type]`

Retrieves wallets of specific type.

**Path Parameters:**
- `type`: "full" or "lite"

**Response:**
```json
{
  "wallets": [
    {
      "id": 1,
      "balance": 15000.00,
      "currency": "INR",
      "type": "full",
      "interestRate": 5.5,
      "dailyLimit": 50000
    }
  ]
}
```

## AI Recommendations API

### Get Financial Insights
**GET** `/api/ai/recommendations`

Retrieves AI-generated financial recommendations.

**Query Parameters:**
- `category` (optional): Filter by category (spending, saving, investing)

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_1",
      "title": "Reduce Dining Expenses",
      "description": "You're spending 25% more on dining out compared to last month",
      "category": "spending",
      "priority": "high",
      "savingsPotential": 500.00
    }
  ]
}
```

## Consent Management API

### Get Consent Status
**GET** `/api/consent`

Retrieves user's consent preferences.

**Response:**
```json
{
  "marketing": true,
  "analytics": false,
  "dataSharing": false
}
```

### Update Consent
**POST** `/api/consent`

Updates user consent preferences.

**Request Body:**
```json
{
  "marketing": false,
  "analytics": true,
  "dataSharing": false
}
```

## Error Response Format

All API errors follow this standard format:

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T14:30:00Z",
  "requestId": "req_123"
}
```

## Rate Limiting

API endpoints implement rate limiting:
- **Authentication endpoints**: 10 requests/minute
- **Financial operations**: 100 requests/hour
- **AI services**: 50 requests/hour

## Security Headers

All API responses include security headers:
```
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=15768000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Authentication

Most endpoints require JWT authentication via NextAuth.js session. Include the session token in requests automatically handled by NextAuth.

For direct API access:
```
Authorization: Bearer <NEXTAUTH_JWT_TOKEN>
```

## Webhook Endpoints

### Payment Webhooks
**POST** `/api/webhooks/stripe`
Handles Stripe payment events.

**POST** `/api/webhooks/razorpay`
Handles Razorpay payment events.

### Investment Webhooks
**POST** `/api/webhooks/investments`
Handles broker order status updates.

## Versioning

API versioning follows semantic versioning. Current version: v1

Base URL: `https://api.oxfin.com/v1`

## Changelog

### v1.0.0 (Initial Release)
- User authentication and registration
- Wallet management and transfers
- Basic investment order placement
- Payment processing integration
- MFA support
- Rate limiting implementation