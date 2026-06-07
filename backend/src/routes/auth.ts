import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getDepartments,
} from '../controllers/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limited auth endpoints
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);

// Non-rate limited auth endpoints
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.get('/departments', getDepartments);

export default router;
