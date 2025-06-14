import express from 'express';
const router = express.Router();
import { requireBetterAuth } from '#server/middleware.js';
import {  getCategories  } from '#models/Categories.js';

router.get('/', requireBetterAuth, async (req, res) => {
  try {
    const categories = await getCategories();
    res.status(200).send(categories);
  } catch (error) {
    res.status(500).send({ message: 'Failed to retrieve categories', error: error.message });
  }
});

export default router;
