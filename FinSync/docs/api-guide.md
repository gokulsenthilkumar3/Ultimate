# API Integration Guide - FinSync Super

**Last Updated**: November 1, 2025  
**Version**: 1.0

---

## Overview

This guide covers all external API integrations for FinSync Super, including setup instructions, authentication, pricing, rate limits, and implementation examples.

---

## Authentication & Security

### Firebase Authentication

**Purpose**: User authentication, MFA, OAuth providers  
**Provider**: Google Firebase  
**Pricing**: Free up to 50K verifications/month, $0.06 per 1K thereafter

**Setup:**
```bash
# Already configured in firebase-setup.md
# Web: apps/web/lib/firebase.ts
# Mobile: apps/mobile/config/firebase.ts
```

**Authentication Flows:**

1. **Email/Password:**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(error.message);
  }
};
```

2. **Google OAuth:**
```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  return result.user;
};
```

3. **Biometric (Mobile):**
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const authenticateWithBiometrics = async () => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock FinSync Super',
    fallbackLabel: 'Use PIN',
  });
  
  return result.success;
};
```

---

## Data Ingestion APIs

### 1. Twilio - SMS Parsing

**Purpose**: Webhook for SMS transaction alerts  
**Pricing**: $0.05 per verification/SMS (free sandbox for dev)  
**Rate Limit**: 10 requests/second

**Setup:**
```bash
npm install twilio
```

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Webhook Implementation (Firebase Function):**
```typescript
// functions/src/sms-parser.ts
import * as functions from 'firebase-functions';
import { parseTransaction } from './parsers/transaction-parser';

export const parseSMS = functions.https.onRequest(async (req, res) => {
  const { Body, From } = req.body; // Twilio webhook payload
  
  try {
    // Parse SMS using AI
    const transaction = await parseTransaction(Body);
    
    // Save to Firestore
    const userDoc = await findUserByPhone(From);
    if (userDoc) {
      await db.collection('users').doc(userDoc.id)
        .collection('transactions').add({
          ...transaction,
          source: 'sms',
          rawText: Body,
          createdAt: new Date(),
        });
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('SMS parsing error:', error);
    res.status(500).send('Error');
  }
});
```

**SMS Patterns (India Banks):**
```typescript
const SMS_PATTERNS = {
  HDFC: /Your A\/c (\w+) (\w+) Rs\.(\d+\.?\d*) on (\d{2}-\w{3}-\d{2}) at (.+)\. Avl Bal: Rs\.(\d+\.?\d*)/,
  SBI: /Dear Customer, Your A\/c ending (\w+) is (\w+) by Rs (\d+\.?\d*) on (\d{2}-\d{2}-\d{4}) \((.+)\)/,
  ICICI: /ICICI Bank A\/c (\w+) (\w+) (\d+\.?\d*) on (\d{2}\/\d{2}\/\d{2}) at (.+)/,
};
```

---

### 2. Gmail/Outlook APIs - Email Sync

**Purpose**: Parse transaction emails from multiple accounts  
**Providers**: Google Workspace API, Microsoft Graph  
**Pricing**: Free (rate limits apply)  
**Rate Limit**: Gmail 250 quota units/user/second, Outlook 2000 requests/app/minute

#### Gmail API Setup:

**Enable API:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add scopes: `gmail.readonly`, `gmail.modify`

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

**Implementation:**
```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get authorization URL
export const getGmailAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
};

// Exchange code for tokens
export const getGmailTokens = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};

// Fetch transaction emails
export const fetchTransactionEmails = async (accessToken: string) => {
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'from:alerts@hdfcbank.net OR from:sbicard@sbi.co.in subject:transaction',
    maxResults: 50,
  });
  
  return response.data.messages || [];
};
```

#### Microsoft Graph Setup:

**Register App:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register new app
3. Add permissions: `Mail.Read`, `offline_access`

**Implementation:**
```typescript
import { Client } from '@microsoft/microsoft-graph-client';

export const getOutlookClient = (accessToken: string) => {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

export const fetchOutlookEmails = async (accessToken: string) => {
  const client = getOutlookClient(accessToken);
  
  const messages = await client
    .api('/me/messages')
    .filter("from/emailAddress/address eq 'alerts@hdfcbank.net'")
    .select('subject,bodyPreview,receivedDateTime')
    .top(50)
    .get();
  
  return messages.value;
};
```

---

## Banking & Financial APIs

### 3. Plaid - Bank Account Sync (Global)

**Purpose**: Link bank accounts, fetch balances, transactions  
**Pricing**: $500/month development, production varies by endpoints  
**Rate Limit**: 100 requests/minute per client_id

