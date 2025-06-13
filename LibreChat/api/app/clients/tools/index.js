import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Structured Tools
import DALLE3 from './structured/DALLE3.js';
import FluxAPI from './structured/FluxAPI.js';
import OpenWeather from './structured/OpenWeather.js';
import StructuredWolfram from './structured/Wolfram.js';
import createYouTubeTools from './structured/YouTube.js';
import StructuredACS from './structured/AzureAISearch.js';
import StructuredSD from './structured/StableDiffusion.js';
import GoogleSearchAPI from './structured/GoogleSearch.js';
import TraversaalSearch from './structured/TraversaalSearch.js';
import createOpenAIImageTools from './structured/OpenAIImageTools.js';
import TavilySearchResults from './structured/TavilySearchResults.js';

// Load manifest.json using fs since JSON imports may need assertion
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const availableTools = JSON.parse(readFileSync(join(__dirname, 'manifest.json'), 'utf8'));

/** @type {Record<string, TPlugin | undefined>} */
const manifestToolMap = {};

/** @type {Array<TPlugin>} */
const toolkits = [];

availableTools.forEach((tool) => {
  manifestToolMap[tool.pluginKey] = tool;
  if (tool.toolkit === true) {
    toolkits.push(tool);
  }
});

export {
  toolkits,
  availableTools,
  manifestToolMap,
  // Structured Tools
  DALLE3,
  FluxAPI,
  OpenWeather,
  StructuredSD,
  StructuredACS,
  GoogleSearchAPI,
  TraversaalSearch,
  StructuredWolfram,
  createYouTubeTools,
  TavilySearchResults,
  createOpenAIImageTools,
};
