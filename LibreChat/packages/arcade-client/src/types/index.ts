/**
 * Type definitions for Arcade API integration
 */

/**
 * Arcade configuration options
 */
export interface ArcadeConfig {
  /** Whether Arcade integration is enabled */
  enabled: boolean;
  /** Arcade API key */
  api_key: string;
  /** Callback URL for auth flows */
  callback_url: string;
  /** Hosting mode */
  hosting: 'cloud' | 'hybrid' | 'self_hosted';
  /** List of enabled toolkits */
  toolkits: ArcadeToolkitConfig[];

  /** Self-hosted engine configuration */
  engine?: {
    host: string;
    port: number;
  };

  /** Worker configuration for hybrid/self-hosted deployment */
  worker?: {
    enabled: boolean;
    host: string;
    port: number;
    image?: string;
  };
}

/**
 * Arcade toolkit configuration
 */
export interface ArcadeToolkitConfig {
  /** Unique toolkit identifier */
  id: string;
  /** Display name */
  name: string;
  /** Category for grouping */
  category: string;
  /** Description shown in UI */
  description: string;
  /** Optional icon path or URL */
  icon?: string;
}

/**
 * Arcade authentication response
 */
export interface ArcadeAuthResponse {
  /** Authorization ID */
  id: string;
  /** Authorization status */
  status: 'pending' | 'completed' | 'failed';
  /** Authorization URL (only for pending status) */
  url?: string;
  /** Provider ID */
  provider_id?: string;
  /** User ID */
  user_id?: string;
  /** Authorization context */
  context?: ArcadeAuthContext;
}

/**
 * Arcade authorization context
 */
export interface ArcadeAuthContext {
  /** Authorization token */
  token?: string;
  /** User information */
  user_info?: Record<string, unknown>;
}

/**
 * Authorization requirement
 */
export interface ArcadeAuthRequirement {
  /** Authorization ID */
  id?: string;
  /** Provider ID */
  provider_id?: string;
  /** Provider type */
  provider_type?: string;
  /** OAuth2 specific requirements */
  oauth2?: ArcadeOAuth2Requirement;
}

/**
 * OAuth2 authorization requirement
 */
export interface ArcadeOAuth2Requirement {
  /** Required OAuth scopes */
  scopes?: string[];
}

/**
 * Tool authorization request
 */
export interface ArcadeToolAuthRequest {
  /** Tool name to authorize */
  tool_name: string;
  /** Tool version (optional) */
  tool_version?: string;
  /** User ID */
  user_id: string;
}

/**
 * Authorization initiation request
 */
export interface ArcadeAuthInitiationRequest {
  /** Authorization requirement */
  auth_requirement: ArcadeAuthRequirement;
  /** User ID */
  user_id: string;
}

/**
 * Value schema for tool parameters and outputs
 */
export interface ArcadeValueSchema {
  /** Value type */
  val_type: string;
  /** Inner value type for arrays/objects */
  inner_val_type?: string;
  /** Enum values for string enums */
  enum?: string[];
}

/**
 * Parameter definition for tool inputs
 */
export interface ArcadeParameter {
  /** Parameter name */
  name: string;
  /** Parameter description */
  description?: string;
  /** Whether parameter is required */
  required?: boolean;
  /** Whether parameter can be inferred */
  inferrable?: boolean;
  /** Value schema */
  value_schema: ArcadeValueSchema;
}

/**
 * Tool input definition
 */
export interface ArcadeInput {
  /** Parameters */
  parameters?: ArcadeParameter[];
}

/**
 * Tool output definition
 */
export interface ArcadeOutput {
  /** Output description */
  description?: string;
  /** Available output modes */
  available_modes?: string[];
  /** Value schema */
  value_schema: ArcadeValueSchema;
}

/**
 * Tool requirements
 */
export interface ArcadeRequirements {
  /** Authorization requirement */
  authorization?: ArcadeAuthRequirement;
  /** Secret requirements */
  secrets?: ArcadeSecretRequirement[];
}

/**
 * Secret requirement
 */
export interface ArcadeSecretRequirement {
  /** Secret key */
  key: string;
}

/**
 * Toolkit response
 */
export interface ArcadeToolkitResponse {
  /** Toolkit name */
  name: string;
  /** Toolkit description */
  description?: string;
  /** Toolkit version */
  version?: string;
}

/**
 * Tool definition response
 */
export interface ArcadeToolResponse {
  /** Tool name */
  name: string;
  /** Fully qualified name (toolkit.tool) */
  fully_qualified_name?: string;
  /** Tool description */
  description?: string;
  /** Tool input definition */
  input: ArcadeInput;
  /** Tool output definition */
  output?: ArcadeOutput;
  /** Tool requirements */
  requirements?: ArcadeRequirements;
  /** Parent toolkit */
  toolkit: ArcadeToolkitResponse;
}

/**
 * Tool execution request
 */
export interface ArcadeExecuteToolRequest {
  /** Tool name */
  tool_name: string;
  /** Tool version (optional) */
  tool_version?: string;
  /** User ID */
  user_id: string;
  /** Input parameters */
  input?: Record<string, unknown>;
  /** Time to run the tool (optional) */
  run_at?: string;
}

/**
 * Tool execution response
 */
