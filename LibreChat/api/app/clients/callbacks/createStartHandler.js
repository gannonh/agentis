import { promptTokensEstimate } from 'openai-chat-tokens';
import { EModelEndpoint, supportsBalanceCheck } from 'librechat-data-provider';
import { formatFromLangChain } from '#app/clients/prompts/index.js';
import { getBalanceConfig } from '#server/services/Config/index.js';
import { checkBalance } from '#models/balanceMethods.js';
import { logger } from '#config/index.js';

const createStartHandler = ({
  context,
  conversationId,
  tokenBuffer = 0,
  initialMessageCount,
  manager,
}) => {
  return async (_llm, _messages, runId, parentRunId, extraParams) => {
    const { invocation_params } = extraParams;
    const { model, functions, function_call } = invocation_params;
    const messages = _messages[0].map(formatFromLangChain);

    logger.debug(`[createStartHandler] handleChatModelStart: ${context}`, {
      model,
      function_call,
    });

    if (context !== 'title') {
      logger.debug(`[createStartHandler] handleChatModelStart: ${context}`, {
        functions,
      });
    }

    const payload = { messages };
    let prelimPromptTokens = 1;

    if (functions) {
      payload.functions = functions;
      prelimPromptTokens += 2;
    }

    if (function_call) {
      payload.function_call = function_call;
      prelimPromptTokens -= 5;
    }

    prelimPromptTokens += promptTokensEstimate(payload);
    logger.debug('[createStartHandler]', {
      prelimPromptTokens,
      tokenBuffer,
    });
    prelimPromptTokens += tokenBuffer;

    try {
      const balance = await getBalanceConfig();
      if (balance?.enabled && supportsBalanceCheck[EModelEndpoint.openAI]) {
        const generations =
          initialMessageCount && messages.length > initialMessageCount
            ? messages.slice(initialMessageCount)
            : null;
        await checkBalance({
          req: manager.req,
          res: manager.res,
          txData: {
            user: manager.user,
            tokenType: 'prompt',
            amount: prelimPromptTokens,
            debug: manager.debug,
            generations,
            model,
            endpoint: EModelEndpoint.openAI,
          },
        });
      }
    } catch (err) {
      logger.error(`[createStartHandler][${context}] checkBalance error`, err);
      manager.abortController.abort();
      if (context === 'summary' || context === 'plugins') {
        manager.addRun(runId, { conversationId, error: err.message });
        throw new Error(err);
      }
      return;
    }

    manager.addRun(runId, {
      model,
      messages,
      functions,
      function_call,
      runId,
      parentRunId,
      conversationId,
      prelimPromptTokens,
    });
  };
};

export default createStartHandler;
