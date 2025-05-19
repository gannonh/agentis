/**
 * Tests for type definitions
 */
import { describe, it, expect } from '@jest/globals';

// Import specific types to test
import { ArcadeConfig, ArcadeHealthResponse, ArcadeAuthResponse } from './index';

describe('Arcade Types', () => {
  it('should correctly define ArcadeConfig type', () => {
    // This is a runtime test that validates the TypeScript types work as expected
    const mockConfig: ArcadeConfig = {
      enabled: true,
      api_key: 'test-key',
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

    expect(mockConfig.enabled).toBe(true);
    expect(mockConfig.api_key).toBe('test-key');
    expect(mockConfig.hosting).toBe('cloud');
    expect(mockConfig.toolkits.length).toBe(1);
    expect(mockConfig.toolkits[0].id).toBe('github');
  });

  it('should allow different hosting options', () => {
    // Test cloud option
    const cloudConfig: ArcadeConfig = {
      enabled: true,
      api_key: 'key',
      callback_url: 'https://example.com',
      hosting: 'cloud',
      toolkits: [],
    };
    expect(cloudConfig.hosting).toBe('cloud');

    // Test hybrid option
    const hybridConfig: ArcadeConfig = {
      enabled: true,
      api_key: 'key',
      callback_url: 'https://example.com',
      hosting: 'hybrid',
      toolkits: [],
      worker: {
        enabled: true,
        host: 'localhost',
        port: 8001,
      },
    };
    expect(hybridConfig.hosting).toBe('hybrid');
    expect(hybridConfig.worker?.enabled).toBe(true);

    // Test self-hosted option
    const selfHostedConfig: ArcadeConfig = {
      enabled: true,
      api_key: 'key',
      callback_url: 'https://example.com',
      hosting: 'self_hosted',
      toolkits: [],
      engine: {
        host: 'localhost',
        port: 8000,
      },
    };
    expect(selfHostedConfig.hosting).toBe('self_hosted');
    expect(selfHostedConfig.engine?.host).toBe('localhost');
  });

  it('should correctly define health response', () => {
    const healthy: ArcadeHealthResponse = { healthy: true };
    const unhealthy: ArcadeHealthResponse = { healthy: false };

    expect(healthy.healthy).toBe(true);
    expect(unhealthy.healthy).toBe(false);
  });

  it('should correctly define auth response states', () => {
    const pending: ArcadeAuthResponse = {
      id: 'auth-123',
      status: 'pending',
      url: 'https://example.com/auth',
    };

    const completed: ArcadeAuthResponse = {
      id: 'auth-123',
      status: 'completed',
      provider_id: 'github',
      user_id: 'user-123',
      context: {
        token: 'abc123',
        user_info: { name: 'Test User' },
      },
    };

    const failed: ArcadeAuthResponse = {
      id: 'auth-123',
      status: 'failed',
    };

    expect(pending.status).toBe('pending');
    expect(completed.status).toBe('completed');
    expect(failed.status).toBe('failed');
  });
});
