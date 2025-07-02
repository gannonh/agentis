/**
 * @fileoverview Vitest integration test configuration for LibreChat API
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Only include integration tests
    include: [
      '**/*.integration.vitest.{js,mjs,ts}',
    ],

    // Exclude other files
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
    ],

    // Setup files
    setupFiles: ['./test/vitestSetup.js'],

    // Extended timeout for integration tests
    testTimeout: 60000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'auth.js',
        'config/betterAuth.js',
        'utils/organization.js',
        'server/services/OrganizationService.js',
      ],
    },

    // Globals
    globals: true,

    // Clear mocks between tests
    clearMocks: true,
  },

  // Path resolution for imports
  resolve: {
    alias: {
      '#config': resolve(process.cwd(), './config'),
      '#models': resolve(process.cwd(), './models'),
      '#server': resolve(process.cwd(), './server'),
      '#utils': resolve(process.cwd(), './utils'),
      '#lib': resolve(process.cwd(), './lib'),
      '#strategies': resolve(process.cwd(), './strategies'),
      '#app': resolve(process.cwd(), './app'),
      '#cache': resolve(process.cwd(), './cache'),
      '~': resolve(process.cwd(), '.'),
    },
  },

  // Define for environment variables
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});