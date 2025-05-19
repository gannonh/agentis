/**
 * Tool utilities for the Arcade client
 */

import { ArcadeToolResponse, ArcadeToolkitConfig } from '../types';

/**
 * Maps a toolkit ID to its configuration from the provided list
 *
 * @param toolkitId - Toolkit ID to find
 * @param toolkitConfigs - List of toolkit configurations
 * @returns Toolkit configuration or undefined if not found
 */
export const findToolkitConfig = (
  toolkitId: string,
  toolkitConfigs: ArcadeToolkitConfig[]
): ArcadeToolkitConfig | undefined => {
  return toolkitConfigs.find((config) => config.id === toolkitId);
};

/**
 * Groups tools by their parent toolkit
 *
 * @param tools - List of tools to group
 * @returns Map of toolkit ID to list of tools
 */
export const groupToolsByToolkit = (
  tools: ArcadeToolResponse[]
): Map<string, ArcadeToolResponse[]> => {
  const toolMap = new Map<string, ArcadeToolResponse[]>();

  for (const tool of tools) {
    const toolkitId = tool.toolkit.name;

    if (!toolMap.has(toolkitId)) {
      toolMap.set(toolkitId, []);
    }

    toolMap.get(toolkitId)?.push(tool);
  }

  return toolMap;
};

/**
 * Checks if a tool requires authentication
 *
 * @param tool - Tool to check
 * @returns True if the tool requires authentication
 */
export const requiresAuth = (tool: ArcadeToolResponse): boolean => {
  return !!tool.requirements?.authorization;
};

/**
 * Gets the fully qualified name of a tool (toolkit.tool)
 *
 * @param tool - Tool to get name for
 * @returns Fully qualified tool name
 */
export const getFullToolName = (tool: ArcadeToolResponse): string => {
  return tool.fully_qualified_name || `${tool.toolkit.name}.${tool.name}`;
};
