/* eslint-disable @typescript-eslint/no-explicit-any */
import { MCPManager } from './manager';
import type { Logger } from 'winston';

// Mock logger
const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

describe('MCPManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset the singleton instance
    (MCPManager as any).instance = null;
  });

  afterEach(() => {
    jest.useRealTimers();
    (MCPManager as any).instance = null;
  });

  it('should create singleton instance', () => {
    const manager = MCPManager.getInstance(mockLogger);
    expect(manager).toBeDefined();
  });

  it('should return same instance on multiple calls', () => {
    const manager1 = MCPManager.getInstance(mockLogger);
    const manager2 = MCPManager.getInstance(mockLogger);
    expect(manager1).toBe(manager2);
  });

  it('should have getAllConnections method', () => {
    const manager = MCPManager.getInstance(mockLogger);
    const connections = manager.getAllConnections();
    expect(connections).toBeInstanceOf(Map);
    expect(connections.size).toBe(0);
  });

  it('should throw error for unknown servers in callTool', async () => {
    const manager = MCPManager.getInstance(mockLogger);

    await expect(
      manager.callTool({
        serverName: 'unknown-server',
        toolName: 'test-tool',
        provider: 'openAI',
      }),
    ).rejects.toThrow();
  });
});
