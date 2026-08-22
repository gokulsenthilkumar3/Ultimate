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
    const { email, password, fullName } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: 'User already exists' });

      const password_hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password_hash, fullName }
      });

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName || email.split('@')[0] } });
    } catch (err) {
      console.error('[Signup Error]', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
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
      res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName || email.split('@')[0] } });
    } catch (err) {
      console.error('[Login Error]', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  router.get('/me', verifyToken, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user.id, email: user.email, fullName: user.fullName || user.email.split('@')[0] } });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/profile', verifyToken, async (req, res) => {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.userId;

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const updateData = {};
      if (name !== undefined) {
        updateData.fullName = name;
      }
      
      if (email && email !== user.email) {
        const emailExists = await prisma.user.findUnique({ where: { email } });
        if (emailExists) {
          return res.status(400).json({ error: 'Email is already in use by another account' });
        }
        updateData.email = email;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to set a new password' });
        }
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
          return res.status(400).json({ error: 'Invalid current password' });
        }
        updateData.password_hash = await bcrypt.hash(newPassword, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName || updatedUser.email.split('@')[0],
        }
      });
    } catch (err) {
      console.error('[Profile Update Error]', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

  return { router, verifyToken };
};
