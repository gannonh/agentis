import { PlaywrightTestConfig } from '@playwright/test';
import mainConfig from '../playwright.config';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI not found in environment variables after loading .env');
  console.log('Available env vars:', Object.keys(process.env));
}

const absolutePath = path.join(__dirname, '../../api/server/index.js');

const config: PlaywrightTestConfig = {
  ...mainConfig,
  retries: 0,
  globalSetup: require.resolve('../setup/google-setup'),
  globalTeardown: require.resolve('../setup/google-teardown'),
  webServer: {
    ...mainConfig.webServer,
    command: `node ${absolutePath}`,
    port: 3080,
    env: {
      ...process.env, // This will include all environment variables from .env
      NODE_ENV: 'CI', // Override NODE_ENV for tests
    },
  },
  fullyParallel: false,
};

export default config;
