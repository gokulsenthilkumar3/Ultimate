import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import Stripe from 'stripe';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
const app = express();
const PORT = 3001;
const JWT_SECRET = 'super-secret-local-key';

app.use(cors());
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// Delay to simulate network
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/auth/signup', async (req, res) => {
  await delay(500);
  const { email, password, fullName, referralCode } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newReferralCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        referralCode: newReferralCode
      }
    });

    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        await prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            status: 'pending'
          }
        });
      }
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        referralCode: user.referralCode,
        creditBalance: user.creditBalance,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/auth/login', async (req, res) => {
  await delay(500);
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        subscriptionTier: user.subscriptionTier,
        referralCode: user.referralCode,
        creditBalance: user.creditBalance,
        user_metadata: { full_name: user.fullName }
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID || 'price_mock',
        quantity: 1,
      }],
      success_url: `http://localhost:5173/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/pricing`,
      client_reference_id: userId,
      subscription_data: {
        trial_period_days: 14,
      }
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier: 'pro',
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active'
        }
      });
    }
  }

  res.json({ received: true });
});

app.get('/api/referrals', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const history = await prisma.referral.findMany({ 
      where: { referrerId: user.id },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      referralCode: user.referralCode,
      creditBalance: user.creditBalance,
      history
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/referrals/sync', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const referral = await prisma.referral.findFirst({
      where: { referredId: decoded.userId, status: 'pending' }
    });
    
    if (referral) {
      await prisma.referral.update({
        where: { id: referral.id },
        data: { status: 'completed' }
      });
      await prisma.user.update({
        where: { id: referral.referrerId },
        data: { creditBalance: { increment: 10 } }
      });
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { creditBalance: { increment: 10 } }
      });
      return res.json({ success: true, message: 'Referral completed.' });
    }
    res.json({ success: false, message: 'No pending referral found.' });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.listen(PORT, () => {
  console.log(`Local Auth Server running on http://localhost:${PORT}`);
});
