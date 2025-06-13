import mongoose from 'mongoose';
import { presetSchema } from '@librechat/data-schemas';

const Preset = mongoose.models.Preset || mongoose.model('Preset', presetSchema);

export default Preset;
