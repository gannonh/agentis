import { groupMCPToolsByServer, groupAgentToolsByServer, MCPServerGroup } from './tools';
import type { TPlugin } from 'librechat-data-provider';
import i18n from '~/locales/i18n';

// Mock the i18n.t function
jest.mock('~/locales/i18n', () => ({
  t: jest.fn().mockImplementation((key, options) => {
    if (key === 'com_ui_mcp_server_description') {
      return `Server: ${options[0]}`;
    }
    return key;
  }),
}));

describe('groupMCPToolsByServer', () => {
  it('returns empty arrays when tools are undefined', () => {
    const result = groupMCPToolsByServer(undefined);
    expect(result).toEqual({ mcpServers: [], regularTools: [] });
  });

  it('returns empty arrays when tools are empty', () => {
    const result = groupMCPToolsByServer([]);
    expect(result).toEqual({ mcpServers: [], regularTools: [] });
  });

  it('separates regular tools from MCP tools', () => {
    const tools: TPlugin[] = [
      {
        name: 'Regular Tool',
        pluginKey: 'regular_tool',
        description: 'A regular tool',
      },
      {
        name: 'MCP Tool',
        pluginKey: 'test_tool_mcp_myserver',
        description: 'An MCP tool',
        icon: 'server-icon',
      },
    ];

    const result = groupMCPToolsByServer(tools);
    expect(result.regularTools).toHaveLength(1);
    expect(result.regularTools[0].name).toBe('Regular Tool');
    expect(result.mcpServers).toHaveLength(1);
    expect(result.mcpServers[0].serverName).toBe('myserver');
    expect(result.mcpServers[0].tools).toHaveLength(1);
    expect(result.mcpServers[0].tools[0].name).toBe('MCP Tool');
  });

  it('groups multiple MCP tools by server', () => {
    const tools: TPlugin[] = [
      {
        name: 'MCP Tool 1',
        pluginKey: 'test_tool1_mcp_server1',
        description: 'Tool 1',
        icon: 'server1-icon',
      },
      {
        name: 'MCP Tool 2',
        pluginKey: 'test_tool2_mcp_server1',
        description: 'Tool 2',
        icon: 'server1-icon',
      },
      {
        name: 'MCP Tool 3',
        pluginKey: 'test_tool3_mcp_server2',
        description: 'Tool 3',
        icon: 'server2-icon',
      },
    ];

    const result = groupMCPToolsByServer(tools);
    expect(result.regularTools).toHaveLength(0);
    expect(result.mcpServers).toHaveLength(2);
    
    // Server 1 should have 2 tools
    const server1 = result.mcpServers.find(s => s.serverName === 'server1');
    expect(server1).toBeDefined();
    expect(server1?.tools).toHaveLength(2);
    expect(server1?.icon).toBe('server1-icon');
    
    // Server 2 should have 1 tool
    const server2 = result.mcpServers.find(s => s.serverName === 'server2');
    expect(server2).toBeDefined();
    expect(server2?.tools).toHaveLength(1);
    expect(server2?.icon).toBe('server2-icon');
  });

  it('separates helper tools from regular MCP tools', () => {
    const tools: TPlugin[] = [
      {
        name: 'Regular MCP Tool',
        pluginKey: 'tool_mcp_server1',
        description: 'Regular tool',
      },
      {
        name: 'Helper Tool 1',
        pluginKey: 'composio_check_mcp_server1',
        description: 'Helper tool 1',
      },
      {
        name: 'Helper Tool 2',
        pluginKey: 'composio_initiate_mcp_server1',
        description: 'Helper tool 2',
      },
      {
        name: 'Helper Tool 3',
        pluginKey: 'some_helper_mcp_server1',
        description: 'Helper tool 3',
      },
      {
        name: 'Helper Tool 4',
        pluginKey: 'tool_mcp_server1',
        description: 'Helper tool 4',
        isHelper: true,
      },
    ];

    const result = groupMCPToolsByServer(tools);
    expect(result.mcpServers).toHaveLength(1);
    
    const server1 = result.mcpServers[0];
    expect(server1.tools).toHaveLength(1);
    expect(server1.tools[0].name).toBe('Regular MCP Tool');
    expect(server1.helperTools).toHaveLength(4);
  });
});

describe('groupAgentToolsByServer', () => {
  it('returns empty objects when inputs are undefined', () => {
    const result = groupAgentToolsByServer(undefined, undefined);
    expect(result).toEqual({ mcpServerGroups: {}, individualTools: [] });
  });

  it('returns empty objects when inputs are empty', () => {
    const result = groupAgentToolsByServer([], []);
    expect(result).toEqual({ mcpServerGroups: {}, individualTools: [] });
  });

  it('returns empty objects when toolKeys are empty', () => {
    const allTools: TPlugin[] = [
      { name: 'Tool 1', pluginKey: 'key1', description: 'Tool 1' },
    ];
    const result = groupAgentToolsByServer([], allTools);
    expect(result).toEqual({ mcpServerGroups: {}, individualTools: [] });
  });

  it('returns empty objects when allTools are empty', () => {
    const toolKeys = ['key1'];
    const result = groupAgentToolsByServer(toolKeys, []);
    expect(result).toEqual({ mcpServerGroups: {}, individualTools: [] });
  });

  it('groups selected tools by MCP server', () => {
    const toolKeys = [
      'tool1_mcp_server1',
      'tool2_mcp_server1',
      'tool3_mcp_server2',
      'regular_tool',
    ];
    
    const allTools: TPlugin[] = [
      { name: 'Tool 1', pluginKey: 'tool1_mcp_server1', description: 'Tool 1' },
      { name: 'Tool 2', pluginKey: 'tool2_mcp_server1', description: 'Tool 2' },
      { name: 'Tool 3', pluginKey: 'tool3_mcp_server2', description: 'Tool 3' },
      { name: 'Regular Tool', pluginKey: 'regular_tool', description: 'Regular Tool' },
      { name: 'Unused Tool', pluginKey: 'unused_tool', description: 'Unused Tool' },
    ];
    
    const result = groupAgentToolsByServer(toolKeys, allTools);
    
    // Check individual tools
    expect(result.individualTools).toHaveLength(1);
    expect(result.individualTools[0].name).toBe('Regular Tool');
    
    // Check MCP server groups
    expect(Object.keys(result.mcpServerGroups)).toHaveLength(2);
    expect(result.mcpServerGroups['server1']).toHaveLength(2);
    expect(result.mcpServerGroups['server2']).toHaveLength(1);
    
    // Check specific tools in server1 group
    const server1Tools = result.mcpServerGroups['server1'];
    expect(server1Tools.find(t => t.name === 'Tool 1')).toBeDefined();
    expect(server1Tools.find(t => t.name === 'Tool 2')).toBeDefined();
    
    // Check specific tool in server2 group
    const server2Tools = result.mcpServerGroups['server2'];
    expect(server2Tools.find(t => t.name === 'Tool 3')).toBeDefined();
  });

  it('skips toolKeys that do not match any tool', () => {
    const toolKeys = ['exists', 'doesnt_exist'];
    const allTools: TPlugin[] = [
      { name: 'Exists', pluginKey: 'exists', description: 'Exists' },
    ];
    
    const result = groupAgentToolsByServer(toolKeys, allTools);
    expect(result.individualTools).toHaveLength(1);
    expect(result.individualTools[0].name).toBe('Exists');
  });
});