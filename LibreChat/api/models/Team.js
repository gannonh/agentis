/**
 * @file Team Mongoose model
 * @description Team model for multi-tenant team management
 */

const mongoose = require('mongoose');
const { teamSchema } = require('@librechat/data-schemas');

/**
 * Team model
 * Represents a team within an organization in the multi-tenant system
 */
const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
