import { removeNullishValues, anthropicSettings } from 'librechat-data-provider';
import generateArtifactsPrompt from '../../../../app/clients/prompts/artifacts.js';

const buildOptions = (endpoint, parsedBody) => {
  const {
    modelLabel,
    promptPrefix,
    maxContextTokens,
    resendFiles = anthropicSettings.resendFiles.default,
    promptCache = anthropicSettings.promptCache.default,
    thinking = anthropicSettings.thinking.default,
    thinkingBudget = anthropicSettings.thinkingBudget.default,
    iconURL,
    greeting,
    spec,
    artifacts,
    ...modelOptions
  } = parsedBody;

  const endpointOption = removeNullishValues({
    endpoint,
    modelLabel,
    promptPrefix,
    resendFiles,
    promptCache,
    thinking,
    thinkingBudget,
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
