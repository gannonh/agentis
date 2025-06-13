import mongoose from 'mongoose';
import { composioConnectedAccountSchema } from '@librechat/data-schemas';

const ComposioConnectedAccount = mongoose.model(
  'ComposioConnectedAccount',
  composioConnectedAccountSchema,
);

export default ComposioConnectedAccount;
