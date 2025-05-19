/**
 * Configuration loader for Arcade integration
 */
import { z } from 'zod';
import type { ArcadeConfig } from '../types';

// Configuration validation schema
const toolkitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
});

const configSchema = z.object({
  enabled: z.boolean(),
  api_key: z.string().min(1),
  callback_url: z.string().url(),
  hosting: z.enum(['cloud', 'hybrid', 'self_hosted']),
  toolkits: z.array(toolkitSchema),
  engine: z
    .object({
      host: z.string().min(1),
      port: z.number().positive(),
    })
    .optional(),
  worker: z
    .object({
      enabled: z.boolean(),
      host: z.string().min(1),
      port: z.number().positive(),
      image: z.string().optional(),
    })
    .optional(),
});

/**
 * Validate Arcade configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateConfig(config: unknown): z.SafeParseReturnType<unknown, ArcadeConfig> {
  return configSchema.safeParse(config);
}

/**
 * Load Arcade configuration from environment variables and YAML config
 *
 * @param yamlConfig - YAML configuration (if available)
 * @returns Arcade configuration
 */
export function loadArcadeConfig(yamlConfig: Record<string, unknown> | null): ArcadeConfig {
  // Extract from YAML if available
  const yamlArcadeConfig = (yamlConfig?.arcade as Record<string, unknown>) || {};

  // Default configuration (disabled)
  const defaultConfig: ArcadeConfig = {
    enabled: false,
    api_key: '',
    callback_url: 'http://localhost:3080/api/arcade/callback',
    hosting: 'cloud',
    toolkits: [],
  };

  // Environment variables take precedence over YAML config
  const envEnabled = process.env.ARCADE_ENABLED === 'true' || undefined;
  const envApiKey = process.env.ARCADE_API_KEY;
  const envCallbackUrl = process.env.ARCADE_CALLBACK_URL;
  const envHosting = process.env.ARCADE_HOSTING as ArcadeConfig['hosting'] | undefined;

  // Merge configurations with environment variables taking precedence
  const mergedConfig: ArcadeConfig = {
    ...defaultConfig,
    ...(yamlArcadeConfig as Partial<ArcadeConfig>),
    enabled:
      envEnabled !== undefined
        ? envEnabled
        : (yamlArcadeConfig.enabled as boolean) || defaultConfig.enabled,
    api_key: envApiKey || (yamlArcadeConfig.api_key as string) || defaultConfig.api_key,
    callback_url:
      envCallbackUrl || (yamlArcadeConfig.callback_url as string) || defaultConfig.callback_url,
    hosting:
      envHosting || (yamlArcadeConfig.hosting as ArcadeConfig['hosting']) || defaultConfig.hosting,
    toolkits: (yamlArcadeConfig.toolkits as ArcadeConfig['toolkits']) || defaultConfig.toolkits,
  };

  // Add self-hosted engine configuration if applicable
  if (mergedConfig.hosting === 'self_hosted') {
    const engineConfig = (yamlArcadeConfig.engine as Record<string, unknown>) || {};
    mergedConfig.engine = {
      host: process.env.ARCADE_ENGINE_HOST || (engineConfig.host as string) || 'localhost',
      port: parseInt(process.env.ARCADE_ENGINE_PORT || (engineConfig.port as string) || '8000', 10),
    };
  }

  // Add worker configuration if applicable
  if (mergedConfig.hosting === 'hybrid' || mergedConfig.hosting === 'self_hosted') {
    const envWorkerEnabled = process.env.ARCADE_WORKER_ENABLED === 'true' || undefined;
    const workerConfig = (yamlArcadeConfig.worker as Record<string, unknown>) || {};

    mergedConfig.worker = {
      enabled:
        envWorkerEnabled !== undefined
          ? envWorkerEnabled
          : (workerConfig.enabled as boolean) || false,
      host: process.env.ARCADE_WORKER_HOST || (workerConfig.host as string) || 'localhost',
      port: parseInt(process.env.ARCADE_WORKER_PORT || (workerConfig.port as string) || '8002', 10),
      image: process.env.ARCADE_WORKER_IMAGE || (workerConfig.image as string),
    };
  }

  // If API key is missing, disable Arcade
  if (!mergedConfig.api_key) {
    mergedConfig.enabled = false;
  }

  return mergedConfig;
}

/**
 * Determine if Arcade is properly configured and enabled
 *
 * @param config - Arcade configuration
 * @returns Whether Arcade is configured and enabled
 */
export function isArcadeEnabled(config: ArcadeConfig): boolean {
  const validation = validateConfig(config);
  return validation.success && config.enabled;
}
