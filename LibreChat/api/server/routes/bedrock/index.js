import express from 'express';
import { 
  uaParser,
  checkBan,
  requireJwtAuth,
  messageIpLimiter,
  concurrentLimiter,
  messageUserLimiter,
 } from '#server/middleware.js';
import {  isEnabled  } from '#server/utils.js';
import chat from './chat.js';

const { LIMIT_CONCURRENT_MESSAGES, LIMIT_MESSAGE_IP, LIMIT_MESSAGE_USER } = process.env ?? {};

const router = express.Router();

router.use(requireJwtAuth);
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

router.use('/chat', chat);

export default router;
