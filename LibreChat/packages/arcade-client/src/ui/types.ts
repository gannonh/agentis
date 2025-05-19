/**
 * Type definitions for Arcade UI integration
 */

import type { ArcadeToolResponse } from '../types';

/**
 * UI component configuration for an Arcade toolkit
 */
export interface ArcadeUIToolkitConfig {
  /** Unique identifier for the tool in the Agentis/LibreChat system */
  id: string;
  /** Display name */
  name: string;
  /** Description shown in UI */
  description: string;
  /** Toolkit category for grouping */
  category: string;
  /** Icon path or URL */
  icon: string;
  /** Whether this is an Arcade-powered tool */
  isArcade: boolean;
  /** Original Arcade toolkit ID */
  arcadeToolkitId: string;
  /** Whether authentication is required */
  requiresAuth: boolean;
  /** Authentication type (e.g., 'oauth', 'api_key') */
  authType: string;
  /** Authentication provider */
  authProvider: string;
}

/**
 * Tool parameter definition for UI
 */
export interface ArcadeUIToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter description */
  description: string;
  /** Whether parameter is required */
  required: boolean;
  /** Parameter type */
  type: string;
  /** Default value if any */
  defaultValue?: unknown;
  /** Enum values for string enums */
  enumValues?: string[];
}

/**
 * Individual tool definition within a toolkit
 */
export interface ArcadeUITool {
  /** Tool name */
  name: string;
  /** Fully qualified name (toolkit.tool) */
  fullyQualifiedName: string;
  /** Tool description */
  description: string;
  /** Tool parameters */
  parameters: ArcadeUIToolParameter[];
  /** Output description */
  outputDescription?: string;
  /** Original Arcade tool definition */
  originalTool: ArcadeToolResponse;
}

/**
 * Full Agentis tool definition with Arcade toolkit
 */
export interface ArcadeAgentisTool extends ArcadeUIToolkitConfig {
  /** Toolkit tools */
  tools: ArcadeUITool[];
  /** Whether the tool is authenticated */
  isAuthenticated?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}