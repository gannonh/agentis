/**
 * @fileoverview Vitest setup configuration
 * @module test/vitestSetup
 */

if (process.env.TEST_MODE === 'integration') {
  // Integration test environment
  process.env.MONGO_URI = 'mongodb://admin:password@localhost:27017/AgentisTest?authSource=admin';
  process.env.JWT_SECRET = 'test-jwt-secret-for-agentis-integration';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-agentis-integration';
  process.env.CREDS_KEY = 'c3301ad2f69681295e022fb135e92787afb6ecfeaa012a10f8bb4ddf6b669e6d';
  process.env.CREDS_IV = 'cd02538f4be2fa37aba9420b5924389f';
  process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret-key-for-agentis-integration';
  console.log('🔗 Integration tests: using real database');
} else {
  // Unit test environment (dummy values)
  process.env.MONGO_URI = 'mongodb://localhost:27017/dummy-test-db';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  process.env.CREDS_KEY = 'test-creds-key';
  process.env.CREDS_IV = 'test-creds-iv';
  process.env.BETTER_AUTH_SECRET = 'test-better-auth-secret';
  console.log('🎭 Unit tests: using dummy database');
}

// Common test environment settings
process.env.NODE_ENV = 'test';
process.env.BAN_VIOLATIONS = 'false';
process.env.CI = 'true';
