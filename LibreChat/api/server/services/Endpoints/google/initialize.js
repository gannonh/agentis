import { EModelEndpoint, AuthKeys } from 'librechat-data-provider';
import { getUserKey, checkUserKeyExpiry } from '../../UserService.js';
import { getLLMConfig } from './llm.js';
import { isEnabled } from '../../../utils/index.js';
import { GoogleClient } from '#app/clients/index.js';

const initializeClient = async ({ req, res, endpointOption, overrideModel, optionsOnly }) => {
  const { GOOGLE_KEY, GOOGLE_REVERSE_PROXY, GOOGLE_AUTH_HEADER, PROXY } = process.env;
  const isUserProvided = GOOGLE_KEY === 'user_provided';
  const { key: expiresAt } = req.body;

  let userKey = null;
  if (expiresAt && isUserProvided) {
    checkUserKeyExpiry(expiresAt, EModelEndpoint.google);
    userKey = await getUserKey({ userId: req.user.id, name: EModelEndpoint.google });
  }

  let serviceKey = {};
  try {
    const authModule = await import('../../../../data/auth.json', { with: { type: 'json' } });
    serviceKey = authModule.default;
  } catch (e) {
    // Do nothing
  }

  const credentials = isUserProvided
    ? userKey
    : {
        [AuthKeys.GOOGLE_SERVICE_KEY]: serviceKey,
        [AuthKeys.GOOGLE_API_KEY]: GOOGLE_KEY,
      };

  let clientOptions = {};

  /** @type {undefined | TBaseEndpoint} */
  const allConfig = req.app.locals.all;
  /** @type {undefined | TBaseEndpoint} */
  const googleConfig = req.app.locals[EModelEndpoint.google];

  if (googleConfig) {
    clientOptions.streamRate = googleConfig.streamRate;
    clientOptions.titleModel = googleConfig.titleModel;
  }

  if (allConfig) {
    clientOptions.streamRate = allConfig.streamRate;
  }

  clientOptions = {
    req,
    res,
    reverseProxyUrl: GOOGLE_REVERSE_PROXY ?? null,
    authHeader: isEnabled(GOOGLE_AUTH_HEADER) ?? null,
    proxy: PROXY ?? null,
    ...clientOptions,
    ...endpointOption,
  };

  if (optionsOnly) {
    clientOptions = Object.assign(
      {
        modelOptions: endpointOption.model_parameters,
      },
      clientOptions,
    );
    if (overrideModel) {
      clientOptions.modelOptions.model = overrideModel;
    }
    return getLLMConfig(credentials, clientOptions);
  }

  const client = new GoogleClient(credentials, clientOptions);

  return {
    client,
    credentials,
  };
};

export default initializeClient;
