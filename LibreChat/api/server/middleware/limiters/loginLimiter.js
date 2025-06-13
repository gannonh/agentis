import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { removePorts, isEnabled } from '#server/utils/index.js';
import ioredisClient from '#cache/ioredisClient.js';
import { logViolation } from '#cache/index.js';
import { logger } from '#config/index.js';

const { LOGIN_WINDOW = 5, LOGIN_MAX = 7, LOGIN_VIOLATION_SCORE: score } = process.env;
const windowMs = LOGIN_WINDOW * 60 * 1000;
const max = LOGIN_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many login attempts, please try again after ${windowInMinutes} minutes.`;

const handler = async (req, res) => {
  const type = 'logins';
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
  logger.debug('Using Redis for login rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'login_limiter:',
  });
  limiterOptions.store = store;
}

const loginLimiter = rateLimit(limiterOptions);

export default loginLimiter;
