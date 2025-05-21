import type { TPlugin } from 'librechat-data-provider';
import i18n from '~/locales/i18n';

// MCP delimiter constant
const MCP_DELIMITER = '_mcp_';

// Create a local CONSTANTS object to avoid import issues
const CONSTANTS = {
  mcp_delimiter: MCP_DELIMITER
};

export interface MCPServerGroup {
  serverName: string;
  description: string;
  icon?: string;
  tools: TPlugin[];
  helperTools: TPlugin[];
}

/**
 * Groups MCP tools by server name.
 * @param tools - The list of all tools
 * @returns An array of grouped MCP server tools and an array of regular tools
 */
export function groupMCPToolsByServer(tools: TPlugin[] | undefined): {
  mcpServers: MCPServerGroup[];
  regularTools: TPlugin[];
} {
  if (!tools || tools.length === 0) {
    return { mcpServers: [], regularTools: [] };
  }

  const regularTools: TPlugin[] = [];
  const mcpServerMap: Record<string, MCPServerGroup> = {};

  // Process all tools
  tools.forEach(tool => {
    // Check if it's an MCP tool
    if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
      const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
      const serverName = parts[parts.length - 1];
      const isHelperTool = tool.pluginKey.toLowerCase().includes('composio_check') || 
                         tool.pluginKey.toLowerCase().includes('composio_initiate') ||
                         tool.pluginKey.toLowerCase().includes('helper') ||
                         !!tool.isHelper;
      
      // Initialize server entry if needed
      if (!mcpServerMap[serverName]) {
        mcpServerMap[serverName] = {
          serverName,
          description: i18n.t('com_ui_mcp_server_description', { 0: serverName }),
          tools: [],
          helperTools: [],
          icon: tool.icon, // All tools from same server should have same icon
        };
      }
      
      // Add to appropriate category
      if (isHelperTool) {
        mcpServerMap[serverName].helperTools.push(tool);
      } else {
        mcpServerMap[serverName].tools.push(tool);
      }
    } else {
      // Regular non-MCP tool
      regularTools.push(tool);
    }
  });

  return {
    mcpServers: Object.values(mcpServerMap),
    regularTools
  };
}

/**
 * Groups tools by MCP server for display in the Agent Builder.
 * @param toolKeys - The list of tool keys that are currently active
 * @param allTools - The list of all available tools
 * @returns An object with grouped MCP tools and individual tools
 */
export function groupAgentToolsByServer(
  toolKeys: string[] | undefined, 
  allTools: TPlugin[] | undefined
): {
  mcpServerGroups: Record<string, TPlugin[]>;
  individualTools: TPlugin[];
} {
  if (!toolKeys || !allTools || toolKeys.length === 0 || allTools.length === 0) {
    return { mcpServerGroups: {}, individualTools: [] };
  }

  const mcpServerGroups: Record<string, TPlugin[]> = {};
  const individualTools: TPlugin[] = [];

  // Process each tool key
  toolKeys.forEach(toolKey => {
    const tool = allTools.find(t => t.pluginKey === toolKey);
    if (!tool) return;

    // Check if it's an MCP tool
    if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
      const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
      const serverName = parts[parts.length - 1];
      
      if (!mcpServerGroups[serverName]) {
        mcpServerGroups[serverName] = [];
      }
      
      mcpServerGroups[serverName].push(tool);
    } else {
      // Regular non-MCP tool
      individualTools.push(tool);
    }
  });

  return {
    mcpServerGroups,
    individualTools
  };
}