import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Console.log Security Check', () => {
  const authFilePaths = [
    'api/auth.js',
    'api/config/betterAuth.js',
    'api/server/middleware/requireBetterAuth.js',
    'api/server/middleware/optionalBetterAuth.js',
    'client/src/hooks/useAuthContext.ts',
    'client/src/hooks/useAutoSetActiveOrganization.ts',
    'client/src/routes/AuthGuard.tsx',
    'client/src/components/Auth/OAuthOnboardingRedirect.tsx',
    'client/src/config/betterAuth.ts',
  ];

  it('should not contain console.log statements in auth-related files', () => {
    const violations = [];

    authFilePaths.forEach((filePath) => {
      const fullPath = path.join(__dirname, '../', filePath);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.includes('console.log')) {
            violations.push({
              file: filePath,
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      }
    });

    if (violations.length > 0) {
      const violationMessages = violations
        .map((v) => `  ${v.file}:${v.line} - ${v.content}`)
        .join('\n');

      throw new Error(
        `Found ${violations.length} console.log statements in auth files:\n${violationMessages}`,
      );
    }
  });

  it('should check all files with auth-related patterns', async () => {
    const patterns = [
      'api/**/*auth*.js',
      'api/**/*Auth*.js',
      'client/src/**/*auth*.{ts,tsx,js,jsx}',
      'client/src/**/*Auth*.{ts,tsx,js,jsx}',
      'client/src/hooks/use*Organization*.ts',
      'client/src/components/Auth/**/*.{ts,tsx,js,jsx}',
    ];

    const violations = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: path.join(__dirname, '../'),
        ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/*.vitest.js'],
      });

      if (!files || files.length === 0) {
        continue;
      }

      for (const file of files) {
        const fullPath = path.join(__dirname, '../', file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.includes('console.log') && !line.includes('// eslint-disable-line no-console')) {
            violations.push({
              file,
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      }
    }

    if (violations.length > 0) {
      const violationMessages = violations
        .map((v) => `  ${v.file}:${v.line} - ${v.content}`)
        .join('\n');

      throw new Error(
        `Found ${violations.length} console.log statements in auth-related files:\n${violationMessages}`,
      );
    }
  });
});
