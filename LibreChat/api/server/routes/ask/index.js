import express from 'express';
import { EModelEndpoint } from 'librechat-data-provider';
import {
  uaParser,
  checkBan,
  requireBetterAuth,
  messageIpLimiter,
  concurrentLimiter,
  messageUserLimiter,
  validateConvoAccess,
} from '#server/middleware/index.js';
import { isEnabled } from '#server/utils/index.js';
import gptPlugins from './gptPlugins.js';
import anthropic from './anthropic.js';
import custom from './custom.js';
import google from './google.js';
import openAI from './openAI.js';

const { LIMIT_CONCURRENT_MESSAGES, LIMIT_MESSAGE_IP, LIMIT_MESSAGE_USER } = process.env ?? {};

const router = express.Router();

router.use(requireBetterAuth);
router.use(checkBan);
router.use(uaParser);

if (isEnabled(LIMIT_CONCURRENT_MESSAGES)) {
  router.use(concurrentLimiter);
}

if (isEnabled(LIMIT_MESSAGE_IP)) {
  router.use(messageIpLimiter);
}

if (isEnabled(LIMIT_MESSAGE_USER)) {
  router.use(messageUserLimiter);
}

router.use(validateConvoAccess);

router.use([`/${EModelEndpoint.azureOpenAI}`, `/${EModelEndpoint.openAI}`], openAI);
router.use(`/${EModelEndpoint.gptPlugins}`, gptPlugins);
router.use(`/${EModelEndpoint.anthropic}`, anthropic);
router.use(`/${EModelEndpoint.google}`, google);
router.use(`/${EModelEndpoint.custom}`, custom);

export default router;
