import express from 'express';
import { getAvailablePluginsController } from '../controllers/PluginController.js';
import requireBetterAuth from '../middleware/requireBetterAuth.js';

const router = express.Router();

router.get('/', requireBetterAuth, getAvailablePluginsController);

export default router;
