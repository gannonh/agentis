import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Console.log Security Checks', () => {
  const scanDirectory = (dir, violations = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, coverage, and test directories
        if (!['node_modules', 'coverage', 'dist', '__tests__', 'test'].includes(entry.name)) {
          scanDirectory(fullPath, violations);
        }
      } else if (
        entry.isFile() &&
        entry.name.endsWith('.js') &&
        !entry.name.includes('test') &&
        !entry.name.includes('spec') &&
        !fullPath.includes('/specs/')
      ) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Look for console.log statements, but skip commented lines
          if (
            line.includes('console.log') &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('*')
          ) {
            // Check if this console.log is properly protected with NODE_ENV
            const isProtected = checkConsoleLogProtection(content, index + 1, fullPath);

            if (!isProtected) {
              violations.push({
                file: path.relative(path.join(__dirname, '..'), fullPath),
                line: index + 1,
                content: line.trim(),
              });
            }
          }
        });
      }
    }

    return violations;
  };

  const checkConsoleLogProtection = (fileContent, lineNumber, filePath) => {
    const lines = fileContent.split('\n');
    const consoleLogLine = lines[lineNumber - 1];

    // Special exceptions for legitimate cases (check file path)
    const fileExceptions = [
      'demo.js', // Demo files are OK
      'migrate', // Migration scripts may need logging
    ];

    for (const exception of fileExceptions) {
      if (filePath.includes(exception)) {
        return true;
      }
    }

    // Check for same-line environment variable guard patterns
    if (consoleLogLine.includes('&&') && consoleLogLine.includes('console.log')) {
      // Check for NODE_ENV development protection
      if (
        consoleLogLine.includes('NODE_ENV') &&
        (consoleLogLine.includes('development') || consoleLogLine.includes('dev'))
      ) {
        return true;
      }
      // Check for debug variable protection (e.g., debugMemoryCache &&)
      if (
        consoleLogLine.includes('debug') ||
        consoleLogLine.includes('Debug') ||
        consoleLogLine.includes('DEBUG')
      ) {
        return true;
      }
    }

    // Look backwards from the console.log line to find environment-based protection
    for (let i = lineNumber - 1; i >= Math.max(0, lineNumber - 20); i--) {
      const line = lines[i];

      // Check for NODE_ENV development protection patterns
      if (
        line.includes('NODE_ENV') &&
        (line.includes('development') || line.includes('dev')) &&
        (line.includes('if') || line.includes('===') || line.includes('=='))
      ) {
        // Make sure the console.log is within the if block
        const indentationLevel = getIndentationLevel(consoleLogLine);
        const protectionIndentationLevel = getIndentationLevel(line);

        if (indentationLevel > protectionIndentationLevel) {
          return true;
        }
      }

      // Check for environment variable guard patterns (e.g., debugMemoryCache &&)
      if (
        line.includes('&&') &&
        (line.includes('debug') || line.includes('Debug') || line.includes('DEBUG'))
      ) {
        // Make sure the console.log is the target of the && operator
        const indentationLevel = getIndentationLevel(consoleLogLine);
        const protectionIndentationLevel = getIndentationLevel(line);

        if (indentationLevel > protectionIndentationLevel) {
          return true;
        }
      }
    }

    // Content exceptions for specific cases
    const contentExceptions = [
      'magic-link', // Already has proper protection context
    ];

    for (const exception of contentExceptions) {
      if (consoleLogLine.includes(exception)) {
        return true;
      }
    }

    return false;
  };

  const getIndentationLevel = (line) => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  it('should not have unprotected console.log statements in backend files', () => {
    const backendDir = path.join(__dirname, '..');
    const violations = scanDirectory(backendDir);

    if (violations.length > 0) {
      const violationList = violations.map((v) => `${v.file}:${v.line} - ${v.content}`).join('\n');

      console.log('\n🚨 UNPROTECTED CONSOLE.LOG VIOLATIONS FOUND:');
      console.log(
        'These console.log statements will run in PRODUCTION and may expose sensitive data!',
      );
      console.log("\nTo fix, wrap with: if (process.env.NODE_ENV === 'development') { ... }\n");
      console.log(violationList);
    }

    expect(violations.length).toBe(0);
  });
});
