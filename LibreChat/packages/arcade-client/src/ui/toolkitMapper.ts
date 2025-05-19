/**
 * Mapper functions for converting Arcade API responses to UI components
 */

import type { ArcadeToolkitConfig, ArcadeToolResponse } from '../types';
import type { ArcadeUIToolkitConfig, ArcadeAgentisTool, ArcadeUITool, ArcadeUIToolParameter } from './types';

/**
 * Maps an Arcade toolkit configuration to a UI component configuration
 * 
 * @param toolkit - Arcade toolkit configuration
 * @returns UI component configuration
 */
export function mapToolkitToUIComponent(toolkit: ArcadeToolkitConfig): ArcadeUIToolkitConfig {
  return {
    id: `arcade-${toolkit.id}`,
    name: toolkit.name,
    description: toolkit.description,
    category: toolkit.category,
    icon: toolkit.icon || 'default-icon.png',
    isArcade: true,
    arcadeToolkitId: toolkit.id,
    requiresAuth: true, // Most Arcade toolkits require authentication
    authType: 'oauth', // Default auth type
    authProvider: 'arcade',
  };
}

/**
 * Maps a value schema type to a simplified UI type
 * 
 * @param valType - Arcade value schema type
 * @returns Simplified type string
 */
function mapValueSchemaToType(valType: string): string {
  switch (valType) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'object':
    case 'array':
      return valType;
    case 'null':
      return 'null';
    default:
      return 'string'; // Default to string for unknown types
  }
}

/**
 * Maps an Arcade tool parameter to a UI parameter
 * 
 * @param param - Arcade parameter definition
 * @returns UI parameter definition
 */
function mapToolParameter(param: Record<string, unknown>): ArcadeUIToolParameter {
  return {
    name: param.name as string,
    description: (param.description as string) || '',
    required: !!param.required,
    type: mapValueSchemaToType((param.value_schema as Record<string, string>)?.val_type || 'string'),
    enumValues: (param.value_schema as Record<string, string[]>)?.enum,
  };
}

/**
 * Maps an Arcade tool to a UI tool
 * 
 * @param tool - Arcade tool definition
 * @returns UI tool definition
 */
function mapTool(tool: ArcadeToolResponse): ArcadeUITool {
  const parameters = (tool.input?.parameters || []).map(mapToolParameter);
  
  return {
    name: tool.name,
    fullyQualifiedName: tool.fully_qualified_name || `${tool.toolkit.name}.${tool.name}`,
    description: tool.description || '',
    parameters,
    outputDescription: tool.output?.description,
    originalTool: tool,
  };
}

/**
 * Maps a toolkit and its tools to an Agentis tool configuration
 * 
 * @param toolkit - Arcade toolkit configuration
 * @param tools - List of tools in the toolkit
 * @returns Agentis tool configuration
 */
export function mapToolkitsToAgentisTool(
  toolkit: ArcadeToolkitConfig,
  tools: ArcadeToolResponse[]
): ArcadeAgentisTool {
  const uiConfig = mapToolkitToUIComponent(toolkit);
  const mappedTools = tools.map(mapTool);
  
  return {
    ...uiConfig,
    tools: mappedTools,
  };
}