import type { TPlugin as BaseTPlugin } from 'librechat-data-provider';
import i18n from '~/locales/i18n';

// Extend the TPlugin type with display name property
export interface TPlugin extends BaseTPlugin {
  displayName?: string; // Display-friendly name for the tool
}

// MCP delimiter constant
const MCP_DELIMITER = '_mcp_';

// Create a local CONSTANTS object to avoid import issues
const CONSTANTS = {
  mcp_delimiter: MCP_DELIMITER,
};

export interface MCPServerGroup {
  serverName: string;
  displayName?: string; // Formatted server name for display
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
// Window type definitions are already declared in common/types.ts
// No need to redeclare them here

export function groupMCPToolsByServer(
  tools: TPlugin[] | undefined,
  mcpServerConfigs?: Record<
    string,
    {
      displayName?: string;
      description?: string;
      toolDisplayNames?: Record<string, string>;
      iconPath?: string;
    }
  >,
): {
  mcpServers: MCPServerGroup[];
  regularTools: TPlugin[];
} {
  // Make sure tools is an array
  if (!tools || !Array.isArray(tools) || tools.length === 0) {
    return { mcpServers: [], regularTools: [] };
  }

  // Store tools globally for other functions to access
  window.__mcpTools = tools;

  const regularTools: TPlugin[] = [];
  const mcpServerMap: Record<string, MCPServerGroup> = {};

  // Process all tools
  tools.forEach((tool) => {
    // Skip if tool or pluginKey is undefined
    if (!tool || !tool.pluginKey || typeof tool.pluginKey !== 'string') {
      return;
    }

    // Check if it's an MCP tool
    if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
      const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
      const serverName = parts[parts.length - 1];
      const isHelperTool =
        tool.pluginKey.toLowerCase().includes('composio_check') ||
        tool.pluginKey.toLowerCase().includes('composio_initiate') ||
        tool.pluginKey.toLowerCase().includes('helper') ||
        !!tool.isHelper;

      // Get the server configuration if available
      const serverConfig = mcpServerConfigs?.[serverName];

      // Get formatted server display name
      const displayName = getServerDisplayName(serverName, serverConfig);

      // Initialize server entry if needed
      if (!mcpServerMap[serverName]) {
        mcpServerMap[serverName] = {
          serverName,
          displayName, // Add the display name to the server group
          // Use custom description if provided, otherwise use the auto-generated one
          description:
            serverConfig?.description ||
            i18n.t('com_ui_mcp_server_description', { 0: displayName }),
          tools: [],
          helperTools: [],
          // Use iconPath from server config if available, otherwise fall back to tool.icon
          icon: serverConfig?.iconPath || tool.icon,
        };
      }

      // Attempt to format the tool's name for display
      const toolName = tool.name || tool.pluginKey;
      const toolDisplayName = getToolDisplayName(toolName, serverName, serverConfig);

      // Clone the tool with updated name for display
      const toolWithDisplayName = {
        ...tool,
        displayName: toolDisplayName, // Add display name property
      };

      // Add to appropriate category
      if (isHelperTool) {
        mcpServerMap[serverName].helperTools.push(toolWithDisplayName);
      } else {
        mcpServerMap[serverName].tools.push(toolWithDisplayName);
      }
    } else {
      // Regular non-MCP tool
      regularTools.push(tool);
    }
  });

  return {
    mcpServers: Object.values(mcpServerMap),
    regularTools,
  };
}

/**
 * Groups tools by MCP server for display in the Agent Builder.
 * @param toolKeys - The list of tool keys that are currently active
 * @param allTools - The list of all available tools
 * @returns An object with grouped MCP tools and individual tools
 */
/**
 * Transforms a server name into a user-friendly display format
 * @param serverName - The raw server name
 * @returns - A formatted display name
 *
 * Examples:
 * - "googlesheets" -> "Google Sheets"
 * - "firebase-mcp" -> "Firebase"
 * - "github" -> "GitHub"
 */