**Setup:**
```bash
npm install plaid
```

**Environment Variables:**
```env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox # or development, production
```

**Implementation:**
```typescript
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

// Create link token
export const createLinkToken = async (userId: string) => {
  const response = await client.linkTokenCreate({
    user: { client_user_id: userId },
    client_name: 'FinSync Super',
    products: ['transactions', 'auth'],
    country_codes: ['US', 'CA'],
    language: 'en',
  });
  
  return response.data.link_token;
};

// Exchange public token for access token
export const exchangePublicToken = async (publicToken: string) => {
  const response = await client.itemPublicTokenExchange({
    public_token: publicToken,
  });
  
  return response.data.access_token;
};

// Get transactions
export const getTransactions = async (accessToken: string) => {
  const response = await client.transactionsGet({
    access_token: accessToken,
    start_date: '2025-10-01',
    end_date: '2025-11-01',
  });
  
  return response.data.transactions;
};
```

**Frontend Integration (React):**
```typescript
import { usePlaidLink } from 'react-plaid-link';

const BankConnectButton = () => {
  const [linkToken, setLinkToken] = useState(null);
  
  useEffect(() => {
    // Fetch link token from backend
    fetch('/api/plaid/create-link-token', { method: 'POST' })
      .then(res => res.json())
      .then(data => setLinkToken(data.link_token));
  }, []);
  
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      // Send to backend to exchange for access_token
      fetch('/api/plaid/exchange-token', {
        method: 'POST',
        body: JSON.stringify({ public_token }),
      });
    },
  });
  
  return <button onClick={() => open()} disabled={!ready}>Connect Bank</button>;
};
```

---

### 4. Finvu - Account Aggregator (India-specific)

**Purpose**: India's DEPA-compliant bank sync (SBI, HDFC, ICICI, etc.)  
**Pricing**: ₹10,000/month base + per-transaction fees  
**Rate Limit**: 50 requests/minute

**Setup:**
```bash
npm install @finvu/aa-sdk
```

**Implementation:**
```typescript
import { FinvuClient } from '@finvu/aa-sdk';

const finvu = new FinvuClient({
  apiKey: process.env.FINVU_API_KEY,
  environment: 'sandbox', // or production
});

// Create consent request
export const createConsentRequest = async (userId: string) => {
  const consent = await finvu.createConsent({
    userId,
    fiTypes: ['DEPOSIT', 'TERM-DEPOSIT'],
    dateRange: {
      from: '2025-01-01',
      to: '2025-11-01',
    },
  });
  
  return consent.consentHandle;
};

// Fetch account data after consent
export const fetchAccountData = async (consentId: string) => {
  const data = await finvu.fetchData(consentId);
  return data.accounts;
};
```

---

## Investment APIs

### 5. Zerodha Kite API - Stock/Mutual Fund Sync

**Purpose**: Demat account sync, portfolio tracking  
**Pricing**: ₹2,000 one-time setup (free for Kite Connect)  
**Rate Limit**: 3 requests/second

**Setup:**
```bash
npm install kiteconnect
```

**Environment Variables:**
```env
ZERODHA_API_KEY=your_api_key
ZERODHA_API_SECRET=your_secret
```

**Implementation:**
```typescript
import { KiteConnect } from 'kiteconnect';

const kite = new KiteConnect({
  api_key: process.env.ZERODHA_API_KEY,
});

// Get login URL
export const getZerodhaLoginUrl = () => {
  return kite.getLoginURL();
};

// Generate session
export const generateSession = async (requestToken: string) => {
  const session = await kite.generateSession(
    requestToken,
    process.env.ZERODHA_API_SECRET
  );
  
  kite.setAccessToken(session.access_token);
  return session;
};

// Get portfolio holdings
export const getHoldings = async () => {
  const holdings = await kite.getHoldings();
  
  return holdings.map(h => ({
    symbol: h.tradingsymbol,
    quantity: h.quantity,
    averagePrice: h.average_price,
    currentPrice: h.last_price,
    pnl: h.pnl,
  }));
};

// Get positions (day trading)
export const getPositions = async () => {
  const positions = await kite.getPositions();
  return positions.net;
};
```

---

### 6. CoinGecko API - Cryptocurrency Prices

**Purpose**: Real-time crypto prices, historical data  
**Pricing**: Free tier (50 calls/min), Pro $129/month (500 calls/min)  
**Rate Limit**: 50 requests/minute (free tier)

**Setup:**
```bash
npm install coingecko-api
```

