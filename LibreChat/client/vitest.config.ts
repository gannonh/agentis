/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      exclude: [
        'node_modules/',
        'test/',
        'dist/',
        '**/*.d.ts',
        '**/*.css.d.ts',
        'coverage/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      // Todo: Add coverageThreshold once we have enough coverage
      // Note: eventually we want to have these values set to 80%
      // thresholds: {
      //   global: {
      //     functions: 80,
      //     lines: 80,
      //     statements: 80,
      //     branches: 80,
      //   },
      // },
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      'test': path.resolve(__dirname, './test'),
      'librechat-data-provider/react-query': path.resolve(__dirname, '../node_modules/librechat-data-provider/src/react-query'),
    },
  },
});