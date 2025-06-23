import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple console logger fallback for when winston can't load
const logger = {
  error: (...args) => console.error('[MEILI-ERROR]', ...args),
  warn: (...args) => console.warn('[MEILI-WARN]', ...args),
  info: (...args) => console.info('[MEILI-INFO]', ...args),
  debug: (...args) => console.debug('[MEILI-DEBUG]', ...args),
  verbose: (...args) =>
    process.env.NODE_ENV === 'development' && console.log('[MEILI-VERBOSE]', ...args),
  silly: (...args) =>
    process.env.NODE_ENV === 'development' && console.log('[MEILI-SILLY]', ...args),
};

export default logger;
