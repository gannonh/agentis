import yaml from 'js-yaml';

interface MCPServerConfig {
  name: string;
  command?: string;
  args?: string[];
  description?: string;
  iconPath?: string;
  toolDisplayNames?: Record<string, string>;
  enabled?: boolean;
}

interface LibreChatConfig {
  version?: string;
  mcpServers?: Record<string, MCPServerConfig>;
  // Add other config sections as needed
}

class LibreChatConfigService {
  private static instance: LibreChatConfigService;
  private config: LibreChatConfig | null = null;
  private configPromise: Promise<LibreChatConfig> | null = null;
  private mcpServerConfigsMap: Map<string, MCPServerConfig> = new Map();

  private constructor() {}

  static getInstance(): LibreChatConfigService {
    if (!LibreChatConfigService.instance) {
      LibreChatConfigService.instance = new LibreChatConfigService();
    }
    return LibreChatConfigService.instance;
  }

  async loadConfig(): Promise<LibreChatConfig> {
    // Return cached config if already loaded
    if (this.config) {
      return this.config;
    }

    // Return existing promise if loading is in progress
    if (this.configPromise) {
      return this.configPromise;
    }

    // Start loading
    this.configPromise = this.fetchAndParseConfig();
    this.config = await this.configPromise;
    this.configPromise = null;

    // Build MCP server configs map for quick lookup
    if (this.config.mcpServers) {
      this.mcpServerConfigsMap.clear();
      for (const [serverName, serverConfig] of Object.entries(this.config.mcpServers)) {
        // Add the server name to the config object
        const configWithName = { ...serverConfig, name: serverName };
        this.mcpServerConfigsMap.set(serverName, configWithName);
      }
    }

    return this.config;
  }

  private async fetchAndParseConfig(): Promise<LibreChatConfig> {
    try {
      // In development, the file will be served from the public directory
      // In production, it will be served from the dist directory
      const response = await fetch('/librechat.yaml');
      
      if (!response.ok) {
        console.warn('Failed to load librechat.yaml:', response.status, response.statusText);
        return {};
      }

      const yamlContent = await response.text();
      const parsedConfig = yaml.load(yamlContent) as LibreChatConfig;
      
      // Debug logging when debug flag is enabled
      if (typeof window !== 'undefined' && localStorage.getItem('debug-tool-display-names') === 'true') {
        console.log('Loaded librechat.yaml configuration:', parsedConfig);
        console.log('MCP Servers found:', parsedConfig?.mcpServers ? Object.keys(parsedConfig.mcpServers) : 'none');
      }
      return parsedConfig || {};
    } catch (error) {
      console.error('Error loading librechat.yaml:', error);
      return {};
    }
  }

  getConfig(): LibreChatConfig | null {
    return this.config;
  }

  getMCPServerConfig(serverName: string): MCPServerConfig | undefined {
    return this.mcpServerConfigsMap.get(serverName);
  }

  getToolDisplayName(toolName: string, serverName?: string): string | undefined {
    if (!serverName) {
      return undefined;
    }

    const serverConfig = this.getMCPServerConfig(serverName);
    return serverConfig?.toolDisplayNames?.[toolName];
  }

  getAllMCPServerConfigs(): MCPServerConfig[] {
    if (!this.config?.mcpServers) {
      return [];
    }
    return Object.entries(this.config.mcpServers).map(([name, config]) => ({
      ...config,
      name,
    }));
  }
}

export default LibreChatConfigService.getInstance();
export type { MCPServerConfig, LibreChatConfig };