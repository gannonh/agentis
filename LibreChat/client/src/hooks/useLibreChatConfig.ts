import { useEffect, useState } from 'react';
import LibreChatConfigService, { type MCPServerConfig } from '~/services/LibreChatConfigService';

export function useLibreChatConfig() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if already loaded
    if (LibreChatConfigService.getConfig()) {
      setIsLoaded(true);
      return;
    }

    // Load config
    LibreChatConfigService.loadConfig()
      .then(() => setIsLoaded(true))
      .catch((error) => {
        console.error('Failed to load LibreChat config:', error);
        setIsLoaded(true); // Set to true even on error to prevent infinite loading
      });
  }, []);

  return {
    isLoaded,
    getMCPServerConfig: (serverName: string) => LibreChatConfigService.getMCPServerConfig(serverName),
    getToolDisplayName: (toolName: string, serverName?: string) => 
      LibreChatConfigService.getToolDisplayName(toolName, serverName),
  };
}

export function useMCPServerConfig(serverName: string | null | undefined): MCPServerConfig | undefined {
  const [config, setConfig] = useState<MCPServerConfig | undefined>();

  useEffect(() => {
    if (!serverName) {
      setConfig(undefined);
      return;
    }

    // Initial check
    const serverConfig = LibreChatConfigService.getMCPServerConfig(serverName);
    if (serverConfig) {
      setConfig(serverConfig);
      return;
    }

    // If not loaded yet, wait for it
    LibreChatConfigService.loadConfig()
      .then(() => {
        const loadedConfig = LibreChatConfigService.getMCPServerConfig(serverName);
        setConfig(loadedConfig);
      })
      .catch((error) => {
        console.error('Failed to load MCP server config:', error);
      });
  }, [serverName]);

  return config;
}