import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test.use({
  viewport: {
    height: 1700,
    width: 1600,
  },
});

test('basic', async ({ page }) => {
  await page.goto('http://localhost:3090/');
});
