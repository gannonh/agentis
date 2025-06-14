/**
 * @fileoverview Vitest setup configuration
 * Converted from Jest setup for ESM compatibility
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: './test/.env.test' });

// Set test environment variables
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/dummy-uri';
process.env.BAN_VIOLATIONS = 'true';
process.env.BAN_DURATION = '7200000';
process.env.BAN_INTERVAL = '20';
process.env.CI = 'true';
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test';
process.env.CREDS_KEY = 'test';
process.env.CREDS_IV = 'test';
process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-key-for-testing';

// Test-specific environment setup
process.env.NODE_ENV = 'test';