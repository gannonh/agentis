/**
 * @fileoverview Vitest configuration for LibreChat API
 * Modern ESM-native test setup
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Only include our new ESM tests - be very specific
    include: [
      // Only our new Better Auth tests for now
      'auth.test.js',
      'config/betterAuth.test.js',
      // Pattern for future ESM tests we'll add (use .vitest.js for new tests)
      '**/*.vitest.{js,mjs,ts}',
    ],

    // Exclude all legacy CommonJS tests by specific paths
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      // Legacy test directories and files
      'app/clients/specs/**',
      'app/clients/tools/**/*.test.js',
      'app/clients/tools/**/*.spec.js',
      'app/clients/document/**/*.spec.js',
      'app/clients/prompts/**/*.spec.js',
      'app/clients/output_parsers/**/*.spec.js',
      'models/**/*.test.js',
      'models/**/*.spec.js',
      'strategies/**/*.test.js',
      'server/**/*.test.js',
      'server/**/*.spec.js',
      'cache/**/*.spec.js',
      'config/index.spec.js',
      'utils/**/*.spec.js',
      'test/__mocks__/**',
      'test/jestSetup.js',
      'test/jestTeardown.js',
    ],

    // Setup files (will convert these to ESM)
    setupFiles: ['./test/vitestSetup.js'],

    // Test timeout
    testTimeout: 30000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'auth.js',
        'config/betterAuth.js',
        'utils/organization.js',
        'server/services/OrganizationService.js',
        // Add more files as we write tests for them
      ],
    },

    // Globals (for describe, it, expect, etc.)
    globals: true,

    // Clear mocks between tests
    clearMocks: true,
  },

  // Path resolution for imports
  resolve: {
    alias: {
      // Map our # imports to actual paths
      '#config': resolve(process.cwd(), './config'),
      '#models': resolve(process.cwd(), './models'),
      '#server': resolve(process.cwd(), './server'),
      '#utils': resolve(process.cwd(), './utils'),
      '#lib': resolve(process.cwd(), './lib'),
      '#strategies': resolve(process.cwd(), './strategies'),
      '#app': resolve(process.cwd(), './app'),
      '#cache': resolve(process.cwd(), './cache'),
      // Legacy ~ alias support for any remaining references
      '~': resolve(process.cwd(), '.'),
    },
  },

  // Define for environment variables and globals
  define: {
    // Test environment flags
    'process.env.NODE_ENV': '"test"',
  },
});
