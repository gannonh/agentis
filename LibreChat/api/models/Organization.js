/**
 * @file Organization Mongoose model
 * @description Organization model for multi-tenant architecture
 */

import mongoose from 'mongoose';
import { organizationSchema } from '@librechat/data-schemas';

/**
 * Organization model
 * Represents a tenant organization in the multi-tenant system
 */
// Disabled to prevent duplicate collection with Better Auth
// const Organization = mongoose.model('Organization', organizationSchema);
const Organization = null;

export default Organization;
