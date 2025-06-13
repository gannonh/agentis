import { promises as fs } from 'fs';
import { getImporter } from './importers.js';
import { indexSync } from '../../../lib/db/index.js';
import { logger } from '#config/index.js';

/**
 * Job definition for importing a conversation.
 * @param {{ filepath, requestUserId }} job - The job object.
 */
const importConversations = async (job) => {
  const { filepath, requestUserId } = job;
  try {
    logger.debug(`user: ${requestUserId} | Importing conversation(s) from file...`);
    const fileData = await fs.readFile(filepath, 'utf8');
    const jsonData = JSON.parse(fileData);
    const importer = getImporter(jsonData);
    await importer(jsonData, requestUserId);
    // Sync Meilisearch index
    await indexSync();
    logger.debug(`user: ${requestUserId} | Finished importing conversations`);
  } catch (error) {
    logger.error(`user: ${requestUserId} | Failed to import conversation: `, error);
  } finally {
    try {
      await fs.unlink(filepath);
    } catch (error) {
      logger.error(`user: ${requestUserId} | Failed to delete file: ${filepath}`, error);
    }
  }
};

export default importConversations;
