import {
  FileSources,
  EModelEndpoint,
  loadOCRConfig,
  processMCPEnv,
  getConfigDefaults,
} from 'librechat-data-provider';
import { checkVariables, checkHealth, checkConfig, checkAzureVariables } from './start/checks.js';
import { azureAssistantsDefaults, assistantsConfigSetup } from './start/assistants.js';
import { initializeAzureBlobService } from './Files/Azure/initialize.js';
import { initializeFirebase } from './Files/Firebase/initialize.js';
import loadCustomConfig from './Config/loadCustomConfig.js';
import handleRateLimits from './Config/handleRateLimits.js';
import { loadDefaultInterface } from './start/interface.js';
import { loadTurnstileConfig } from './start/turnstile.js';
import { azureConfigSetup } from './start/azureOpenAI.js';
import { processModelSpecs } from './start/modelSpecs.js';
import { initializeS3 } from './Files/S3/initialize.js';
import { loadAndFormatTools } from './ToolService.js';
import { agentsConfigSetup } from './start/agents.js';
import { initializeRoles } from '../../models/Role.js';
import { isEnabled } from '../utils/index.js';
import { getMCPManager } from '#config/index.js';
import composioService from './ComposioService.js';
import paths from '../../config/paths.js';

/**
 * Loads custom config and initializes app-wide variables.
 * @function AppService
 * @param {Express.Application} app - The Express application object.
 */
const AppService = async (app) => {
  await initializeRoles();
  /** @type {TCustomConfig} */
  const config = (await loadCustomConfig()) ?? {};
  const configDefaults = getConfigDefaults();

  const ocr = loadOCRConfig(config.ocr);
  const filteredTools = config.filteredTools;
  const includedTools = config.includedTools;
  const fileStrategy = config.fileStrategy ?? configDefaults.fileStrategy;
  const startBalance = process.env.START_BALANCE;
  const balance = config.balance ?? {
    enabled: isEnabled(process.env.CHECK_BALANCE),
    startBalance: startBalance ? parseInt(startBalance, 10) : undefined,
  };
  const imageOutputType = config?.imageOutputType ?? configDefaults.imageOutputType;

  process.env.CDN_PROVIDER = fileStrategy;

  checkVariables();
  await checkHealth();

  if (fileStrategy === FileSources.firebase) {
    initializeFirebase();
  } else if (fileStrategy === FileSources.azure_blob) {
    initializeAzureBlobService();
  } else if (fileStrategy === FileSources.s3) {
    initializeS3();
  }

  /** @type {Record<string, FunctionTool>} */
  const availableTools = loadAndFormatTools({
    adminFilter: filteredTools,
    adminIncluded: includedTools,
    directory: paths.structuredTools,
  });

  if (config.mcpServers != null) {
    const mcpManager = getMCPManager();

    // Create connected account resolver for Composio
    const connectedAccountResolver = async (userId, service) => {
      try {
        const connectedAccountId = await composioService.getConnectedAccountId(userId, service);
        return connectedAccountId; // This will return null if no account exists, which triggers auth check
      } catch (error) {
        console.error(
          `[AppService] Failed to resolve connected account for user ${userId}, service ${service}:`,
          error,
        );
        return null; // Return null to trigger auth check
      }
    };

    await mcpManager.initializeMCP(config.mcpServers, processMCPEnv, connectedAccountResolver);
    await mcpManager.mapAvailableTools(availableTools);
  }

  const socialLogins =
    config?.registration?.socialLogins ?? configDefaults?.registration?.socialLogins;
  const interfaceConfig = await loadDefaultInterface(config, configDefaults);
  const turnstileConfig = loadTurnstileConfig(config, configDefaults);

  const defaultLocals = {
    ocr,
    paths,
    fileStrategy,
    socialLogins,
    filteredTools,
    includedTools,
    availableTools,
    imageOutputType,
    interfaceConfig,
    turnstileConfig,
    balance,
  };

  if (!Object.keys(config).length) {
    app.locals = defaultLocals;
    return;
  }

  checkConfig(config);
  handleRateLimits(config?.rateLimits);

  const endpointLocals = {};
  const endpoints = config?.endpoints;

  if (endpoints?.[EModelEndpoint.azureOpenAI]) {
    endpointLocals[EModelEndpoint.azureOpenAI] = azureConfigSetup(config);
    checkAzureVariables();
  }

  if (endpoints?.[EModelEndpoint.azureOpenAI]?.assistants) {
    endpointLocals[EModelEndpoint.azureAssistants] = azureAssistantsDefaults();
  }

  if (endpoints?.[EModelEndpoint.azureAssistants]) {
    endpointLocals[EModelEndpoint.azureAssistants] = assistantsConfigSetup(
      config,
      EModelEndpoint.azureAssistants,
      endpointLocals[EModelEndpoint.azureAssistants],
    );
  }

  if (endpoints?.[EModelEndpoint.assistants]) {
    endpointLocals[EModelEndpoint.assistants] = assistantsConfigSetup(
      config,
      EModelEndpoint.assistants,
      endpointLocals[EModelEndpoint.assistants],
    );
  }

  if (endpoints?.[EModelEndpoint.agents]) {
    endpointLocals[EModelEndpoint.agents] = agentsConfigSetup(config);
  }

  const endpointKeys = [
    EModelEndpoint.openAI,
    EModelEndpoint.google,
    EModelEndpoint.bedrock,
    EModelEndpoint.anthropic,
    EModelEndpoint.gptPlugins,
  ];

  endpointKeys.forEach((key) => {
    if (endpoints?.[key]) {
      endpointLocals[key] = endpoints[key];
    }
  });

  app.locals = {
    ...defaultLocals,
    fileConfig: config?.fileConfig,
    secureImageLinks: config?.secureImageLinks,
    modelSpecs: processModelSpecs(endpoints, config.modelSpecs, interfaceConfig),
    ...endpointLocals,
  };
};

export default AppService;
