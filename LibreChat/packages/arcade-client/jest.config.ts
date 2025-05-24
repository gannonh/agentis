/** @type {import('jest').Config} */
export default {
  // Base configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // ESM support
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // Test patterns
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.spec.[jt]s?(x)',
    '**/?(*.)+(test|spec).[jt]s?(x)',
  ],

  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/__tests__/**/*'],
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 30,
      functions: 20,
      lines: 30,
    },
  },

  // Other options
  restoreMocks: true,
  clearMocks: true,
  testTimeout: 10000,
};