**Implementation:**
```typescript
import CoinGecko from 'coingecko-api';

const CoinGeckoClient = new CoinGecko();

// Get current prices
export const getCryptoPrices = async (coins: string[]) => {
  const data = await CoinGeckoClient.simple.price({
    ids: coins.join(','), // ['bitcoin', 'ethereum']
    vs_currencies: ['inr', 'usd'],
    include_24hr_change: true,
  });
  
  return data.data;
};

// Get historical data
export const getCryptoHistory = async (coinId: string, days: number) => {
  const data = await CoinGeckoClient.coins.fetchMarketChart(coinId, {
    vs_currency: 'inr',
    days,
  });
  
  return data.data.prices; // [[timestamp, price], ...]
};
```

---

### 7. Alpha Vantage - Stock Market Data

**Purpose**: NSE/BSE stock prices, technical indicators  
**Pricing**: Free tier (5 calls/min, 500/day), Premium $50/month  
**Rate Limit**: 5 requests/minute (free tier)

**Setup:**
```bash
npm install alphavantage
```

**Environment Variables:**
```env
ALPHA_VANTAGE_API_KEY=your_api_key
```

**Implementation:**
```typescript
import alpha from 'alphavantage';

const av = alpha({ key: process.env.ALPHA_VANTAGE_API_KEY });

// Get stock quote
export const getStockQuote = async (symbol: string) => {
  const data = await av.data.quote(symbol);
  
  return {
    symbol: data['01. symbol'],
    price: parseFloat(data['05. price']),
    change: parseFloat(data['09. change']),
    changePercent: data['10. change percent'],
  };
};

// Get intraday data
export const getIntradayData = async (symbol: string) => {
  const data = await av.data.intraday(symbol, 'compact', 'json', '5min');
  return data['Time Series (5min)'];
};
```

---

## Payment & UPI APIs

### 8. Razorpay - UPI & Payment Gateway

**Purpose**: QR code payments, UPI links, MF/FD purchases  
**Pricing**: 2% transaction fee, free setup  
**Rate Limit**: 1000 requests/minute

**Setup:**
```bash
npm install razorpay
```

**Environment Variables:**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
```

**Implementation:**
```typescript
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create UPI payment order
export const createUPIOrder = async (amount: number, userId: string) => {
  const order = await razorpay.orders.create({
    amount: amount * 100, // paise
    currency: 'INR',
    receipt: `rcpt_${userId}_${Date.now()}`,
    payment_capture: 1,
  });
  
  return order;
};

// Generate QR code for UPI
export const generateQRCode = async (orderId: string) => {
  const qr = await razorpay.payments.fetchPaymentMethods({
    order_id: orderId,
  });
  
  return qr.qr_code_url;
};

// Verify payment signature
export const verifyPayment = (orderId: string, paymentId: string, signature: string) => {
  const crypto = require('crypto');
  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  
  return generated === signature;
};
```

---

## AI & Analytics APIs

### 9. OpenAI API - Transaction Parsing & Advice

**Purpose**: NLP for SMS/email parsing, budget advice, financial Q&A  
**Pricing**: GPT-4o $0.02/1K input tokens, $0.06/1K output tokens  
**Rate Limit**: 10,000 requests/minute (Tier 3)

**Setup:**
```bash
npm install openai
```

**Environment Variables:**
```env
OPENAI_API_KEY=sk-proj-xxxxx
```

**Implementation:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Parse transaction from SMS
export const parseTransaction = async (smsText: string) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'Extract transaction details from SMS. Return JSON: {merchant, amount, type, category, date, balance}',
      },
      { role: 'user', content: smsText },
    ],
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(completion.choices[0].message.content);
};

// Generate budget advice
export const generateBudgetAdvice = async (userId: string, spendingData: any) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a financial advisor. Provide personalized budget tips based on spending patterns.',
      },
      {
        role: 'user',
        content: JSON.stringify(spendingData),
      },
    ],
    max_tokens: 500,
  });
  
  return completion.choices[0].message.content;
};

// Categorize transaction
export const categorizeTransaction = async (merchant: string) => {
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: merchant,
  });
  
  // Compare with known categories using cosine similarity
  // ... semantic search logic
};
```

---

### 10. CIBIL API - Credit Score

**Purpose**: Pull credit scores for users  
**Pricing**: ₹50 per query (via partners like Paytm, PhonePe)  
**Rate Limit**: 10 requests/minute

**Setup:**
Via partner integration (requires partnership agreement)

