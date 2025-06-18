/**
 * @fileoverview Vitest configuration for integration tests
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',

    // Only include integration tests
    include: ['**/*.integration.vitest.js'],

    // Setup files
    setupFiles: ['./test/vitestSetup.js'],

    // Longer timeout for integration tests
    testTimeout: 60000,

    // Globals (for describe, it, expect, etc.)
    globals: true,

    // Clear mocks between tests
    clearMocks: true,
  },

  // Path resolution for imports (same as unit tests)
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

  // Define for environment variables and globals
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});
