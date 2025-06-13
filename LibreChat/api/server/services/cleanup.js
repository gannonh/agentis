import { logger } from '#config/index.js';
import { deleteNullOrEmptyConversations } from '../../models/Conversation.js';
const cleanup = async () => {
  try {
    await deleteNullOrEmptyConversations();
  } catch (error) {
    logger.error('[cleanup] Error during app cleanup', error);
  } finally {
    logger.debug('Startup cleanup complete');
  }
};

export { cleanup };
