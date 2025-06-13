import express from 'express';
const router = express.Router();
import controller from '../controllers/Balance.js';
import {  requireJwtAuth  } from '../middleware/index.js';

router.get('/', requireJwtAuth, controller);

export default router;
