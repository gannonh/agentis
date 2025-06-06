const mongoose = require('mongoose');
const { composioConnectedAccountSchema } = require('@librechat/data-schemas');

const ComposioConnectedAccount = mongoose.model(
  'ComposioConnectedAccount',
  composioConnectedAccountSchema,
);

module.exports = ComposioConnectedAccount;
