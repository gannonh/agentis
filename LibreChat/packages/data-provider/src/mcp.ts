import { z } from 'zod';
import { extractEnvVariable } from './utils';

const BaseOptionsSchema = z.object({
  iconPath: z.string().optional(),
  timeout: z.number().optional(),
  initTimeout: z.number().optional(),
  /** Controls visibility in chat dropdown menu (MCPSelect) */
  chatMenu: z.boolean().optional(),
  /** Optional display name for the MCP server that overrides the auto-formatted server name */
  displayName: z.string().optional(),
  /** Optional description for the MCP server that overrides the auto-generated description */
  description: z.string().optional(),
  /**
   * Optional mapping of tool names to display names
   * Keys are the original tool names, values are the display names to use
   */
  toolDisplayNames: z.record(z.string(), z.string()).optional(),
});

export const StdioOptionsSchema = BaseOptionsSchema.extend({
  type: z.literal('stdio').optional(),
  /**
   * The executable to run to start the server.
   */
  command: z.string(),
  /**
   * Command line arguments to pass to the executable.
   */
  args: z.array(z.string()),
  /**
   * The environment to use when spawning the process.
   *
   * If not specified, the result of getDefaultEnvironment() will be used.
   * Environment variables can be referenced using ${VAR_NAME} syntax.
   */
  env: z
    .record(z.string(), z.string())
    .optional()
    .transform((env) => {
      if (!env) {
        return env;
      }

      const processedEnv: Record<string, string> = {};
      for (const [key, value] of Object.entries(env)) {
        processedEnv[key] = extractEnvVariable(value);
      }
      return processedEnv;
    }),
  /**
   * How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`.
   *
   * @type {import('node:child_process').IOType | import('node:stream').Stream | number}
   *
   * The default is "inherit", meaning messages to stderr will be printed to the parent process's stderr.
   */
  stderr: z.any().optional(),
});

export const WebSocketOptionsSchema = BaseOptionsSchema.extend({
  type: z.literal('websocket').optional(),
  url: z
    .string()
    .url()
    .refine(
      (val) => {
        const protocol = new URL(val).protocol;
        return protocol === 'ws:' || protocol === 'wss:';
      },
      {
        message: 'WebSocket URL must start with ws:// or wss://',
      },
    ),
});

export const SSEOptionsSchema = BaseOptionsSchema.extend({
  type: z.literal('sse').optional(),
  headers: z.record(z.string(), z.string()).optional(),
  url: z
    .string()
    .url()
    .refine(
      (val) => {
        const protocol = new URL(val).protocol;
        return protocol !== 'ws:' && protocol !== 'wss:';
      },
      {
        message: 'SSE URL must not start with ws:// or wss://',
      },
    ),
});

export const StreamableHTTPOptionsSchema = BaseOptionsSchema.extend({
  type: z.literal('streamable-http'),
  headers: z.record(z.string(), z.string()).optional(),
  url: z
    .string()
    .url()
    .refine(
      (val) => {
        const protocol = new URL(val).protocol;
        return protocol !== 'ws:' && protocol !== 'wss:';
      },
      {
        message: 'Streamable HTTP URL must not start with ws:// or wss://',
      },
    ),
});

export const MCPOptionsSchema = z.union([
  StdioOptionsSchema,
  WebSocketOptionsSchema,
  SSEOptionsSchema,
  StreamableHTTPOptionsSchema,
]);

export const MCPServersSchema = z.record(z.string(), MCPOptionsSchema);

export type MCPOptions = z.infer<typeof MCPOptionsSchema>;

/**
 * Recursively processes an object to replace environment variables in string values
 * @param {MCPOptions} obj - The object to process
 * @param {string} [userId] - The user ID
 * @returns {MCPOptions} - The processed object with environment variables replaced
 */
