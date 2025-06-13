import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ViolationTypes } from 'librechat-data-provider';
import { removePorts, isEnabled } from '#server/utils/index.js';
import ioredisClient from '#cache/ioredisClient.js';
import { logViolation } from '#cache/index.js';
import { logger } from '#config/index.js';

const {
  RESET_PASSWORD_WINDOW = 2,
  RESET_PASSWORD_MAX = 2,
  RESET_PASSWORD_VIOLATION_SCORE: score,
} = process.env;
const windowMs = RESET_PASSWORD_WINDOW * 60 * 1000;
const max = RESET_PASSWORD_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many attempts, please try again after ${windowInMinutes} minute(s)`;

const handler = async (req, res) => {
  const type = ViolationTypes.RESET_PASSWORD_LIMIT;
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
  logger.debug('Using Redis for reset password rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'reset_password_limiter:',
  });
  limiterOptions.store = store;
}

const resetPasswordLimiter = rateLimit(limiterOptions);

export default resetPasswordLimiter;
