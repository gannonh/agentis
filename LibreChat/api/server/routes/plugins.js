import express from 'express';
import {  getAvailablePluginsController  } from '../controllers/PluginController.js';
import requireJwtAuth from '../middleware/requireJwtAuth.js';

const router = express.Router();

router.get('/', requireJwtAuth, getAvailablePluginsController);

export default router;
