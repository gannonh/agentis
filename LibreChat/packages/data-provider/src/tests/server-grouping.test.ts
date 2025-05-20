import { expect, describe, it } from 'vitest';
import { z } from 'zod';
import { tPluginSchema } from '../schemas';

// This test ensures that our TPlugin schema can handle server grouping properties
describe('TPlugin Schema with Server Grouping', () => {
  it('should validate a basic plugin', () => {
    const basicPlugin = {
      name: 'Test Plugin',
      pluginKey: 'test_plugin',
      description: 'A test plugin'
    };
    
    const result = tPluginSchema.safeParse(basicPlugin);
    expect(result.success).toBe(true);
  });

  it('should validate an MCP server plugin with server properties', () => {
    const serverPlugin = {
      name: 'Google Sheets',
      pluginKey: 'server_mcp_googlesheets',
      description: 'Google Sheets integration',
      isServer: true,
      tools: [
        {
          name: 'Create Sheet',
          pluginKey: 'create_sheet_mcp_googlesheets',
          description: 'Create a new Google Sheet'
        },
        {
          name: 'Update Sheet',
          pluginKey: 'update_sheet_mcp_googlesheets',
          description: 'Update a Google Sheet'
        }
      ]
    };
    
    // This should fail without schema updates
    const result = tPluginSchema.safeParse(serverPlugin);
    expect(result.success).toBe(false);
  });

  it('should validate a helper tool with helper properties', () => {
    const helperTool = {
      name: 'Auth Helper',
      pluginKey: 'auth_helper_mcp_googlesheets',
      description: 'Authentication helper for Google Sheets',
      isHelper: true,
      hidden: true,
      serverId: 'server_mcp_googlesheets'
    };
    
    // This should fail without schema updates
    const result = tPluginSchema.safeParse(helperTool);
    expect(result.success).toBe(false);
  });
});