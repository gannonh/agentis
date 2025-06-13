import { removeNullishValues } from 'librechat-data-provider';
import generateArtifactsPrompt from '../../../../app/clients/prompts/artifacts.js';

const buildOptions = (endpoint, parsedBody) => {
  const {
    modelLabel,
    chatGptLabel,
    promptPrefix,
    agentOptions,
    tools = [],
    iconURL,
    greeting,
    spec,
    maxContextTokens,
    artifacts,
    ...modelOptions
  } = parsedBody;
  const endpointOption = removeNullishValues({
    endpoint,
    tools: tools
      .map((tool) => tool?.pluginKey ?? tool)
      .filter((toolName) => typeof toolName === 'string'),
    modelLabel,
    chatGptLabel,
    promptPrefix,
    agentOptions,
    iconURL,
    greeting,
    spec,
    maxContextTokens,
    modelOptions,
  });

  if (typeof artifacts === 'string') {
    endpointOption.artifactsPrompt = generateArtifactsPrompt({ endpoint, artifacts });
  }

  return endpointOption;
};

export default buildOptions;
