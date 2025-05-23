import { FullConfig } from '@playwright/test';
import authenticate from './authenticate';

async function googleSetup(config: FullConfig) {
  console.log('🤖: GOOGLE SETUP -----------------');
  const user = {
    name: 'Agentis Test',
    email: String(process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL),
    password: String(process.env.GOOGLE_TEST_ACCOUNT_1_PASSWORD),
  };

  await authenticate(config, user);
}

export default googleSetup;
