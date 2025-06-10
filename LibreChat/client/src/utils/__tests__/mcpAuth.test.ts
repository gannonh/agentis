/**
 * Unit tests for MCP authentication utility functions
 */

import type { TPlugin } from 'librechat-data-provider';
import type { TAgentOption } from '~/common';
import {
  requiresAuthentication,
  getAuthService,
  extractMCPServerName,
  detectMCPAuthServices,
  getConversationAuthServices,
  shouldShowAuthUI,
  getServiceDisplayName,
} from '../mcpAuth';

describe('MCP Authentication Utilities', () => {
  describe('requiresAuthentication', () => {
    it('should return true for supported Google services', () => {
      expect(requiresAuthentication('googlesheets')).toBe(true);
      expect(requiresAuthentication('googledocs')).toBe(true);
      expect(requiresAuthentication('googledrive')).toBe(true);
      expect(requiresAuthentication('gmail')).toBe(true);
      expect(requiresAuthentication('googlecalendar')).toBe(true);
    });

    it('should return true for supported third-party services', () => {
      expect(requiresAuthentication('notion')).toBe(true);
    });

    it('should return false for unsupported services', () => {
      expect(requiresAuthentication('unknown-service')).toBe(false);
      expect(requiresAuthentication('slack')).toBe(false);
      expect(requiresAuthentication('github')).toBe(false);
    });

    it('should handle empty and invalid inputs', () => {
      expect(requiresAuthentication('')).toBe(false);
      expect(requiresAuthentication(' ')).toBe(false);
      expect(requiresAuthentication('  whitespace  ')).toBe(false);
    });
  });

  describe('getAuthService', () => {
    it('should return correct service names for supported services', () => {
      expect(getAuthService('googlesheets')).toBe('googlesheets');
      expect(getAuthService('googledocs')).toBe('googledocs');
      expect(getAuthService('googledrive')).toBe('googledrive');
      expect(getAuthService('gmail')).toBe('gmail');
      expect(getAuthService('googlecalendar')).toBe('googlecalendar');
      expect(getAuthService('notion')).toBe('notion');
    });

    it('should return undefined for unsupported services', () => {
      expect(getAuthService('unknown-service')).toBeUndefined();
      expect(getAuthService('slack')).toBeUndefined();
      expect(getAuthService('github')).toBeUndefined();
    });

    it('should handle empty and invalid inputs', () => {
      expect(getAuthService('')).toBeUndefined();
      expect(getAuthService(' ')).toBeUndefined();
      expect(getAuthService('  whitespace  ')).toBeUndefined();
    });
  });

  describe('extractMCPServerName', () => {
    it('should extract server name from valid MCP tool keys', () => {
      expect(extractMCPServerName('create_sheet_mcp_googlesheets')).toBe('googlesheets');
      expect(extractMCPServerName('send_email_mcp_gmail')).toBe('gmail');
      expect(extractMCPServerName('create_doc_mcp_googledocs')).toBe('googledocs');
      expect(extractMCPServerName('upload_file_mcp_googledrive')).toBe('googledrive');
      expect(extractMCPServerName('create_event_mcp_googlecalendar')).toBe('googlecalendar');
      expect(extractMCPServerName('create_page_mcp_notion')).toBe('notion');
    });

    it('should handle tools with multiple underscores', () => {
      expect(extractMCPServerName('very_long_tool_name_mcp_googlesheets')).toBe('googlesheets');
      expect(extractMCPServerName('multi_word_function_mcp_complex_server_name')).toBe(
        'complex_server_name',
      );
    });

    it('should return null for non-MCP tools', () => {
      expect(extractMCPServerName('regular_tool')).toBeNull();
      expect(extractMCPServerName('another-tool')).toBeNull();
      expect(extractMCPServerName('tool_without_mcp')).toBeNull();
    });

    it('should handle malformed MCP tool keys', () => {
      expect(extractMCPServerName('tool_mcp_')).toBeNull(); // Empty string after mcp_ returns null
      expect(extractMCPServerName('_mcp_server')).toBe('server');
      expect(extractMCPServerName('mcp_server')).toBeNull(); // Doesn't contain full '_mcp_' delimiter
    });

    it('should handle edge cases and invalid inputs', () => {
      expect(extractMCPServerName('')).toBeNull();
      expect(extractMCPServerName('mcp')).toBeNull();
      expect(extractMCPServerName('_mcp_')).toBeNull(); // Empty string after mcp_ returns null
      expect(extractMCPServerName('tool_MCP_server')).toBeNull(); // Case sensitive
    });
  });

  describe('detectMCPAuthServices', () => {
    const mockAllTools: TPlugin[] = [
      {
        pluginKey: 'create_sheet_mcp_googlesheets',
        name: 'Create Sheet',
        description: 'Create a new Google Sheet',
      },
      {
        pluginKey: 'send_email_mcp_gmail',
        name: 'Send Email',
        description: 'Send an email via Gmail',
      },
      {
        pluginKey: 'create_doc_mcp_googledocs',
        name: 'Create Doc',
        description: 'Create a new Google Doc',
      },
      {
        pluginKey: 'upload_file_mcp_googledrive',
        name: 'Upload File',
        description: 'Upload a file to Google Drive',
      },
      {
        pluginKey: 'create_event_mcp_googlecalendar',
        name: 'Create Event',
        description: 'Create a calendar event',
      },
      {
        pluginKey: 'create_page_mcp_notion',
        name: 'Create Page',
        description: 'Create a new Notion page',
      },
      { pluginKey: 'regular_tool', name: 'Regular Tool', description: 'A regular non-MCP tool' },
      {
        pluginKey: 'unknown_mcp_unsupported',
        name: 'Unknown MCP Tool',
        description: 'An unsupported MCP tool',
      },
    ];

    it('should detect all supported MCP services from agent tools', () => {
      const agent: TAgentOption = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [
          'create_sheet_mcp_googlesheets',
          'send_email_mcp_gmail',
          'create_doc_mcp_googledocs',
          'upload_file_mcp_googledrive',
          'create_event_mcp_googlecalendar',
          'create_page_mcp_notion',
        ],
      } as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toHaveLength(6);
      expect(result).toContain('googlesheets');
      expect(result).toContain('gmail');
      expect(result).toContain('googledocs');
      expect(result).toContain('googledrive');
      expect(result).toContain('googlecalendar');
      expect(result).toContain('notion');
    });

    it('should filter out non-MCP tools', () => {
      const agent: TAgentOption = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: ['regular_tool', 'another_regular_tool', 'create_sheet_mcp_googlesheets'],
      } as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toHaveLength(1);
      expect(result).toContain('googlesheets');
    });

    it('should filter out unsupported MCP services', () => {
      const agent: TAgentOption = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: ['unknown_mcp_unsupported', 'create_sheet_mcp_googlesheets'],
      } as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toHaveLength(1);
      expect(result).toContain('googlesheets');
    });

    it('should return unique services only', () => {
      const agent: TAgentOption = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [
          'create_sheet_mcp_googlesheets',
          'update_sheet_mcp_googlesheets',
          'delete_sheet_mcp_googlesheets',
        ],
      } as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toHaveLength(1);
      expect(result).toContain('googlesheets');
    });

    it('should handle empty or missing tools array', () => {
      const agentWithEmptyTools = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [],
      } as unknown as TAgentOption;

      const agentWithoutTools = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
      } as unknown as TAgentOption;

      expect(detectMCPAuthServices(agentWithEmptyTools, mockAllTools)).toEqual([]);
      expect(detectMCPAuthServices(agentWithoutTools, mockAllTools)).toEqual([]);
    });

    it('should handle null or undefined agent', () => {
      expect(detectMCPAuthServices(null, mockAllTools)).toEqual([]);
      expect(detectMCPAuthServices(undefined, mockAllTools)).toEqual([]);
    });

    it('should handle malformed tool names in tools array', () => {
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [null, undefined, '', 'valid_mcp_googlesheets'] as any,
      } as unknown as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toHaveLength(1);
      expect(result).toContain('googlesheets');
    });

    it('should handle non-array tools property', () => {
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: 'not-an-array' as any,
      } as unknown as TAgentOption;

      const result = detectMCPAuthServices(agent, mockAllTools);
      expect(result).toEqual([]);
    });
  });

  describe('getConversationAuthServices', () => {
    const mockAgent: TAgentOption = {
      id: 'test-agent',
      value: 'test-agent',
      label: 'Test Agent',
      name: 'Test Agent',
      tools: ['create_sheet_mcp_googlesheets', 'send_email_mcp_gmail'],
    } as TAgentOption;

    const mockAllTools: TPlugin[] = [
      {
        pluginKey: 'create_sheet_mcp_googlesheets',
        name: 'Create Sheet',
        description: 'Create a new Google Sheet',
      },
      {
        pluginKey: 'send_email_mcp_gmail',
        name: 'Send Email',
        description: 'Send an email via Gmail',
      },
    ];

    it('should return auth services when conversation has agent', () => {
      const conversation = { agent_id: 'test-agent' };
      const result = getConversationAuthServices(conversation, mockAgent, mockAllTools);
      expect(result).toHaveLength(2);
      expect(result).toContain('googlesheets');
      expect(result).toContain('gmail');
    });

    it('should return auth services when agent is provided directly', () => {
      const conversation = null;
      const result = getConversationAuthServices(conversation, mockAgent, mockAllTools);
      expect(result).toHaveLength(2);
      expect(result).toContain('googlesheets');
      expect(result).toContain('gmail');
    });

    it('should return empty array when no agent is associated', () => {
      const conversation = {};
      const result = getConversationAuthServices(conversation, null, mockAllTools);
      expect(result).toEqual([]);
    });

    it('should return empty array when conversation is null and no agent provided', () => {
      const result = getConversationAuthServices(null, null, mockAllTools);
      expect(result).toEqual([]);
    });

    it('should return empty array when conversation is undefined and no agent provided', () => {
      const result = getConversationAuthServices(undefined, null, mockAllTools);
      expect(result).toEqual([]);
    });

    it('should prioritize direct agent over conversation agent_id', () => {
      const conversation = { agent_id: 'different-agent' };
      const result = getConversationAuthServices(conversation, mockAgent, mockAllTools);
      expect(result).toHaveLength(2);
      expect(result).toContain('googlesheets');
      expect(result).toContain('gmail');
    });
  });

  describe('shouldShowAuthUI', () => {
    it('should return true when auth services are detected', () => {
      const messages = [{ role: 'user' }];
      const authServices = ['googlesheets', 'gmail'];
      expect(shouldShowAuthUI(messages, authServices)).toBe(true);
    });

    it('should return false when no auth services are detected', () => {
      const messages = [{ role: 'user' }];
      const authServices: string[] = [];
      expect(shouldShowAuthUI(messages, authServices)).toBe(false);
    });

    it('should return false when auth services array is null', () => {
      const messages = [{ role: 'user' }];
      expect(shouldShowAuthUI(messages, null as any)).toBe(false);
    });

    it('should return false when auth services array is undefined', () => {
      const messages = [{ role: 'user' }];
      expect(shouldShowAuthUI(messages, undefined as any)).toBe(false);
    });

    it('should handle undefined messages array', () => {
      const authServices = ['googlesheets'];
      expect(shouldShowAuthUI(undefined, authServices)).toBe(true);
    });

    it('should handle empty messages array', () => {
      const authServices = ['googlesheets'];
      expect(shouldShowAuthUI([], authServices)).toBe(true);
    });

    it('should return true even with single auth service', () => {
      const messages = [{ role: 'user' }];
      const authServices = ['googlesheets'];
      expect(shouldShowAuthUI(messages, authServices)).toBe(true);
    });
  });

  describe('getServiceDisplayName', () => {
    it('should return correct display names for Google services', () => {
      expect(getServiceDisplayName('googlesheets')).toBe('Google Sheets');
      expect(getServiceDisplayName('googledocs')).toBe('Google Docs');
      expect(getServiceDisplayName('googledrive')).toBe('Google Drive');
      expect(getServiceDisplayName('gmail')).toBe('Gmail');
      expect(getServiceDisplayName('googlecalendar')).toBe('Google Calendar');
    });

    it('should return correct display names for third-party services', () => {
      expect(getServiceDisplayName('notion')).toBe('Notion');
    });

    it('should return service identifier for unknown services', () => {
      expect(getServiceDisplayName('unknown-service')).toBe('unknown-service');
      expect(getServiceDisplayName('custom-service')).toBe('custom-service');
    });

    it('should handle empty and special characters', () => {
      expect(getServiceDisplayName('')).toBe('');
      expect(getServiceDisplayName(' ')).toBe(' ');
      expect(getServiceDisplayName('service-with-dashes')).toBe('service-with-dashes');
      expect(getServiceDisplayName('service_with_underscores')).toBe('service_with_underscores');
    });
  });

  describe('Integration Tests', () => {
    const mockAllTools: TPlugin[] = [
      {
        pluginKey: 'create_sheet_mcp_googlesheets',
        name: 'Create Sheet',
        description: 'Create a new Google Sheet',
      },
      {
        pluginKey: 'send_email_mcp_gmail',
        name: 'Send Email',
        description: 'Send an email via Gmail',
      },
      {
        pluginKey: 'create_doc_mcp_googledocs',
        name: 'Create Doc',
        description: 'Create a new Google Doc',
      },
      { pluginKey: 'regular_tool', name: 'Regular Tool', description: 'A regular non-MCP tool' },
      {
        pluginKey: 'unknown_mcp_unsupported',
        name: 'Unknown MCP Tool',
        description: 'An unsupported MCP tool',
      },
    ];

    it('should work end-to-end: agent with mixed tools to auth UI', () => {
      // Setup agent with mixed MCP and regular tools
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [
          'regular_tool',
          'create_sheet_mcp_googlesheets',
          'send_email_mcp_gmail',
          'unknown_mcp_unsupported',
        ],
      } as unknown as TAgentOption;

      const conversation = { agent_id: 'test-agent' };
      const messages = [{ role: 'user' }];

      // Get required auth services
      const authServices = getConversationAuthServices(conversation, agent, mockAllTools);

      // Should detect only supported auth services
      expect(authServices).toHaveLength(2);
      expect(authServices).toContain('googlesheets');
      expect(authServices).toContain('gmail');

      // Should recommend showing auth UI
      expect(shouldShowAuthUI(messages, authServices)).toBe(true);

      // Should provide correct display names
      expect(getServiceDisplayName('googlesheets')).toBe('Google Sheets');
      expect(getServiceDisplayName('gmail')).toBe('Gmail');
    });

    it('should work end-to-end: agent with only regular tools', () => {
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: ['regular_tool', 'another_regular_tool'],
      } as unknown as TAgentOption;

      const conversation = { agent_id: 'test-agent' };
      const messages = [{ role: 'user' }];

      const authServices = getConversationAuthServices(conversation, agent, mockAllTools);

      expect(authServices).toEqual([]);
      expect(shouldShowAuthUI(messages, authServices)).toBe(false);
    });

    it('should work end-to-end: multiple tools from same service', () => {
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: [
          'create_sheet_mcp_googlesheets',
          'update_sheet_mcp_googlesheets',
          'delete_sheet_mcp_googlesheets',
        ],
      } as unknown as TAgentOption;

      const conversation = { agent_id: 'test-agent' };
      const messages = [{ role: 'user' }];

      const authServices = getConversationAuthServices(conversation, agent, mockAllTools);

      expect(authServices).toHaveLength(1);
      expect(authServices).toContain('googlesheets');
      expect(shouldShowAuthUI(messages, authServices)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed agent objects', () => {
      const malformedAgent: any = {
        id: 'test',
        tools: 'not-an-array',
      };

      const result = detectMCPAuthServices(malformedAgent, []);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined allTools parameter', () => {
      const agent = {
        id: 'test-agent',
        value: 'test-agent',
        label: 'Test Agent',
        name: 'Test Agent',
        tools: ['create_sheet_mcp_googlesheets'],
      } as unknown as TAgentOption;

      expect(detectMCPAuthServices(agent, null as any)).toEqual(['googlesheets']);
      expect(detectMCPAuthServices(agent, undefined as any)).toEqual(['googlesheets']);
    });

    it('should handle tools with special characters', () => {
      const specialTools = [
        'tool-with-dashes_mcp_server',
        'tool.with.dots_mcp_server',
        'tool with spaces_mcp_server',
        'tool@with#symbols_mcp_server',
      ];

      specialTools.forEach((tool) => {
        expect(extractMCPServerName(tool)).toBe('server');
      });
    });

    it('should handle very long tool names', () => {
      const longTool =
        'this_is_a_very_long_tool_name_that_might_cause_issues_with_parsing_mcp_googlesheets';
      expect(extractMCPServerName(longTool)).toBe('googlesheets');
    });

    it('should handle case sensitivity correctly', () => {
      expect(extractMCPServerName('tool_MCP_server')).toBeNull();
      expect(extractMCPServerName('tool_Mcp_server')).toBeNull();
      expect(extractMCPServerName('tool_mcp_Server')).toBe('Server');
    });
  });

  describe('Service Mapping Validation', () => {
    it('should have consistent mapping between auth and display functions', () => {
      const supportedServices = [
        'googlesheets',
        'googledocs',
        'googledrive',
        'gmail',
        'googlecalendar',
        'notion',
      ];

      supportedServices.forEach((service) => {
        // Each supported service should have auth mapping
        expect(requiresAuthentication(service)).toBe(true);
        expect(getAuthService(service)).toBe(service);

        // Each supported service should have display name
        const displayName = getServiceDisplayName(service);
        expect(displayName).toBeTruthy();
        expect(displayName).not.toBe(service); // Should be human-readable, not the service ID
      });
    });

    it('should validate all Google services have "Google" in display name', () => {
      const googleServices = ['googlesheets', 'googledocs', 'googledrive', 'googlecalendar'];

      googleServices.forEach((service) => {
        const displayName = getServiceDisplayName(service);
        expect(displayName.toLowerCase()).toContain('google');
      });
    });

    it('should validate Gmail has specific display name', () => {
      expect(getServiceDisplayName('gmail')).toBe('Gmail');
    });
  });
});