**Sample Implementation:**
```typescript
// Typically accessed via partner OAuth flow
export const getCIBILScore = async (userId: string, consent: boolean) => {
  if (!consent) throw new Error('User consent required');
  
  // Call partner API (e.g., CRIF High Mark, Experian)
  const response = await fetch('https://partner-api.example.com/cibil', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PARTNER_API_KEY}`,
    },
    body: JSON.stringify({
      userId,
      pan: userPAN,
      dob: userDOB,
    }),
  });
  
  const data = await response.json();
  return {
    score: data.score,
    lastUpdated: data.date,
    factors: data.factors,
  };
};
```

---

## Location & Calendar APIs

### 11. Google Maps API - Geo-tagging

**Purpose**: Tag transactions with location, fuel station tracking  
**Pricing**: $200 free credit/month, then $5 per 1000 requests  
**Rate Limit**: 1000 requests/minute

**Setup:**
```bash
npm install @googlemaps/google-maps-services-js
```

**Implementation:**
```typescript
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export const geocodeLocation = async (address: string) => {
  const response = await client.geocode({
    params: {
      address,
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });
  
  return response.data.results[0].geometry.location;
};

export const getNearbyPlaces = async (lat: number, lng: number) => {
  const response = await client.placesNearby({
    params: {
      location: { lat, lng },
      radius: 500,
      type: 'gas_station',
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });
  
  return response.data.results;
};
```

---

### 12. Google Calendar API - Bill Reminders

**Purpose**: Sync EMI/bill due dates to calendar  
**Pricing**: Free (100 requests/day per user)  
**Rate Limit**: 100 queries/100 seconds/user

**Implementation:**
```typescript
import { google } from 'googleapis';

export const createCalendarEvent = async (accessToken: string, eventData: any) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startDate,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: eventData.endDate,
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    },
  });
  
  return event.data;
};
```

---

## Rate Limiting & Error Handling

### Implement Retry Logic

```typescript
export const retryWithBackoff = async (
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    if (error.response?.status === 429) {
      // Rate limit hit
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
};
```

### Cache Responses

```typescript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10 min TTL

export const getCachedStockPrice = async (symbol: string) => {
  const cached = cache.get(symbol);
  if (cached) return cached;
  
  const price = await getStockQuote(symbol);
  cache.set(symbol, price);
  return price;
};
```

---

## Security Best Practices

1. **Never expose API keys client-side** - Use environment variables and backend proxies
2. **Encrypt sensitive data** - Use AES-256 for PAN, DOB, account numbers
3. **Implement OAuth2** - For all third-party account connections
4. **Validate webhooks** - Verify signatures from Twilio, Razorpay, etc.
5. **Use HTTPS only** - All API calls must be over TLS 1.3+
6. **Rate limit your endpoints** - Prevent abuse with express-rate-limit
7. **Log all API calls** - For debugging and audit trails

---

## Cost Optimization Tips

1. **Use free tiers first** - Start with free quotas, upgrade when needed
2. **Cache aggressively** - Reduce redundant API calls (e.g., stock prices)
3. **Batch requests** - Combine multiple operations when APIs support it
4. **Monitor usage** - Set up billing alerts for all paid APIs
5. **Use webhooks** - Instead of polling (e.g., Plaid webhooks for transactions)

---

## Testing APIs

### Postman Collection

Create a shared Postman collection with:
- Authentication examples
- Sample requests/responses
- Environment variables (dev, staging, prod)

### Mock Servers

Use [MSW (Mock Service Worker)](https://mswjs.io/) for development:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/plaid/transactions', (req, res, ctx) => {
    return res(
      ctx.json({
        transactions: [
          { id: '1', merchant: 'Starbucks', amount: 450 },
        ],
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## API Integration Checklist

- [ ] Firebase Auth configured
- [ ] SMS webhook (Twilio) set up
- [ ] Gmail/Outlook OAuth implemented
- [ ] Bank sync (Plaid/Finvu) tested
- [ ] Zerodha Kite API connected
- [ ] Crypto prices (CoinGecko) working
- [ ] UPI payments (Razorpay) functional
- [ ] OpenAI parsing tested with 50+ samples
- [ ] Google Maps geo-tagging enabled
- [ ] Calendar sync (Google/Microsoft) working
- [ ] Error handling & retries implemented
- [ ] Rate limiting configured
- [ ] Monitoring/logging set up

---

**Total Monthly API Costs (MVP at 1K users):**
- Firebase: $10
- OpenAI: $50
- Plaid/Finvu: $500 (dev tier)
- Alpha Vantage: $0 (free tier)
- Others: $40
- **Total: ~$600/month**

---

**Document Owner**: Backend Lead  
**Last Updated**: November 1, 2025
