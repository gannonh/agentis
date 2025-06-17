#!/usr/bin/env node

/**
 * Automated Jest to Vitest Migration Script
 * 
 * This script systematically converts Jest syntax to Vitest syntax across all test files
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CLIENT_DIR = __dirname;
const TEST_PATTERNS = [
  'src/**/*.test.{js,jsx,ts,tsx}',
  'src/**/*.spec.{js,jsx,ts,tsx}',
  'test/**/*.{js,jsx,ts,tsx}'
];

// Files to skip (already migrated)
const SKIP_FILES = [
  'src/components/Auth/__tests__/SocialButton.test.tsx',
  'src/hooks/__tests__/AuthContext.test.tsx',
  'src/routes/__tests__/AuthGuard.test.tsx'
];

// Jest to Vitest replacements
const REPLACEMENTS = [
  // Basic Jest functions
  { from: /\bjest\.fn\(\)/g, to: 'vi.fn()' },
  { from: /\bjest\.spyOn\(/g, to: 'vi.spyOn(' },
  { from: /\bjest\.mock\(/g, to: 'vi.mock(' },
  { from: /\bjest\.unmock\(/g, to: 'vi.unmock(' },
  { from: /\bjest\.doMock\(/g, to: 'vi.doMock(' },
  { from: /\bjest\.dontMock\(/g, to: 'vi.dontMock(' },
  { from: /\bjest\.clearAllMocks\(\)/g, to: 'vi.clearAllMocks()' },
  { from: /\bjest\.resetAllMocks\(\)/g, to: 'vi.resetAllMocks()' },
  { from: /\bjest\.restoreAllMocks\(\)/g, to: 'vi.restoreAllMocks()' },
  { from: /\bjest\.requireActual\(/g, to: 'vi.importActual(' },
  { from: /\bjest\.requireMock\(/g, to: 'vi.importMock(' },
  
  // Timer functions
  { from: /\bjest\.useFakeTimers\(\)/g, to: 'vi.useFakeTimers()' },
  { from: /\bjest\.useRealTimers\(\)/g, to: 'vi.useRealTimers()' },
  { from: /\bjest\.runAllTimers\(\)/g, to: 'vi.runAllTimers()' },
  { from: /\bjest\.runOnlyPendingTimers\(\)/g, to: 'vi.runOnlyPendingTimers()' },
  { from: /\bjest\.advanceTimersByTime\(/g, to: 'vi.advanceTimersByTime(' },
  
  // Jest globals that need to be imported
  { from: /\bbeforeAll\(/g, to: 'beforeAll(' },
  { from: /\bafterAll\(/g, to: 'afterAll(' },
  { from: /\bbeforeEach\(/g, to: 'beforeEach(' },
  { from: /\bafterEach\(/g, to: 'afterEach(' },
  { from: /\bdescribe\(/g, to: 'describe(' },
  { from: /\bit\(/g, to: 'it(' },
  { from: /\btest\(/g, to: 'test(' },
  { from: /\bexpect\(/g, to: 'expect(' },
];

// Function to find all test files
async function findTestFiles() {
  const files = [];
  for (const pattern of TEST_PATTERNS) {
    const matches = await glob(pattern, { cwd: CLIENT_DIR });
    files.push(...matches);
  }
  
  // Filter out already migrated files
  return files.filter(file => !SKIP_FILES.includes(file));
}

// Function to check if file needs Vitest imports
function needsVitestImports(content) {
  const hasTestFunctions = /\b(describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll)\b/.test(content);
  const hasViMocks = /\bvi\.(fn|mock|spyOn)/.test(content);
  const hasVitestImport = /from\s+['"]vitest['"]/.test(content);
  
  return (hasTestFunctions || hasViMocks) && !hasVitestImport;
}

// Function to add Vitest imports
function addVitestImports(content) {
  // Determine what imports are needed based on content
  const imports = new Set();
  
  if (/\b(describe|it|test)\b/.test(content)) {
    imports.add('describe');
    imports.add('it');
    if (/\btest\b/.test(content)) imports.add('test');
  }
  
  if (/\bexpect\b/.test(content)) imports.add('expect');
  if (/\bbeforeEach\b/.test(content)) imports.add('beforeEach');
  if (/\bafterEach\b/.test(content)) imports.add('afterEach');
  if (/\bbeforeAll\b/.test(content)) imports.add('beforeAll');
  if (/\bafterAll\b/.test(content)) imports.add('afterAll');
  if (/\bvi\.(fn|mock|spyOn|clearAllMocks|resetAllMocks|restoreAllMocks|importActual|importMock|useFakeTimers|useRealTimers|runAllTimers|runOnlyPendingTimers|advanceTimersByTime)\b/.test(content)) {
    imports.add('vi');
  }
  
  // Check for TypeScript Mock type usage
  if (/\bMock\b/.test(content) && /\.tsx?$/.test(content)) {
    imports.add('type Mock');
  }
  
  if (imports.size === 0) return content;
  
  const importList = Array.from(imports).sort();
  const vitestImport = `import { ${importList.join(', ')} } from 'vitest';\n`;
  
  // Insert after existing imports or at the top
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('//')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '') {
      continue;
    } else {
      break;
    }
  }
  
  lines.splice(insertIndex, 0, vitestImport);
  return lines.join('\n');
}

// Function to migrate a single file
function migrateFile(filePath) {
  console.log(`Migrating: ${filePath}`);
  
  const fullPath = path.join(CLIENT_DIR, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Skip if already has Vitest imports and vi. syntax
  if (content.includes('from \'vitest\'') && content.includes('vi.')) {
    console.log(`  ✓ Already migrated`);
    return { success: true, changes: 0 };
  }
  
  let changes = 0;
  const originalContent = content;
  
  // Apply replacements
  REPLACEMENTS.forEach(replacement => {
    const before = content;
    content = content.replace(replacement.from, replacement.to);
    if (content !== before) {
      changes++;
    }
  });
  
  // Add Vitest imports if needed
  if (needsVitestImports(content)) {
    content = addVitestImports(content);
    changes++;
  }
  
  // Write back if changes were made
  if (changes > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✓ Applied ${changes} changes`);
  } else {
    console.log(`  ✓ No changes needed`);
  }
  
  return { success: true, changes };
}

// Main migration function
async function main() {
  console.log('🔄 Starting Jest to Vitest migration...\n');
  
  const testFiles = await findTestFiles();
  console.log(`Found ${testFiles.length} test files to migrate\n`);
  
  let totalChanges = 0;
  let filesProcessed = 0;
  let errors = [];
  
  for (const file of testFiles) {
    try {
      const result = migrateFile(file);
      totalChanges += result.changes;
      filesProcessed++;
    } catch (error) {
      console.error(`  ❌ Error migrating ${file}: ${error.message}`);
      errors.push({ file, error: error.message });
    }
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 Migration Summary:');
  console.log(`  Files processed: ${filesProcessed}/${testFiles.length}`);
  console.log(`  Total changes: ${totalChanges}`);
  console.log(`  Errors: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(({ file, error }) => {
      console.log(`  ${file}: ${error}`);
    });
  }
  
  console.log('\n✅ Migration complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Run: npm run test:ci');
  console.log('  2. Fix any remaining test failures manually');
  console.log('  3. Remove this migration script when done');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { migrateFile, findTestFiles, REPLACEMENTS };