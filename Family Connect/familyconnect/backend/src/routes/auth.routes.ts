import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();
router.use((_req, res, next) => {
  if (process.env.ULTIMATE_BRIDGE_SECRET) { res.status(410).json({ error: 'Family uses your Ultimate account. Separate Family sign-in and registration are disabled.' }); return; }
  next();
});

router.post('/register', register);
router.post('/login', login);

export default router;
