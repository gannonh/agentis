import mongoose from 'mongoose';
import mongoMeili from '../plugins/mongoMeili.js';
import { messageSchema } from '@librechat/data-schemas';

if (process.env.MEILI_HOST && process.env.MEILI_MASTER_KEY) {
  messageSchema.plugin(mongoMeili, {
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_MASTER_KEY,
    indexName: 'messages',
    primaryKey: 'messageId',
  });
}

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
