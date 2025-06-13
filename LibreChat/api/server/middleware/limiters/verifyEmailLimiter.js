import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ViolationTypes } from 'librechat-data-provider';
import { removePorts, isEnabled } from '#server/utils/index.js';
import ioredisClient from '#cache/ioredisClient.js';
import { logViolation } from '#cache/index.js';
import { logger } from '#config/index.js';

const {
  VERIFY_EMAIL_WINDOW = 2,
  VERIFY_EMAIL_MAX = 2,
  VERIFY_EMAIL_VIOLATION_SCORE: score,
} = process.env;
const windowMs = VERIFY_EMAIL_WINDOW * 60 * 1000;
const max = VERIFY_EMAIL_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many attempts, please try again after ${windowInMinutes} minute(s)`;

const handler = async (req, res) => {
  const type = ViolationTypes.VERIFY_EMAIL_LIMIT;
  const errorMessage = {
    type,
    max,
    windowInMinutes,
  };

  await logViolation(req, res, type, errorMessage, score);
  return res.status(429).json({ message });
};

const limiterOptions = {
  windowMs,
  max,
  handler,
  keyGenerator: removePorts,
};

if (isEnabled(process.env.USE_REDIS) && ioredisClient) {
  logger.debug('Using Redis for verify email rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'verify_email_limiter:',
  });
  limiterOptions.store = store;
}

const verifyEmailLimiter = rateLimit(limiterOptions);

export default verifyEmailLimiter;
