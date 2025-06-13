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
import {  v1  } from './v1.js';
import chat from './chat.js';

const { LIMIT_CONCURRENT_MESSAGES, LIMIT_MESSAGE_IP, LIMIT_MESSAGE_USER } = process.env ?? {};

const router = express.Router();

router.use(requireJwtAuth);
router.use(checkBan);
router.use(uaParser);

router.use('/', v1);

const chatRouter = express.Router();
if (isEnabled(LIMIT_CONCURRENT_MESSAGES)) {
  chatRouter.use(concurrentLimiter);
}

if (isEnabled(LIMIT_MESSAGE_IP)) {
  chatRouter.use(messageIpLimiter);
}

if (isEnabled(LIMIT_MESSAGE_USER)) {
  chatRouter.use(messageUserLimiter);
}

chatRouter.use('/', chat);
router.use('/chat', chatRouter);

export default router;
