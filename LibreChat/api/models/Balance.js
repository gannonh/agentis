import mongoose from 'mongoose';
import { balanceSchema } from '@librechat/data-schemas';

export default mongoose.model('Balance', balanceSchema);
