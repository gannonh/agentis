import express from 'express';
import { speechToText } from '#server/services/Files/Audio.js';

const router = express.Router();

router.post('/', speechToText);

export default router;
