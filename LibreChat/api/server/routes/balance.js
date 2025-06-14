import express from 'express';
const router = express.Router();
import controller from '../controllers/Balance.js';
import { requireBetterAuth } from '../middleware/index.js';

router.get('/', requireBetterAuth, controller);

export default router;
