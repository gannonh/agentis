import mongoose from 'mongoose';
import { keySchema } from '@librechat/data-schemas';

export default mongoose.model('Key', keySchema);
