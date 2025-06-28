import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.use({
  storageState: path.join(__dirname, '../data/admin2-auth.json'),
  viewport: {
    height: 1700,
    width: 1600,
  },
});

// Tests in this file run in order. Retries, if any, run independently.
test.describe.configure({ mode: 'default' });
test.describe('Admin Tests Tests', () => {
  test('Basic Admin CRUD', async ({ page }) => {
    await page.goto('http://localhost:3080/');
  });
});
