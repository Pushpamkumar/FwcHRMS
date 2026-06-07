import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/db';

const LIMIT = 5;
const WINDOW_SECONDS = 15 * 60; // 15 minutes

export const authRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // Use IP as the rate limit key identifier
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const key = `ratelimit:auth:${ip}`;

  try {
    // If Redis is not connected, print a warning and bypass rate limiting so app doesn't break
    if (!redisClient.isOpen) {
      console.warn('[RateLimiter] Redis is not connected. Bypassing rate limiting.');
      return next();
    }

    const currentCount = await redisClient.incr(key);

    if (currentCount === 1) {
      // Set expiration on first hit
      await redisClient.expire(key, WINDOW_SECONDS);
    }

    if (currentCount > LIMIT) {
      const ttl = await redisClient.ttl(key);
      const minutesLeft = Math.ceil(ttl / 60);
      return res.status(429).json({
        message: `Too many login/register attempts. Please try again after ${minutesLeft} minutes.`,
      });
    }

    next();
  } catch (err) {
    console.error('[RateLimiter] Rate limiting check encountered an error:', err);
    next(); // Always proceed on internal rate limiter error to ensure availability
  }
};
