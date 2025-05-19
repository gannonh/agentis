/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for the Arcade configuration loader
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { loadArcadeConfig, validateConfig } from '../configLoader';
import type { ArcadeConfig } from '../../types';

describe('Arcade Configuration Loader', () => {
  // Mock environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateConfig', () => {
    it('should validate a valid configuration', () => {
      const validConfig: ArcadeConfig = {
        enabled: true,
        api_key: 'test-api-key',
        callback_url: 'https://example.com/callback',
        hosting: 'cloud',
        toolkits: [
          {
            id: 'github',
            name: 'GitHub',
            category: 'Developer Tools',
            description: 'GitHub integration',
          },
        ],
      };

      const result = validateConfig(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it('should return errors for invalid configuration', () => {
      const invalidConfig = {
        enabled: true,
        api_key: '', // Missing API key
        callback_url: 'not-a-valid-url', // Invalid URL
        hosting: 'invalid-hosting', // Invalid hosting option
        toolkits: [], // Valid but empty
      };

      const result = validateConfig(invalidConfig as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);

        // Check specific errors
        const errorMap = new Map(
          result.error.issues.map((issue: { path: any[]; message: any }) => [
            issue.path.join('.'),
            issue.message,
          ])
        );

        expect(errorMap.has('api_key')).toBe(true);
        expect(errorMap.has('callback_url')).toBe(true);
        expect(errorMap.has('hosting')).toBe(true);
      }
    });
  });

  describe('loadArcadeConfig', () => {
    it('should load configuration from environment variables', () => {
      // Set environment variables
      process.env.ARCADE_ENABLED = 'true';
      process.env.ARCADE_API_KEY = 'env-api-key';
      process.env.ARCADE_CALLBACK_URL = 'https://example.com/callback';
      process.env.ARCADE_HOSTING = 'cloud';

      // Mock YAML config (not provided in this test)
      const yamlConfig = null;

      const config = loadArcadeConfig(yamlConfig);
      expect(config.enabled).toBe(true);
      expect(config.api_key).toBe('env-api-key');
      expect(config.callback_url).toBe('https://example.com/callback');
      expect(config.hosting).toBe('cloud');
      expect(config.toolkits).toEqual([]);
    });

    it('should load configuration from YAML with environment variable overrides', () => {
      // Set environment variables (should override YAML)
      process.env.ARCADE_API_KEY = 'env-override-key';

      // Mock YAML config
      const yamlConfig = {
        arcade: {
          enabled: true,
          api_key: 'yaml-api-key',
          callback_url: 'https://yaml-example.com/callback',
          hosting: 'hybrid',
          toolkits: [
            {
              id: 'github',
              name: 'GitHub',
              category: 'Developer Tools',
              description: 'GitHub integration',
            },
          ],
        },
      };

      const config = loadArcadeConfig(yamlConfig);
      expect(config.enabled).toBe(true);
      expect(config.api_key).toBe('env-override-key'); // Environment variable takes precedence
      expect(config.callback_url).toBe('https://yaml-example.com/callback');
      expect(config.hosting).toBe('hybrid');
      expect(config.toolkits).toHaveLength(1);
      expect(config.toolkits[0].id).toBe('github');
    });

    it('should return disabled configuration when not configured', () => {
      // No environment variables or YAML config
      const config = loadArcadeConfig(null);
      expect(config.enabled).toBe(false);
    });

    it('should support self-hosted configuration', () => {
      // Set environment variables for self-hosted
      process.env.ARCADE_ENABLED = 'true';
      process.env.ARCADE_API_KEY = 'self-hosted-key';
      process.env.ARCADE_CALLBACK_URL = 'https://example.com/callback';
      process.env.ARCADE_HOSTING = 'self_hosted';
      process.env.ARCADE_ENGINE_HOST = 'localhost';
      process.env.ARCADE_ENGINE_PORT = '8000';

      const config = loadArcadeConfig(null);
      expect(config.enabled).toBe(true);
      expect(config.hosting).toBe('self_hosted');
      expect(config.engine).toBeDefined();
      expect(config.engine?.host).toBe('localhost');
      expect(config.engine?.port).toBe(8000);
    });

    it('should support hybrid configuration with worker', () => {
      // Set environment variables for hybrid with worker
      process.env.ARCADE_ENABLED = 'true';
      process.env.ARCADE_API_KEY = 'hybrid-key';
      process.env.ARCADE_CALLBACK_URL = 'https://example.com/callback';
      process.env.ARCADE_HOSTING = 'hybrid';
      process.env.ARCADE_WORKER_ENABLED = 'true';
      process.env.ARCADE_WORKER_HOST = 'worker-host';
      process.env.ARCADE_WORKER_PORT = '8002';
      process.env.ARCADE_WORKER_IMAGE = 'arcade/worker:latest';

      const config = loadArcadeConfig(null);
      expect(config.enabled).toBe(true);
      expect(config.hosting).toBe('hybrid');
      expect(config.worker).toBeDefined();
      expect(config.worker?.enabled).toBe(true);
      expect(config.worker?.host).toBe('worker-host');
      expect(config.worker?.port).toBe(8002);
      expect(config.worker?.image).toBe('arcade/worker:latest');
    });
  });
});
