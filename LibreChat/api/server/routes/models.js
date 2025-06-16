import express from 'express';
import { modelController } from '#server/controllers/ModelController.js';
import { requireBetterAuth } from '#server/middleware/index.js';

const router = express.Router();
router.get('/', requireBetterAuth, modelController);

export default router;
