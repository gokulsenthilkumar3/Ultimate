const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-key-for-dev';

module.exports = function authRoutes(prisma) {
  const router = express.Router();

  // Middleware to verify token
  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.id;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Failed to authenticate token' });
    }
  };

  router.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'User already exists' });

      const password_hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password_hash }
      });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/me', verifyToken, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user.id, email: user.email } });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return { router, verifyToken };
};
