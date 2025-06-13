import { CacheKeys } from 'librechat-data-provider';
import { saveConvo } from '#models/Conversation.js';
import getLogStores from '#cache/getLogStores.js';
import { isEnabled } from '../../../utils/index.js';

const addTitle = async (req, { text, responseText, conversationId, client }) => {
  const { TITLE_CONVO = 'true' } = process.env ?? {};
  if (!isEnabled(TITLE_CONVO)) {
    return;
  }

  if (client.options.titleConvo === false) {
    return;
  }

  const titleCache = getLogStores(CacheKeys.GEN_TITLE);
  const key = `${req.user.id}-${conversationId}`;

  const title = await client.titleConvo({ text, conversationId, responseText });
  await titleCache.set(key, title, 120000);

  await saveConvo(
    req,
    {
      conversationId,
      title,
    },
    { context: 'api/server/services/Endpoints/assistants/addTitle.js' },
  );
};

export default addTitle;
