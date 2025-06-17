import {
  parseCompactConvo,
  EModelEndpoint,
  isAgentsEndpoint,
  EndpointURLs,
} from 'librechat-data-provider';
import * as azureAssistants from '#server/services/Endpoints/azureAssistants/index.js';
import { getModelsConfig } from '#server/controllers/ModelController.js';
import * as assistants from '#server/services/Endpoints/assistants/index.js';
import * as gptPlugins from '#server/services/Endpoints/gptPlugins/index.js';
import { processFiles } from '#server/services/Files/process.js';
import * as anthropic from '#server/services/Endpoints/anthropic/index.js';
import * as bedrock from '#server/services/Endpoints/bedrock/index.js';
import * as openAI from '#server/services/Endpoints/openAI/index.js';
import * as agents from '#server/services/Endpoints/agents/index.js';
import * as custom from '#server/services/Endpoints/custom/index.js';
import * as google from '#server/services/Endpoints/google/index.js';
import { handleError } from '#server/utils/index.js';

const buildFunction = {
  [EModelEndpoint.openAI]: openAI.buildOptions,
  [EModelEndpoint.google]: google.buildOptions,
  [EModelEndpoint.custom]: custom.buildOptions,
  [EModelEndpoint.agents]: agents.default.buildOptions,
  [EModelEndpoint.bedrock]: bedrock.buildOptions,
  [EModelEndpoint.azureOpenAI]: openAI.buildOptions,
  [EModelEndpoint.anthropic]: anthropic.buildOptions,
  [EModelEndpoint.gptPlugins]: gptPlugins.buildOptions,
  [EModelEndpoint.assistants]: assistants.buildOptions,
  [EModelEndpoint.azureAssistants]: azureAssistants.buildOptions,
};

async function buildEndpointOption(req, res, next) {
  const { endpoint, endpointType } = req.body;
  let parsedBody;
  try {
    parsedBody = parseCompactConvo({ endpoint, endpointType, conversation: req.body });
  } catch (error) {
    return handleError(res, { text: 'Error parsing conversation' });
  }

  if (req.app.locals.modelSpecs?.list && req.app.locals.modelSpecs?.enforce) {
    /** @type {{ list: TModelSpec[] }}*/
    const { list } = req.app.locals.modelSpecs;
    const { spec } = parsedBody;

    if (!spec) {
      return handleError(res, { text: 'No model spec selected' });
    }

    const currentModelSpec = list.find((s) => s.name === spec);
    if (!currentModelSpec) {
      return handleError(res, { text: 'Invalid model spec' });
    }

    if (endpoint !== currentModelSpec.preset.endpoint) {
      return handleError(res, { text: 'Model spec mismatch' });
    }

    if (
      currentModelSpec.preset.endpoint !== EModelEndpoint.gptPlugins &&
      currentModelSpec.preset.tools
    ) {
      return handleError(res, {
        text: `Only the "${EModelEndpoint.gptPlugins}" endpoint can have tools defined in the preset`,
      });
    }

    try {
      currentModelSpec.preset.spec = spec;
      if (currentModelSpec.iconURL != null && currentModelSpec.iconURL !== '') {
        currentModelSpec.preset.iconURL = currentModelSpec.iconURL;
      }
      parsedBody = parseCompactConvo({
        endpoint,
        endpointType,
        conversation: currentModelSpec.preset,
      });
    } catch (error) {
      return handleError(res, { text: 'Error parsing model spec' });
    }
  }

  try {
    const isAgents =
      isAgentsEndpoint(endpoint) || req.baseUrl.startsWith(EndpointURLs[EModelEndpoint.agents]);
    const lookupKey = isAgents ? EModelEndpoint.agents : (endpointType ?? endpoint);
    const endpointFn = buildFunction[lookupKey];

    if (!endpointFn) {
      console.error('[buildEndpointOption] No endpoint function found for:', lookupKey);
      return handleError(res, { text: `No handler for endpoint: ${lookupKey}` });
    }

    const builder = isAgents ? (...args) => endpointFn(req, ...args) : endpointFn;

    // TODO: use object params
    req.body.endpointOption = await builder(endpoint, parsedBody, endpointType);

    // TODO: use `getModelsConfig` only when necessary
    const modelsConfig = await getModelsConfig(req);
    req.body.endpointOption.modelsConfig = modelsConfig;
    if (req.body.files && !isAgents) {
      req.body.endpointOption.attachments = processFiles(req.body.files);
    }
    next();
  } catch (error) {
    console.error('[buildEndpointOption] Error details:', {
      message: error.message,
      stack: error.stack,
      endpoint,
      endpointType,
      userId: req.user?.id,
    });
    return handleError(res, { text: 'Error building endpoint option' });
  }
}

export default buildEndpointOption;
