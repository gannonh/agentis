import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if a console.log line is inside a development-only block
 * @param {string[]} lines - All lines in the file
 * @param {number} lineIndex - Index of the console.log line
 * @returns {boolean} - True if inside development-only block
 */
function isInDevelopmentOnlyBlock(lines, lineIndex) {
  // Look backwards for development check
  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i].trim();

    // Found development check
    if (
      line.includes("process.env.NODE_ENV === 'development'") ||
      line.includes('NODE_ENV === "development"')
    ) {
      return true;
    }

    // Stop if we hit a function boundary or another major block
    if (
      line.includes('function ') ||
      line.includes('=>') ||
      line.includes('} catch') ||
      line.includes('} finally')
    ) {
      break;
    }
  }

  return false;
}

describe('Console.log Security Check', () => {
  const authFilePaths = [
    'auth.js',
    'config/betterAuth.js',
    'server/middleware/requireBetterAuth.js',
    'server/middleware/optionalBetterAuth.js',
  ];

  it('should not contain console.log statements in auth-related files', () => {
    const violations = [];

    authFilePaths.forEach((filePath) => {
      const fullPath = path.join(__dirname, filePath);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check if line contains console.log
          if (line.includes('console.log')) {
            // Allow if it's inside a development-only block
            const isDevelopmentOnly = isInDevelopmentOnlyBlock(lines, index);

            if (!isDevelopmentOnly) {
              violations.push({
                file: filePath,
                line: index + 1,
                content: line.trim(),
              });
            }
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
    const patterns = ['**/*auth*.js', '**/*Auth*.js'];

    const violations = [];

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: __dirname,
        ignore: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/*.vitest.js'],
      });

      if (!Array.isArray(files) || files.length === 0) {
        continue;
      }

      for (const file of files) {
        const fullPath = path.join(__dirname, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Check if line contains console.log
          if (line.includes('console.log')) {
            // Allow if it has eslint-disable comment or is in development-only block
            const hasEslintDisable = line.includes('// eslint-disable-line no-console');
            const isDevelopmentOnly = isInDevelopmentOnlyBlock(lines, index);

            if (!hasEslintDisable && !isDevelopmentOnly) {
              violations.push({
                file,
                line: index + 1,
                content: line.trim(),
              });
            }
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
