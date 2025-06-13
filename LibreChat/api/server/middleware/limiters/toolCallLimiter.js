import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { ViolationTypes } from 'librechat-data-provider';
import ioredisClient from '#cache/ioredisClient.js';
import logViolation from '#cache/logViolation.js';
import { isEnabled } from '#server/utils/index.js';
import { logger } from '#config/index.js';

const handler = async (req, res) => {
  const type = ViolationTypes.TOOL_CALL_LIMIT;
  const errorMessage = {
    type,
    max: 1,
    limiter: 'user',
    windowInMinutes: 1,
  };

  await logViolation(req, res, type, errorMessage, 0);
  res.status(429).json({ message: 'Too many tool call requests. Try again later' });
};

const limiterOptions = {
  windowMs: 1000,
  max: 1,
  handler,
  keyGenerator: function (req) {
    return req.user?.id;
  },
};

if (isEnabled(process.env.USE_REDIS) && ioredisClient) {
  logger.debug('Using Redis for tool call rate limiter.');
  const store = new RedisStore({
    sendCommand: (...args) => ioredisClient.call(...args),
    prefix: 'tool_call_limiter:',
  });
  limiterOptions.store = store;
}

const toolCallLimiter = rateLimit(limiterOptions);

export default toolCallLimiter;
