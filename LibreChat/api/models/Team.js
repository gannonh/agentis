/**
 * @file Team Mongoose model
 * @description Team model for multi-tenant team management
 */

import mongoose from 'mongoose';
import { teamSchema } from '@librechat/data-schemas';

/**
 * Team model
 * Represents a team within an organization in the multi-tenant system
 */
const Team = mongoose.model('Team', teamSchema);

export default Team;
