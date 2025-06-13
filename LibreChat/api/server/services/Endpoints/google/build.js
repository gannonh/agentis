import { removeNullishValues } from 'librechat-data-provider';
import generateArtifactsPrompt from '../../../../app/clients/prompts/artifacts.js';

const buildOptions = (endpoint, parsedBody) => {
  const {
    examples,
    modelLabel,
    resendFiles = true,
    promptPrefix,
    iconURL,
    greeting,
    spec,
    artifacts,
    maxContextTokens,
    ...modelOptions
  } = parsedBody;
  const endpointOption = removeNullishValues({
    examples,
    endpoint,
    modelLabel,
    resendFiles,
    promptPrefix,
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
