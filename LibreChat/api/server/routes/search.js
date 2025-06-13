import express from 'express';
import {  MeiliSearch  } from 'meilisearch';
import requireJwtAuth from '#server/middleware/requireJwtAuth.js';
import {  isEnabled  } from '#server/utils.js';

const router = express.Router();

router.use(requireJwtAuth);

router.get('/enable', async function (req, res) {
  if (!isEnabled(process.env.SEARCH)) {
    return res.send(false);
  }

  try {
    const client = new MeiliSearch({
      host: process.env.MEILI_HOST,
      apiKey: process.env.MEILI_MASTER_KEY,
    });

    const { status } = await client.health();
    return res.send(status === 'available');
  } catch (error) {
    return res.send(false);
  }
});

export default router;
