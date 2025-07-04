import { test, expect } from '@playwright/test';
import { logProgress } from '../utils/testLogger';

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });

test.describe('Auth & Onboarding Tests', () => {});
