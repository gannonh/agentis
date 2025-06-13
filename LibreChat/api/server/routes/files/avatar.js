import { promises as fs } from 'fs';
import express from 'express';
import {  getStrategyFunctions  } from '#server/services/Files/strategies.js';
import resizeAvatar from '#server/services/Files/images/avatar.js';
import {  filterFile  } from '#server/services/Files/process.js';
import {  logger  } from '#config.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    filterFile({ req, file: req.file, image: true, isAvatar: true });
    const userId = req.user.id;
    const { manual } = req.body;
    const input = await fs.readFile(req.file.path);

    if (!userId) {
      throw new Error('User ID is undefined');
    }

    const fileStrategy = req.app.locals.fileStrategy;
    const desiredFormat = req.app.locals.imageOutputType;
    const resizedBuffer = await resizeAvatar({
      userId,
      input,
      desiredFormat,
    });

    const { processAvatar } = getStrategyFunctions(fileStrategy);
    const url = await processAvatar({ buffer: resizedBuffer, userId, manual });

    res.json({ url });
  } catch (error) {
    const message = 'An error occurred while uploading the profile picture';
    logger.error(message, error);
    res.status(500).json({ message });
  } finally {
    try {
      await fs.unlink(req.file.path);
      logger.debug('[/files/images/avatar] Temp. image upload file deleted');
    } catch (error) {
      logger.debug('[/files/images/avatar] Temp. image upload file already deleted');
    }
  }
});

export default router;
