import express from 'express';
import {  modelController  } from '#server/controllers/ModelController.js';
import {  requireJwtAuth  } from '#server/middleware/index.js';

const router = express.Router();
router.get('/', requireJwtAuth, modelController);

export default router;
