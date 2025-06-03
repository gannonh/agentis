/**
 * Utility functions for detecting MCP tools that require authentication
 */

import type { TPlugin } from 'librechat-data-provider';
import type { TAgentOption } from '~/common';

const MCP_DELIMITER = '_mcp_';

/**
 * Maps MCP server names to their authentication services/providers
 * This is based on the Composio integration patterns
 */
const MCP_SERVER_AUTH_MAP: Record<string, string> = {
  googlesheets: 'googlesheets',
  googledocs: 'googledocs',
  googledrive: 'googledrive',
  gmail: 'gmail',
  googlecalendar: 'googlecalendar',
  // Add more mappings as new providers are integrated
};

/**
 * Checks if an MCP server requires authentication
 * @param serverName - The MCP server name
 * @returns true if the server requires authentication
 */
export function requiresAuthentication(serverName: string): boolean {
  return serverName in MCP_SERVER_AUTH_MAP;
}

/**
 * Gets the authentication service for an MCP server
 * @param serverName - The MCP server name
 * @returns The authentication service name or undefined
 */
export function getAuthService(serverName: string): string | undefined {
  return MCP_SERVER_AUTH_MAP[serverName];
}

/**
 * Extracts the MCP server name from a tool key
 * @param toolKey - The tool plugin key
 * @returns The server name or null if not an MCP tool
 */
export function extractMCPServerName(toolKey: string): string | null {
  if (!toolKey || !toolKey.includes(MCP_DELIMITER)) {
    return null;
  }

  const parts = toolKey.split(MCP_DELIMITER);
  return parts[parts.length - 1] || null;
}

/**
 * Detects all unique MCP services that require authentication from an agent's tools
 * @param agent - The agent object with tools
 * @param allTools - All available tools to look up tool details
 * @returns Array of unique service names that require authentication
 */
export function detectMCPAuthServices(
  agent: TAgentOption | null | undefined,
  allTools: TPlugin[] | undefined,
): string[] {
  //console.log('[detectMCPAuthServices] Input:', { agent: agent?.tools, allToolsCount: allTools?.length });

  if (!agent?.tools || !Array.isArray(agent.tools) || agent.tools.length === 0) {
    //console.log('[detectMCPAuthServices] No agent tools found');
    return [];
  }

  const authServices = new Set<string>();

  // Process each tool key
  agent.tools.forEach((toolKey) => {
    // console.log('[detectMCPAuthServices] Processing tool:', toolKey);

    if (typeof toolKey !== 'string') return;

    // Extract MCP server name
    const serverName = extractMCPServerName(toolKey);
    // console.log('[detectMCPAuthServices] Extracted server name:', serverName);

    if (!serverName) return;

    // Check if this server requires authentication
    const authService = getAuthService(serverName);
    // console.log('[detectMCPAuthServices] Auth service for', serverName, ':', authService);

    if (authService) {
      authServices.add(authService);
    }
  });

  const result = Array.from(authServices);
  // console.log('[detectMCPAuthServices] Final auth services:', result);
  return result;
}

/**
 * Checks if a conversation has an agent with MCP tools requiring authentication
 * @param conversation - The conversation object
 * @param agent - The agent object (from context or fetched)
 * @param allTools - All available tools
 * @returns Array of services requiring authentication
 */
export function getConversationAuthServices(
  conversation: { agent_id?: string } | null | undefined,
  agent: TAgentOption | null | undefined,
  allTools: TPlugin[] | undefined,
): string[] {
  // If no agent is associated with the conversation, return empty
  if (!conversation?.agent_id && !agent) {
    return [];
  }

  return detectMCPAuthServices(agent, allTools);
}

/**
 * Determines if authentication UI should be shown after the first user message
 * @param messages - Array of messages in the conversation
 * @param authServices - Array of services requiring authentication
 * @returns true if auth UI should be shown
 */
export function shouldShowAuthUI(
  messages: Array<{ role: string }> | undefined,
  authServices: string[],
): boolean {
  console.log('[shouldShowAuthUI] Input:', { messages: messages?.length, authServices });

  // No auth services detected
  if (!authServices || authServices.length === 0) {
    console.log('[shouldShowAuthUI] No auth services, returning false');
    return false;
  }

  // For now, just show if we have auth services (temporary for debugging)
  console.log('[shouldShowAuthUI] Auth services found, returning true');
  return true;
}

/**
 * Gets display names for authentication services
 * @param service - The service identifier
 * @returns Human-readable service name
 */
export function getServiceDisplayName(service: string): string {
  const serviceNames: Record<string, string> = {
    googlesheets: 'Google Sheets',
    googledocs: 'Google Docs',
    googledrive: 'Google Drive',
    gmail: 'Gmail',
    googlecalendar: 'Google Calendar',
  };

  return serviceNames[service] || service;
}
