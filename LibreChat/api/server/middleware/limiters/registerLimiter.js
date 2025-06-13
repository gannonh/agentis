import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { removePorts, isEnabled } from '#server/utils/index.js';
import ioredisClient from '#cache/ioredisClient.js';
import { logViolation } from '#cache/index.js';
import { logger } from '#config/index.js';

const { REGISTER_WINDOW = 60, REGISTER_MAX = 5, REGISTRATION_VIOLATION_SCORE: score } = process.env;
const windowMs = REGISTER_WINDOW * 60 * 1000;
const max = REGISTER_MAX;
const windowInMinutes = windowMs / 60000;
const message = `Too many accounts created, please try again after ${windowInMinutes} minutes`;

const handler = async (req, res) => {
  const type = 'registrations';
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
  logger.debug('Using Redis for register rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'register_limiter:',
  });
  limiterOptions.store = store;
}

const registerLimiter = rateLimit(limiterOptions);

export default registerLimiter;
