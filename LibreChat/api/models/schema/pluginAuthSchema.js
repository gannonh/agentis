import mongoose from 'mongoose';
import { pluginAuthSchema } from '@librechat/data-schemas';

const PluginAuth = mongoose.models.Plugin || mongoose.model('PluginAuth', pluginAuthSchema);

export default PluginAuth;
