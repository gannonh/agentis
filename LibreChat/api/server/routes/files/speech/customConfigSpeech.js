import express from 'express';
const router = express.Router();

import { getCustomConfigSpeech } from '#server/services/Files/Audio.js';

router.get('/get', async (req, res) => {
  await getCustomConfigSpeech(req, res);
});

export default router;
