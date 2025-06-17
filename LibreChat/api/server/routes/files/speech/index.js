import express from 'express';
import { createTTSLimiters, createSTTLimiters } from '#server/middleware.js';

import stt from './stt.js';
import tts from './tts.js';
import customConfigSpeech from './customConfigSpeech.js';

const router = express.Router();

const { sttIpLimiter, sttUserLimiter } = createSTTLimiters();
const { ttsIpLimiter, ttsUserLimiter } = createTTSLimiters();
router.use('/stt', sttIpLimiter, sttUserLimiter, stt);
router.use('/tts', ttsIpLimiter, ttsUserLimiter, tts);

router.use('/config', customConfigSpeech);

export default router;
