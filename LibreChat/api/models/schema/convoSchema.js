import mongoose from 'mongoose';
import mongoMeili from '../plugins/mongoMeili.js';
import { convoSchema } from '@librechat/data-schemas';

if (process.env.MEILI_HOST && process.env.MEILI_MASTER_KEY) {
  convoSchema.plugin(mongoMeili, {
    host: process.env.MEILI_HOST,
    apiKey: process.env.MEILI_MASTER_KEY,
    /** Note: Will get created automatically if it doesn't exist already */
    indexName: 'convos',
    primaryKey: 'conversationId',
  });
}

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', convoSchema);

export default Conversation;
