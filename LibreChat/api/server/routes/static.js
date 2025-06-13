import express from 'express';
import staticCache from '../utils/staticCache.js';
import paths from '#config/paths.js';

const router = express.Router();
router.use(staticCache(paths.imageOutput));

export default router;
