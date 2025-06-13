import mongoose from 'mongoose';
import { userSchema } from '@librechat/data-schemas';

const User = mongoose.model('User', userSchema);

export default User;
