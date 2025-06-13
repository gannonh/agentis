import { EModelEndpoint } from 'librechat-data-provider';
import { isUserProvided } from '../../utils/index.js';
import { config } from './EndpointService.js';

const { openAIApiKey, azureOpenAIApiKey, useAzurePlugins, userProvidedOpenAI, googleKey } = config;

/**
 * Load async endpoints and return a configuration object
 * @param {Express.Request} req - The request object
 */
async function loadAsyncEndpoints(req) {
  let i = 0;
  let serviceKey, googleUserProvides;
  try {
    const { default: authData } = await import('../../../data/auth.json', {
      assert: { type: 'json' },
    });
    serviceKey = authData;
  } catch (e) {
    if (i === 0) {
      i++;
    }
  }

  if (isUserProvided(googleKey)) {
    googleUserProvides = true;
    if (i <= 1) {
      i++;
    }
  }

  const google = serviceKey || googleKey ? { userProvide: googleUserProvides } : false;

  const useAzure = req.app.locals[EModelEndpoint.azureOpenAI]?.plugins;
  const gptPlugins =
    useAzure || openAIApiKey || azureOpenAIApiKey
      ? {
          availableAgents: ['classic', 'functions'],
          userProvide: useAzure ? false : userProvidedOpenAI,
          userProvideURL: useAzure
            ? false
            : config[EModelEndpoint.openAI]?.userProvideURL ||
              config[EModelEndpoint.azureOpenAI]?.userProvideURL,
          azure: useAzurePlugins || useAzure,
        }
      : false;

  return { google, gptPlugins };
}

export default loadAsyncEndpoints;
