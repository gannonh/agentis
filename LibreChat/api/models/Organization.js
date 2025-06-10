/**
 * @file Organization Mongoose model
 * @description Organization model for multi-tenant architecture
 */

const mongoose = require('mongoose');
const { organizationSchema } = require('@librechat/data-schemas');

/**
 * Organization model
 * Represents a tenant organization in the multi-tenant system
 */
const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;