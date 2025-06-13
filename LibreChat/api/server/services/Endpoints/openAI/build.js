import { removeNullishValues } from 'librechat-data-provider';
import generateArtifactsPrompt from '../../../../app/clients/prompts/artifacts.js';

const buildOptions = (endpoint, parsedBody) => {
  const {
    modelLabel,
    chatGptLabel,
    promptPrefix,
    maxContextTokens,
    resendFiles = true,
    imageDetail,
    iconURL,
    greeting,
    spec,
    artifacts,
    ...modelOptions
  } = parsedBody;

  const endpointOption = removeNullishValues({
    endpoint,
    modelLabel,
    chatGptLabel,
    promptPrefix,
    resendFiles,
    imageDetail,
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
