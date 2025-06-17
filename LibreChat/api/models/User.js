import mongoose from 'mongoose';
import { userSchema } from '@librechat/data-schemas';

// Force collection name to 'user' (singular) to match Better Auth
const User = mongoose.model('User', userSchema, 'user');

export default User;
