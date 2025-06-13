import { removeNullishValues } from 'librechat-data-provider';
import generateArtifactsPrompt from '../../../../app/clients/prompts/artifacts.js';

const buildOptions = (endpoint, parsedBody) => {
  const {
    modelLabel: name,
    promptPrefix,
    maxContextTokens,
    resendFiles = true,
    imageDetail,
    iconURL,
    greeting,
    spec,
    artifacts,
    ...model_parameters
  } = parsedBody;
  const endpointOption = removeNullishValues({
    endpoint,
    name,
    resendFiles,
    imageDetail,
    iconURL,
    greeting,
    spec,
    promptPrefix,
    maxContextTokens,
    model_parameters,
  });

  if (typeof artifacts === 'string') {
    endpointOption.artifactsPrompt = generateArtifactsPrompt({ endpoint, artifacts });
  }

  return endpointOption;
};

export { buildOptions };
