import path from 'path';
import { promises as fs } from 'fs';
import express from 'express';
import {  isAgentsEndpoint  } from 'librechat-data-provider';
import { 
  filterFile,
  processImageFile,
  processAgentFileUpload,
 } from '#server/services/Files/process.js';
import {  logger  } from '#config.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const metadata = req.body;

  try {
    filterFile({ req, image: true });

    metadata.temp_file_id = metadata.file_id;
    metadata.file_id = req.file_id;

    if (isAgentsEndpoint(metadata.endpoint) && metadata.tool_resource != null) {
      return await processAgentFileUpload({ req, res, metadata });
    }

    await processImageFile({ req, res, metadata });
  } catch (error) {
    // TODO: delete remote file if it exists
    logger.error('[/files/images] Error processing file:', error);
    try {
      const filepath = path.join(
        req.app.locals.paths.imageOutput,
        req.user.id,
        path.basename(req.file.filename),
      );
      await fs.unlink(filepath);
    } catch (error) {
      logger.error('[/files/images] Error deleting file:', error);
    }
    res.status(500).json({ message: 'Error processing file' });
  } finally {
    try {
      await fs.unlink(req.file.path);
      logger.debug('[/files/images] Temp. image upload file deleted');
    } catch (error) {
      logger.debug('[/files/images] Temp. image upload file already deleted');
    }
  }
});

export default router;
