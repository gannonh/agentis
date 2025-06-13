import express from 'express';

import {  getBanner  } from '#models/Banner.js';
import optionalJwtAuth from '#server/middleware/optionalJwtAuth.js';
const router = express.Router();

router.get('/', optionalJwtAuth, async (req, res) => {
  try {
    res.status(200).send(await getBanner(req.user));
  } catch (error) {
    res.status(500).json({ message: 'Error getting banner' });
  }
});

export default router;
