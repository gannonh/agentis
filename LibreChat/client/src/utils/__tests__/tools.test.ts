// No need to import describe, it, expect with Jest as they are globally available
import {
  groupMCPToolsByServer,
  groupAgentToolsByServer,
  formatServerName,
  formatToolName,
  getServerDisplayName,
  getToolDisplayName,
} from '../tools';
import type { TPlugin } from 'librechat-data-provider';

describe('MCP Tool Utilities', () => {
  describe('groupMCPToolsByServer', () => {
    it('should return empty arrays when no tools are provided', () => {
      const result = groupMCPToolsByServer(undefined);
      expect(result.mcpServers).toEqual([]);
      expect(result.regularTools).toEqual([]);
    });

    it('should correctly group MCP tools by server', () => {
      const mockTools: TPlugin[] = [
        {
          name: 'Regular Tool',
          pluginKey: 'regular_tool',
          description: 'A regular tool',
        },
        {
          name: 'Google Sheets Create',
          pluginKey: 'create_sheet_mcp_googlesheets',
          description: 'Create a Google Sheet',
          icon: 'https://example.com/sheets.png',
        },
        {
          name: 'Google Sheets Update',
          pluginKey: 'update_sheet_mcp_googlesheets',
          description: 'Update a Google Sheet',
        },
        {
          name: 'Google Auth Helper',
          pluginKey: 'auth_helper_mcp_googlesheets',
          description: 'Auth helper for Google',
          isHelper: true,
        },
        {
          name: 'Gmail Send',
          pluginKey: 'send_email_mcp_gmail',
          description: 'Send an email',
          icon: 'https://example.com/gmail.png',
        },
      ];

      const result = groupMCPToolsByServer(mockTools);

      // Check regular tools
      expect(result.regularTools).toHaveLength(1);
      expect(result.regularTools[0].pluginKey).toBe('regular_tool');

      // Check MCP servers
      expect(result.mcpServers).toHaveLength(2);

      // Check Google Sheets server group
      const sheetsServer = result.mcpServers.find((s) => s.serverName === 'googlesheets');
      expect(sheetsServer).toBeDefined();
      expect(sheetsServer?.tools).toHaveLength(2);
      expect(sheetsServer?.helperTools).toHaveLength(1);
      expect(sheetsServer?.icon).toBe('https://example.com/sheets.png');

      // Check Gmail server group
      const gmailServer = result.mcpServers.find((s) => s.serverName === 'gmail');
      expect(gmailServer).toBeDefined();
      expect(gmailServer?.tools).toHaveLength(1);
      expect(gmailServer?.helperTools).toHaveLength(0);
      expect(gmailServer?.icon).toBe('https://example.com/gmail.png');
    });

    it('should correctly identify helper tools', () => {
      const mockTools: TPlugin[] = [
        {
          name: 'Tool 1',
          pluginKey: 'tool_1_mcp_server1',
          description: 'Regular tool',
        },
        {
          name: 'Helper Tool 1',
          pluginKey: 'helper_tool_mcp_server1',
          description: 'Helper tool by name',
        },
        {
          name: 'Helper Tool 2',
          pluginKey: 'tool_2_mcp_server1',
          description: 'Helper tool by flag',
          isHelper: true,
        },
        {
          name: 'Composio Check',
          pluginKey: 'composio_check_mcp_server1',
          description: 'Composio check tool',
        },
        {
          name: 'Composio Initiate',
          pluginKey: 'composio_initiate_mcp_server1',
          description: 'Composio initiate tool',
        },
      ];

      const result = groupMCPToolsByServer(mockTools);

      // Check that all helper tools are correctly identified
      const server = result.mcpServers[0];
      expect(server.tools).toHaveLength(1);
      expect(server.helperTools).toHaveLength(4);

      // Check that the helper tools are the expected ones
      const helperKeys = server.helperTools.map((t) => t.pluginKey);
      expect(helperKeys).toContain('helper_tool_mcp_server1');
      expect(helperKeys).toContain('tool_2_mcp_server1');
      expect(helperKeys).toContain('composio_check_mcp_server1');
      expect(helperKeys).toContain('composio_initiate_mcp_server1');
    });
  });

  describe('groupAgentToolsByServer', () => {
    it('should return empty arrays when no tools are provided', () => {
      const result = groupAgentToolsByServer(undefined, undefined);
      expect(result.mcpServerGroups).toEqual({});
      expect(result.individualTools).toEqual([]);
    });

    it('should correctly group agent tools by server', () => {
      const mockToolKeys = [
        'regular_tool',
        'create_sheet_mcp_googlesheets',
        'update_sheet_mcp_googlesheets',
        'send_email_mcp_gmail',
      ];

      const mockAllTools: TPlugin[] = [
        {
          name: 'Regular Tool',
          pluginKey: 'regular_tool',
          description: 'A regular tool',
        },
        {
          name: 'Google Sheets Create',
          pluginKey: 'create_sheet_mcp_googlesheets',
          description: 'Create a Google Sheet',
        },
        {
          name: 'Google Sheets Update',
          pluginKey: 'update_sheet_mcp_googlesheets',
          description: 'Update a Google Sheet',
        },
        {
          name: 'Gmail Send',
          pluginKey: 'send_email_mcp_gmail',
          description: 'Send an email',
        },
        {
          name: 'Tool Not In Keys',
          pluginKey: 'not_in_keys',
          description: 'Tool not in selected keys',
        },
      ];

      const result = groupAgentToolsByServer(mockToolKeys, mockAllTools);

      // Check individual tools
      expect(result.individualTools).toHaveLength(1);
      expect(result.individualTools[0].pluginKey).toBe('regular_tool');

      // Check MCP server groups
      expect(Object.keys(result.mcpServerGroups)).toHaveLength(2);

      // Check Google Sheets group
      expect(result.mcpServerGroups['googlesheets']).toHaveLength(2);
      expect(result.mcpServerGroups['googlesheets'].map((t) => t.pluginKey)).toContain(
        'create_sheet_mcp_googlesheets',
      );
      expect(result.mcpServerGroups['googlesheets'].map((t) => t.pluginKey)).toContain(
        'update_sheet_mcp_googlesheets',
      );

      // Check Gmail group
      expect(result.mcpServerGroups['gmail']).toHaveLength(1);
      expect(result.mcpServerGroups['gmail'][0].pluginKey).toBe('send_email_mcp_gmail');
    });

    it('should handle missing tools gracefully', () => {
      const mockToolKeys = ['regular_tool', 'nonexistent_tool_key'];

      const mockAllTools: TPlugin[] = [
        {
          name: 'Regular Tool',
          pluginKey: 'regular_tool',
          description: 'A regular tool',
        },
      ];

      const result = groupAgentToolsByServer(mockToolKeys, mockAllTools);

      // Should only include the tools that exist in allTools
      expect(result.individualTools).toHaveLength(1);
      expect(result.individualTools[0].pluginKey).toBe('regular_tool');
      expect(Object.keys(result.mcpServerGroups)).toHaveLength(0);
    });
  });

  describe('formatServerName', () => {
    it('should format common MCP server names correctly', () => {
      expect(formatServerName('googlesheets')).toBe('Google Sheets');
      expect(formatServerName('github')).toBe('GitHub');
      expect(formatServerName('firebase-mcp')).toBe('Firebase');
      expect(formatServerName('firebase-mcp-dev')).toBe('Firebase (Dev)');
    });

    it('should handle hyphenated names', () => {
      expect(formatServerName('custom-server')).toBe('Custom Server');
      expect(formatServerName('firebase-custom')).toBe('Firebase Custom');
    });

    it('should handle camelCase names', () => {
      expect(formatServerName('myCustomServer')).toBe('My Custom Server');
      expect(formatServerName('camelCaseExample')).toBe('Camel Case Example');
    });

    it('should handle standard names', () => {
      expect(formatServerName('regular')).toBe('Regular');
      expect(formatServerName('server')).toBe('Server');
    });
  });

  describe('formatToolName', () => {
    it('should format tool names with server prefix', () => {
      expect(formatToolName('GOOGLESHEETS_BATCH_GET', 'googlesheets')).toBe('Batch Get');
      expect(formatToolName('github_get_pull_request', 'github')).toBe('Get Pull Request');
    });

    it('should format tool names with underscores', () => {
      expect(formatToolName('get_user_info')).toBe('Get User Info');
      expect(formatToolName('CREATE_NEW_DOCUMENT')).toBe('Create New Document');
    });

    it('should handle simple tool names', () => {
      expect(formatToolName('search')).toBe('Search');
      expect(formatToolName('find')).toBe('Find');
    });
  });

  describe('getServerDisplayName', () => {
    it('should use configured display name when available', () => {
      expect(getServerDisplayName('googlesheets', { displayName: 'Custom Google Sheets' })).toBe(
        'Custom Google Sheets',
      );
    });

    it('should fall back to formatted name when no config is provided', () => {
      expect(getServerDisplayName('googlesheets')).toBe('Google Sheets');
    });

    it('should fall back to formatted name when config has no display name', () => {
      expect(getServerDisplayName('firebase-mcp', {})).toBe('Firebase');
    });
  });

  describe('getToolDisplayName', () => {
    it('should use configured display name when available', () => {
      expect(
        getToolDisplayName('SHEETS_BATCH_GET', 'sheets', {
          toolDisplayNames: { SHEETS_BATCH_GET: 'Custom Batch Get' },
        }),
      ).toBe('Custom Batch Get');
    });

    it('should fall back to formatted name when no config is provided', () => {
      expect(getToolDisplayName('GITHUB_GET_REPO', 'github')).toBe('Get Repo');
    });

    it('should fall back to formatted name when config has no matching tool', () => {
      expect(
        getToolDisplayName('SHEETS_UPDATE', 'sheets', {
          toolDisplayNames: { OTHER_TOOL: 'Other Tool' },
        }),
      ).toBe('Update');
    });
  });
});
