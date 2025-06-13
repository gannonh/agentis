import express from 'express';
import {  getAvailableTools  } from '#server/controllers/PluginController.js';

const router = express.Router();

router.get('/', getAvailableTools);

export default router;
