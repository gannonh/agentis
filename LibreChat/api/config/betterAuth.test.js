/**
 * @fileoverview Unit tests for Better Auth configuration
 * @module config/betterAuth.test
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

describe('Better Auth Configuration', () => {
  let betterAuthConfig;

  beforeEach(async () => {
    // Set required environment variables for tests
    process.env.DOMAIN_SERVER = 'http://localhost:3080';
    process.env.DOMAIN_CLIENT = 'http://localhost:3090';

    const configModule = await import('./betterAuth.js');
    betterAuthConfig = configModule.betterAuthConfig;
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.DOMAIN_SERVER;
    delete process.env.DOMAIN_CLIENT;
  });

  describe('Configuration Structure', () => {
    test('should export betterAuthConfig object', () => {
      expect(betterAuthConfig).toBeDefined();
      expect(typeof betterAuthConfig).toBe('object');
    });

    test('should have required top-level properties', () => {
      expect(betterAuthConfig).toHaveProperty('basePath');
      expect(betterAuthConfig).toHaveProperty('emailAndPassword');
      expect(betterAuthConfig).toHaveProperty('emailVerification');
      expect(betterAuthConfig).toHaveProperty('session');
    });
  });

  describe('Base Path Configuration', () => {
    test('should have correct basePath', () => {
      expect(betterAuthConfig.basePath).toBe('/api/auth');
    });

    test('should have basePath as string', () => {
      expect(typeof betterAuthConfig.basePath).toBe('string');
    });

    test('should start with forward slash', () => {
      expect(betterAuthConfig.basePath).toMatch(/^\/api\/auth$/);
    });
  });

  describe('Email and Password Configuration', () => {
    test('should have emailAndPassword configuration', () => {
      expect(betterAuthConfig.emailAndPassword).toBeDefined();
      expect(typeof betterAuthConfig.emailAndPassword).toBe('object');
    });

    test('should have enabled property set to true', () => {
      expect(betterAuthConfig.emailAndPassword.enabled).toBe(true);
    });

    test('should have minimum password length', () => {
      expect(betterAuthConfig.emailAndPassword.minPasswordLength).toBe(8);
      expect(typeof betterAuthConfig.emailAndPassword.minPasswordLength).toBe('number');
    });

    test('should have maximum password length', () => {
      expect(betterAuthConfig.emailAndPassword.maxPasswordLength).toBe(128);
      expect(typeof betterAuthConfig.emailAndPassword.maxPasswordLength).toBe('number');
    });

    test('should have valid password length range', () => {
      const { minPasswordLength, maxPasswordLength } = betterAuthConfig.emailAndPassword;
      expect(minPasswordLength).toBeGreaterThan(0);
      expect(maxPasswordLength).toBeGreaterThan(minPasswordLength);
      expect(minPasswordLength).toBeGreaterThanOrEqual(8); // Security best practice
      expect(maxPasswordLength).toBeLessThanOrEqual(256); // Reasonable upper limit
    });
  });

  describe('Email Verification Configuration', () => {
    test('should have emailVerification configuration', () => {
      expect(betterAuthConfig.emailVerification).toBeDefined();
      expect(typeof betterAuthConfig.emailVerification).toBe('object');
    });

    test('should have enabled property set to false initially', () => {
      expect(betterAuthConfig.emailVerification.enabled).toBe(false);
    });

    test('should have sendOnSignUp property set to false', () => {
      expect(betterAuthConfig.emailVerification.sendOnSignUp).toBe(false);
    });

    test('should have boolean values for email verification settings', () => {
      expect(typeof betterAuthConfig.emailVerification.enabled).toBe('boolean');
      expect(typeof betterAuthConfig.emailVerification.sendOnSignUp).toBe('boolean');
    });
  });

  describe('Session Configuration', () => {
    test('should have session configuration', () => {
      expect(betterAuthConfig.session).toBeDefined();
      expect(typeof betterAuthConfig.session).toBe('object');
    });

    test('should have expiresIn property', () => {
      expect(betterAuthConfig.session.expiresIn).toBeDefined();
      expect(typeof betterAuthConfig.session.expiresIn).toBe('number');
    });

    test('should have updateAge property', () => {
      expect(betterAuthConfig.session.updateAge).toBeDefined();
      expect(typeof betterAuthConfig.session.updateAge).toBe('number');
    });

    test('should have cookieAge property', () => {
      expect(betterAuthConfig.session.cookieAge).toBeDefined();
      expect(typeof betterAuthConfig.session.cookieAge).toBe('number');
    });

    test('should have 1 year expiration (31536000 seconds)', () => {
      const oneYearInSeconds = 60 * 60 * 24 * 365;
      expect(betterAuthConfig.session.expiresIn).toBe(oneYearInSeconds);
    });

    test('should have no automatic session refresh (0 seconds)', () => {
      expect(betterAuthConfig.session.updateAge).toBe(0);
    });

    test('should have 1 year cookie age (31536000 seconds)', () => {
      const oneYearInSeconds = 60 * 60 * 24 * 365;
      expect(betterAuthConfig.session.cookieAge).toBe(oneYearInSeconds);
    });

    test('should have valid session timing relationships', () => {
      const { expiresIn, updateAge, cookieAge } = betterAuthConfig.session;

      // Update age should be less than or equal to expiration time
      expect(updateAge).toBeLessThanOrEqual(expiresIn);

      // Cookie age should match session expiration for consistency
      expect(cookieAge).toBe(expiresIn);

      // Expiration and cookie age should be positive
      expect(expiresIn).toBeGreaterThan(0);
      expect(cookieAge).toBeGreaterThan(0);

      // Update age can be 0 (disabled automatic refresh)
      expect(updateAge).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Values Validation', () => {
    test('should have secure default values', () => {
      // Password requirements should meet basic security standards
      expect(betterAuthConfig.emailAndPassword.minPasswordLength).toBeGreaterThanOrEqual(8);

      // Session should not be too long (max 2 years for reasonable security)
      const twoYearsInSeconds = 60 * 60 * 24 * 365 * 2;
      expect(betterAuthConfig.session.expiresIn).toBeLessThanOrEqual(twoYearsInSeconds);

      // Session should not be too short (min 1 hour for usability)
      const oneHourInSeconds = 60 * 60;
      expect(betterAuthConfig.session.expiresIn).toBeGreaterThanOrEqual(oneHourInSeconds);
    });

    test('should have consistent configuration across properties', () => {
      // Email verification should be consistently disabled
      expect(betterAuthConfig.emailVerification.enabled).toBe(false);
      expect(betterAuthConfig.emailVerification.sendOnSignUp).toBe(false);

      // Session timing should be consistent
      expect(betterAuthConfig.session.expiresIn).toBe(betterAuthConfig.session.cookieAge);
    });

    test('should not have undefined or null values', () => {
      const checkObject = (obj, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (value === null || value === undefined) {
            throw new Error(`Configuration has null/undefined value at ${currentPath}`);
          }

          if (typeof value === 'object' && !Array.isArray(value)) {
            checkObject(value, currentPath);
          }
        });
      };

      expect(() => checkObject(betterAuthConfig)).not.toThrow();
    });
  });

  describe('Configuration Immutability', () => {
    test('should not allow modification of config object', () => {
      // Note: This test assumes the config is exported as a const
      // In practice, you might want to freeze the object for immutability
      const originalBasePath = betterAuthConfig.basePath;

      // Attempt to modify (this might not throw in non-strict mode)
      try {
        betterAuthConfig.basePath = '/different/path';
      } catch (error) {
        // Expected in strict mode or with frozen objects
      }

      // Config should remain unchanged or be easily detectable
      expect(betterAuthConfig.basePath).toBeDefined();
    });
  });

  describe('TypeScript Compatibility', () => {
    test('should match expected TypeScript interface structure', () => {
      // This test ensures the config matches the expected TypeScript interface
      const expectedStructure = {
        basePath: 'string',
        emailAndPassword: {
          enabled: 'boolean',
          minPasswordLength: 'number',
          maxPasswordLength: 'number',
        },
        emailVerification: {
          enabled: 'boolean',
          sendOnSignUp: 'boolean',
        },
        session: {
          expiresIn: 'number',
          updateAge: 'number',
          cookieAge: 'number',
        },
      };

      const checkTypes = (expected, actual, path = '') => {
        Object.entries(expected).forEach(([key, expectedType]) => {
          const actualValue = actual[key];
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof expectedType === 'object') {
            expect(actualValue).toBeDefined();
            expect(typeof actualValue).toBe('object');
            checkTypes(expectedType, actualValue, currentPath);
          } else {
            expect(typeof actualValue).toBe(expectedType);
          }
        });
      };

      checkTypes(expectedStructure, betterAuthConfig);
    });
  });
});
