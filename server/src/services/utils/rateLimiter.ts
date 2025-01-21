import { rateLimit, Options } from 'express-rate-limit';

export const routeRateLimiter = (options: Options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 100,
    limit: options.limit || 1000,
    standardHeaders: options.standardHeaders || 'draft-7',
    legacyHeaders: options.legacyHeaders || false,
    message: 'Too many requests from the server'
  });
};
