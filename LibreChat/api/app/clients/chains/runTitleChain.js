import { z } from 'zod';
import { langPrompt, createTitlePrompt, escapeBraces, getSnippet } from '../prompts/index.js';
import { createStructuredOutputChainFromZod } from 'langchain/chains/openai_functions';
import { logger } from '#config/index.js';

const langSchema = z.object({
  language: z.string().describe('The language of the input text (full noun, no abbreviations).'),
});

const createLanguageChain = (config) =>
  createStructuredOutputChainFromZod(langSchema, {
    prompt: langPrompt,
    ...config,
    // verbose: true,
  });

const titleSchema = z.object({
  title: z.string().describe('The conversation title in title-case, in the given language.'),
});
const createTitleChain = ({ convo, ...config }) => {
  const titlePrompt = createTitlePrompt({ convo });
  return createStructuredOutputChainFromZod(titleSchema, {
    prompt: titlePrompt,
    ...config,
    // verbose: true,
  });
};

const runTitleChain = async ({ llm, text, convo, signal, callbacks }) => {
  let snippet = text;
  try {
    snippet = getSnippet(text);
  } catch (e) {
    logger.error('[runTitleChain] Error getting snippet of text for titleChain', e);
  }
  const languageChain = createLanguageChain({ llm, callbacks });
  const titleChain = createTitleChain({ llm, callbacks, convo: escapeBraces(convo) });
  const { language } = (await languageChain.call({ inputText: snippet, signal })).output;
  return (await titleChain.call({ language, signal })).output.title;
};

export default runTitleChain;