export function formatServerName(serverName: string): string {
  // Special case for known service names with specific capitalization
  const specialCases: Record<string, string> = {
    github: 'GitHub',
    googlesheets: 'Google Sheets',
    googledocs: 'Google Docs',
    googledrive: 'Google Drive',
    oauth2: 'OAuth 2.0',
    'firebase-mcp': 'Firebase',
    'firebase-mcp-dev': 'Firebase (Dev)',
    'firebase-mcp-npm': 'Firebase',
    'memento-mcp-dev': 'Memento',
    'memento-mcp-npx': 'Memento',
    composio: 'Composio',
  };

  // Return special case if it exists
  if (specialCases[serverName.toLowerCase()]) {
    return specialCases[serverName.toLowerCase()];
  }

  // Remove common suffixes
  let cleanName = serverName
    .replace(/-mcp(-[a-z]+)?$/i, '') // Remove -mcp, -mcp-dev, etc.
    .replace(/-client$/i, ''); // Remove -client

  // Handle hyphenated names by splitting and capitalizing each part
  if (cleanName.includes('-')) {
    return cleanName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  // Basic word boundary detection for camelCase or PascalCase
  cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Capitalize first letter of the entire string
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

/**
 * Transforms a tool name into a user-friendly display format
 * @param toolName - The raw tool name
 * @param serverName - Optional server name to help with context-specific formatting
 * @returns - A formatted display name
 *
 * Examples:
 * - "GOOGLESHEETS_BATCH_GET" -> "Batch Get"
 * - "github_get_pull_request" -> "Get Pull Request"
 */
export function formatToolName(toolName: string, serverName?: string): string {
  // If the tool name starts with a server prefix (like GOOGLESHEETS_ or github_),
  // remove that prefix to get a cleaner display name
  if (toolName.includes('_') && serverName) {
    const serverPrefix = serverName.toUpperCase() + '_';
    if (toolName.toUpperCase().startsWith(serverPrefix)) {
      // Remove server prefix and convert remaining part to title case
      const functionPart = toolName.substring(serverPrefix.length);
      return functionPart
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // Basic transformation: replace underscores with spaces and capitalize each word
  if (toolName.includes('_')) {
    return toolName
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  // Simple case - just capitalize first letter
  return toolName.charAt(0).toUpperCase() + toolName.slice(1).toLowerCase();
}

/**
 * Gets the most appropriate display name for a server
 * @param serverName - The original server name
 * @param mcpServerConfig - Optional MCP server configuration that may contain a display name
 * @returns - The display name to use
 */
export function getServerDisplayName(
  serverName: string,
  mcpServerConfig?: { displayName?: string },
): string {
  // If a display name is explicitly provided in the config, use it
  if (mcpServerConfig?.displayName) {
    return mcpServerConfig.displayName;
  }

  // If the tool has a serverDisplayName property, use it
  const serverDisplayNameFromPlugin = getServerDisplayNameFromPlugins(serverName);
  if (serverDisplayNameFromPlugin) {
    return serverDisplayNameFromPlugin;
  }

  // Otherwise, format the server name
  return formatServerName(serverName);
}

// Helper function to check for serverDisplayName in available tools
function getServerDisplayNameFromPlugins(serverName: string): string | undefined {
  // Access the globally stored tools if available
  const toolsFromStore = window.__mcpTools || [];

  // Find any tool from this server
  const toolFromServer = toolsFromStore.find(
    (tool) =>
      tool.pluginKey &&
      typeof tool.pluginKey === 'string' &&
      tool.pluginKey.endsWith(`_mcp_${serverName}`),
  );

  // serverDisplayName property doesn't exist on TPlugin type
  // Return undefined as we can't access non-existent property
  return undefined;
}

/**
 * Gets the most appropriate display name for a tool
 * @param toolName - The original tool name
 * @param serverName - The server name (for context)
 * @param mcpServerConfig - Optional MCP server configuration that may contain tool display names
 * @returns - The display name to use
 */
export function getToolDisplayName(
  toolName: string,
  serverName?: string,
  mcpServerConfig?: { toolDisplayNames?: Record<string, string> },
): string {
  // If a tool display name map is provided and contains this tool, use it
  if (mcpServerConfig?.toolDisplayNames && mcpServerConfig.toolDisplayNames[toolName]) {
    return mcpServerConfig.toolDisplayNames[toolName];
  }

  // If the tool already has a displayName property from the backend, use it
  const toolDisplayNameFromPlugin = getToolDisplayNameFromPlugins(toolName, serverName);
  if (toolDisplayNameFromPlugin) {
    return toolDisplayNameFromPlugin;
  }

  // Fall back to automatic formatting
  return formatToolName(toolName, serverName);
}

// Helper function to check for displayName in available tools
function getToolDisplayNameFromPlugins(toolName: string, serverName?: string): string | undefined {
  // Access the globally stored tools if available
  const toolsFromStore = window.__mcpTools || [];

  // Try to find the exact tool by name and server
  const pluginKey = serverName ? `${toolName}_mcp_${serverName}` : undefined;

  // First try exact match with pluginKey if available
  if (pluginKey) {
    const exactMatch = toolsFromStore.find(
      (tool) =>
        tool.pluginKey && typeof tool.pluginKey === 'string' && tool.pluginKey === pluginKey,
    );
    // displayName property doesn't exist on TPlugin type
    // Skip this check
  }

  // Try to find by name
  const toolMatch = toolsFromStore.find(
    (tool) => tool.name && typeof tool.name === 'string' && tool.name === toolName,
  );
  // displayName property doesn't exist on TPlugin type
  // Skip this check

  return undefined;
}

export function groupAgentToolsByServer(
  toolKeys: string[] | undefined,
  allTools: TPlugin[] | undefined,
  mcpServerConfigs: Record<
    string,
    {
      displayName?: string;
      description?: string;
      toolDisplayNames?: Record<string, string>;
      iconPath?: string;
    }
  > = window.__mcpServerConfigs || {},
): {
  mcpServerGroups: Record<string, TPlugin[]>;
  individualTools: TPlugin[];
} {
  // Ensure both toolKeys and allTools are valid arrays
  if (
    !toolKeys ||
    !Array.isArray(toolKeys) ||
    toolKeys.length === 0 ||
    !allTools ||
    !Array.isArray(allTools) ||
    allTools.length === 0
  ) {
    return { mcpServerGroups: {}, individualTools: [] };
  }

  const mcpServerGroups: Record<string, TPlugin[]> = {};
  const individualTools: TPlugin[] = [];

  // Process each tool key
  toolKeys.forEach((toolKey) => {
    if (typeof toolKey !== 'string') return;

    const tool = allTools.find((t) => t && t.pluginKey === toolKey);
    if (!tool || !tool.pluginKey || typeof tool.pluginKey !== 'string') return;

    // Check if it's an MCP tool
    if (tool.pluginKey.includes(CONSTANTS.mcp_delimiter)) {
      const parts = tool.pluginKey.split(CONSTANTS.mcp_delimiter);
      const serverName = parts[parts.length - 1];

      // Get the server configuration if available
      const serverConfig = mcpServerConfigs?.[serverName];

      // Clone the tool and add a display name
      const toolWithDisplayName = {
        ...tool,
        displayName: getToolDisplayName(tool.name || tool.pluginKey, serverName, serverConfig),
      };

      if (!mcpServerGroups[serverName]) {
        mcpServerGroups[serverName] = [];
      }

      mcpServerGroups[serverName].push(toolWithDisplayName);
    } else {
      // Regular non-MCP tool
      individualTools.push(tool);
    }
  });

  return {
    mcpServerGroups,
    individualTools,
  };
}