export interface ArcadeExecuteToolResponse {
  /** Execution ID */
  id?: string;
  /** Whether the request was successful */
  success: boolean;
  /** Execution type */
  execution_type?: string;
  /** Execution status */
  status?: string;
  /** Time the tool was/will be run */
  run_at?: string;
  /** Time the tool execution finished */
  finished_at?: string;
  /** Execution duration in seconds */
  duration?: number;
  /** Output from tool execution */
  output?: ArcadeToolOutput;
}

/**
 * Tool output
 */
export interface ArcadeToolOutput {
  /** Output value */
  value?: unknown;
  /** Authorization response (if authorization required) */
  authorization?: ArcadeAuthResponse;
  /** Error information */
  error?: ArcadeToolError;
  /** Execution logs */
  logs?: ArcadeToolLog[];
}

/**
 * Tool error
 */
export interface ArcadeToolError {
  /** Error message */
  message: string;
  /** Developer-facing error message */
  developer_message?: string;
  /** Whether the tool can be retried */
  can_retry?: boolean;
  /** Time to wait before retrying (ms) */
  retry_after_ms?: number;
  /** Additional prompt content */
  additional_prompt_content?: string;
}

/**
 * Tool log
 */
export interface ArcadeToolLog {
  /** Log level */
  level: string;
  /** Log message */
  message: string;
  /** Log subtype */
  subtype?: string;
}

/**
 * Pagination options
 */
export interface ArcadePaginationOptions {
  /** Maximum items to return */
  limit?: number;
  /** Offset from start */
  offset?: number;
}

/**
 * Paginated response
 */
export interface ArcadePaginatedResponse<T> {
  /** Items in this page */
  items: T[];
  /** Maximum items per page */
  limit: number;
  /** Current offset */
  offset: number;
  /** Number of pages */
  page_count: number;
  /** Total number of items */
  total_count: number;
}

/**
 * Tool list request options
 */
export interface ArcadeToolListOptions extends ArcadePaginationOptions {
  /** Filter by toolkit */
  toolkit?: string;
}

/**
 * Formatted tool request options
 */
export interface ArcadeFormattedToolOptions extends ArcadeToolListOptions {
  /** Output format */
  format?: string;
}

/**
 * List tools response
 */
export type ArcadeToolsResponse = ArcadePaginatedResponse<ArcadeToolResponse>;

/**
 * Chat message
 */
export interface ArcadeChatMessage {
  /** Message role (system, user, assistant, tool) */
  role: string;
  /** Message content */
  content: string;
  /** Tool calls */
  tool_calls?: ArcadeToolCall[];
  /** Name (for tool messages) */
  name?: string;
  /** Tool call ID (for tool messages) */
  tool_call_id?: string;
}

/**
 * Tool call
 */
export interface ArcadeToolCall {
  /** Tool call ID */
  id: string;
  /** Tool call type (function) */
  type: string;
  /** Function call details */
  function?: ArcadeToolFunctionCall;
}

/**
 * Tool function call
 */
export interface ArcadeToolFunctionCall {
  /** Function name */
  name: string;
  /** Function arguments (JSON string) */
  arguments: string;
}

/**
 * Chat request
 */
export interface ArcadeChatRequest {
  /** Model name */
  model: string;
  /** Chat messages */
  messages: ArcadeChatMessage[];
  /** Temperature */
  temperature?: number;
  /** Top P */
  top_p?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Stream output */
  stream?: boolean;
  /** Tools */
  tools?: unknown[];
  /** Tool choice */
  tool_choice?: string | unknown;
  /** Stop sequences */
  stop?: string[];
  /** Presence penalty */
  presence_penalty?: number;
  /** Frequency penalty */
  frequency_penalty?: number;
  /** Response format */
  response_format?: ArcadeResponseFormat;
  /** User identifier */
  user?: string;
}

/**
 * Response format
 */
export interface ArcadeResponseFormat {
  /** Response format type */
  type: 'json_object' | 'text';
}

/**
 * Chat completion choice
 */
export interface ArcadeChoice {
  /** Message */
  message: ArcadeChatMessage;
  /** Finish reason */
  finish_reason?: string;
  /** Choice index */
  index: number;
  /** Log probabilities */
  logprobs?: unknown;
  /** Tool authorizations */
  tool_authorizations?: ArcadeAuthResponse[];
  /** Tool messages */
  tool_messages?: ArcadeChatMessage[];
}

/**
 * Token usage
 */
export interface ArcadeUsage {
  /** Prompt tokens */
  prompt_tokens: number;
  /** Completion tokens */
  completion_tokens: number;
  /** Total tokens */
  total_tokens: number;
}

/**
 * Chat response
 */
export interface ArcadeChatResponse {
  /** Response ID */
  id: string;
  /** Object type */
  object: string;
  /** Creation timestamp */
  created: number;
  /** Model name */
  model: string;
  /** System fingerprint */
  system_fingerprint?: string;
  /** Choices */
  choices: ArcadeChoice[];
  /** Token usage */
  usage: ArcadeUsage;
}

/**
 * Health check response
 */
export interface ArcadeHealthResponse {
  /** Whether the service is healthy */
  healthy: boolean;
}

/**
 * Error response
 */
export interface ArcadeErrorResponse {
  /** Error name */
  name: string;
  /** Error message */
  message: string;
}
