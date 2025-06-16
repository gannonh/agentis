import express from 'express';
const router = express.Router();
import requireBetterAuth from '#server/middleware/requireBetterAuth.js';
import { countTokens } from '#server/utils.js';
import { logger } from '#config.js';

router.post('/', requireBetterAuth, async (req, res) => {
  try {
    const { arg } = req.body;
    const count = await countTokens(arg?.text ?? arg);
    res.send({ count });
  } catch (e) {
    logger.error('[/tokenizer] Error counting tokens', e);
    res.status(500).json('Error counting tokens');
  }
});

export default router;
