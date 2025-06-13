import { getEnvironmentVariable } from '@langchain/core/utils/env';

export function getApiKey(envVar, override) {
  const key = getEnvironmentVariable(envVar);
  if (!key && !override) {
    throw new Error(`Missing ${envVar} environment variable.`);
  }
  return key;
}
