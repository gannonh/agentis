import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ViolationTypes } from 'librechat-data-provider';
import { removePorts, isEnabled } from '#server/utils/index.js';
import ioredisClient from '#cache/ioredisClient.js';
import { logViolation } from '#cache/index.js';
import { logger } from '#config/index.js';

const {
  USERNAME_CHECK_WINDOW = 1,
  USERNAME_CHECK_MAX = 10,
  USERNAME_CHECK_VIOLATION_SCORE: score,
} = process.env;
const windowMs = USERNAME_CHECK_WINDOW * 60 * 1000;
const max = USERNAME_CHECK_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many username check requests, please try again after ${windowInMinutes} minute(s)`;

const handler = async (req, res) => {
  const type = ViolationTypes.USERNAME_CHECK_LIMIT;
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
  standardHeaders: true,
  legacyHeaders: false,
};

if (isEnabled(process.env.USE_REDIS) && ioredisClient) {
  logger.debug('Using Redis for username check rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'username_check_limiter:',
  });
  limiterOptions.store = store;
}

const usernameCheckLimiter = rateLimit(limiterOptions);

export default usernameCheckLimiter;
