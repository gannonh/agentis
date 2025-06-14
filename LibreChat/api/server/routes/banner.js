import express from 'express';

import {  getBanner  } from '#models/Banner.js';
import optionalBetterAuth from '#server/middleware/optionalBetterAuth.js';
const router = express.Router();

router.get('/', optionalBetterAuth, async (req, res) => {
  try {
    res.status(200).send(await getBanner(req.user));
  } catch (error) {
    res.status(500).json({ message: 'Error getting banner' });
  }
});

export default router;