export function processMCPEnv(obj: Readonly<MCPOptions>, userId?: string): MCPOptions {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const newObj: MCPOptions = structuredClone(obj);

  // Process environment variables
  if ('env' in newObj && newObj.env) {
    const processedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(newObj.env)) {
      processedEnv[key] = extractEnvVariable(value);
    }
    newObj.env = processedEnv;
  }

  // Process headers: First extract environment variables, then handle all user ID placeholders
  if ('headers' in newObj && newObj.headers) {
    const processedHeaders: Record<string, string> = {};

    // First pass: Extract environment variables
    for (const [key, value] of Object.entries(newObj.headers)) {
      processedHeaders[key] = extractEnvVariable(value);
    }

    // Second pass: Handle all user ID placeholders in all headers
    for (const key of Object.keys(processedHeaders)) {
      const value = processedHeaders[key];
      if (
        typeof value === 'string' &&
        value.includes('{{LIBRECHAT_USER_ID}}') &&
        userId != null &&
        userId
      ) {
        processedHeaders[key] = value.replace(/{{LIBRECHAT_USER_ID}}/g, userId);
      }
    }

    newObj.headers = processedHeaders;
  }

  // Process URL for LIBRECHAT_USER_ID placeholders
  if ('url' in newObj && typeof newObj.url === 'string') {
    try {
      let url = newObj.url;

      // First check for direct placeholder in the URL path or query string
      if (url.includes('{{LIBRECHAT_USER_ID}}') && userId != null && userId) {
        // Properly encode the userId for URL use
        const encodedUserId = encodeURIComponent(userId);
        url = url.replace(/{{LIBRECHAT_USER_ID}}/g, encodedUserId);
      }

      // Then handle the parsed URL to ensure query parameters are properly set
      try {
        const urlObj = new URL(url);

        // Check specifically for user_id parameter
        const userIdParam = urlObj.searchParams.get('user_id');
        if (
          userIdParam &&
          userIdParam.includes('{{LIBRECHAT_USER_ID}}') &&
          userId != null &&
          userId
        ) {
          const encodedUserId = encodeURIComponent(userId);
          const newValue = userIdParam.replace(/{{LIBRECHAT_USER_ID}}/g, encodedUserId);
          urlObj.searchParams.set('user_id', newValue);
        }

        // Update URL with processed query parameters
        url = urlObj.toString();
      } catch (parseError) {
        const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error(`Error parsing URL: ${errMsg}`);
      }

      // Update the result
      newObj.url = url;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error processing URL: ${errMsg}`);
    }
  }

  return newObj;
}

/**
 * Pre-processes MCP options to resolve Composio connected account placeholders
 * @param {MCPOptions} obj - The object to process
 * @param {string} connectedAccountId - The Composio connected account ID to use
 * @returns {MCPOptions} - The processed object with connected account placeholders replaced
 */
export function resolveComposioPlaceholders(obj: Readonly<MCPOptions>, connectedAccountId: string): MCPOptions {
  if (obj === null || obj === undefined) {
    return obj;
  }

  const newObj: MCPOptions = structuredClone(obj);

  // Process headers for connected account ID placeholders
  if ('headers' in newObj && newObj.headers) {
    const processedHeaders: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(newObj.headers)) {
      if (typeof value === 'string' && value.includes('{{COMPOSIO_CONNECTED_ACCOUNT_ID}}')) {
        processedHeaders[key] = value.replace(/{{COMPOSIO_CONNECTED_ACCOUNT_ID}}/g, connectedAccountId);
      } else {
        processedHeaders[key] = value;
      }
    }
    
    newObj.headers = processedHeaders;
  }

  // Process URL for connected account ID placeholders
  if ('url' in newObj && typeof newObj.url === 'string') {
    let url = newObj.url;
    
    // Replace direct placeholder in URL
    if (url.includes('{{COMPOSIO_CONNECTED_ACCOUNT_ID}}')) {
      const encodedAccountId = encodeURIComponent(connectedAccountId);
      url = url.replace(/{{COMPOSIO_CONNECTED_ACCOUNT_ID}}/g, encodedAccountId);
    }
    
    // Handle URL query parameters
    try {
      const urlObj = new URL(url);
      
      // Check for connected_account_id parameter
      const accountIdParam = urlObj.searchParams.get('connected_account_id');
      if (accountIdParam && accountIdParam.includes('{{COMPOSIO_CONNECTED_ACCOUNT_ID}}')) {
        const encodedAccountId = encodeURIComponent(connectedAccountId);
        const newValue = accountIdParam.replace(/{{COMPOSIO_CONNECTED_ACCOUNT_ID}}/g, encodedAccountId);
        urlObj.searchParams.set('connected_account_id', newValue);
        url = urlObj.toString();
      }
    } catch (parseError) {
      const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.error(`Error parsing URL for Composio placeholders: ${errMsg}`);
    }
    
    newObj.url = url;
  }

  return newObj;
}
