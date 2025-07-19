/**
 * Diagnostic Runner for E2E Test Concurrency Issues
 * 
 * This script helps identify data contamination and race conditions
 * when running tests with multiple workers.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  testFile: string;
  testName: string;
  status: 'passed' | 'failed';
  error?: string;
  duration: number;
  worker: number;
}

/**
 * Run tests and collect diagnostic information
 */
export async function runDiagnostics() {
  const testDir = path.join(__dirname, '../specs/auth-ob');
  const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts'));
  
  console.log('🔍 Running E2E Test Diagnostics...\n');
  
  // 1. Check for hardcoded test data
  console.log('1️⃣ Checking for hardcoded test data patterns...');
  checkHardcodedData(testFiles);
  
  // 2. Check for missing cleanup
  console.log('\n2️⃣ Checking for proper cleanup patterns...');
  checkCleanupPatterns(testFiles);
  
  // 3. Check for test isolation issues
  console.log('\n3️⃣ Checking for test isolation...');
  checkTestIsolation(testFiles);
  
  // 4. Run tests with different worker counts
  console.log('\n4️⃣ Running tests with different worker configurations...');
  await runWorkerTests();
}

/**
 * Check for hardcoded test data that might cause conflicts
 */
function checkHardcodedData(testFiles: string[]) {
  const patterns = [
    { pattern: /email:\s*['"][^'"]*@[^'"]+['"](?!.*testId)/g, description: 'Hardcoded emails without testId' },
    { pattern: /name:\s*['"][A-Z][^'"]+['"](?!.*testContext)/g, description: 'Hardcoded organization names' },
    { pattern: /slug:\s*['"][^'"]+['"](?!.*testContext)/g, description: 'Hardcoded slugs' },
    { pattern: /Test(Corp|Org)\s+(?!.*\$\{|.*testContext)/g, description: 'Hardcoded test organization names' }
  ];
  
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '../specs/auth-ob', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    patterns.forEach(({ pattern, description }) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`  ⚠️  ${file}: Found ${matches.length} instances of ${description}`);
        matches.slice(0, 3).forEach(match => {
          console.log(`     - ${match.trim()}`);
        });
      }
    });
  });
}

/**
 * Check for proper cleanup patterns
 */
function checkCleanupPatterns(testFiles: string[]) {
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '../specs/auth-ob', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const hasTestIds = content.includes('const testIds: string[]');
    const hasCleanTestData = content.includes('cleanTestData');
    const hasAfterEachCleanup = content.includes('test.afterEach') && content.includes('cleanTestData');
    
    if (!hasTestIds) {
      console.log(`  ❌ ${file}: Missing testIds array for tracking`);
    }
    if (!hasCleanTestData) {
      console.log(`  ❌ ${file}: Missing cleanTestData import`);
    }
    if (!hasAfterEachCleanup) {
      console.log(`  ❌ ${file}: Missing proper afterEach cleanup with cleanTestData`);
    }
    
    if (hasTestIds && hasCleanTestData && hasAfterEachCleanup) {
      console.log(`  ✅ ${file}: Proper cleanup pattern implemented`);
    }
  });
}

/**
 * Check for test isolation issues
 */
function checkTestIsolation(testFiles: string[]) {
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '../specs/auth-ob', file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for shared state
    const hasGlobalVars = content.match(/^(let|const|var)\s+\w+\s*=(?!.*test\.|.*describe\()/gm);
    if (hasGlobalVars) {
      console.log(`  ⚠️  ${file}: Found ${hasGlobalVars.length} global variables that might cause shared state`);
    }
    
    // Check for database operations outside of tests
    const hasDirectDbOps = content.match(/db\.collection\(/g);
    const dbOpsInTests = content.match(/test\([^)]+\)[^{]+\{[\s\S]*?db\.collection\(/g);
    if (hasDirectDbOps && hasDirectDbOps.length > (dbOpsInTests?.length || 0)) {
      console.log(`  ⚠️  ${file}: Found database operations that might not be properly isolated`);
    }
  });
}

/**
 * Run tests with different worker configurations
 */
async function runWorkerTests() {
  const configurations = [
    { workers: 1, name: 'Serial execution' },
    { workers: 2, name: 'Two workers' },
    { workers: 4, name: 'Four workers' }
  ];
  
  for (const config of configurations) {
    console.log(`\n  🧪 Testing with ${config.name} (${config.workers} worker${config.workers > 1 ? 's' : ''})...`);
    
    try {
      const startTime = Date.now();
      execSync(
        `npx playwright test e2e/specs/auth-ob --workers=${config.workers} --reporter=json`,
        { 
          stdio: 'pipe',
          cwd: path.join(__dirname, '../../..')
        }
      );
      const duration = Date.now() - startTime;
      console.log(`    ✅ All tests passed in ${(duration / 1000).toFixed(2)}s`);
    } catch (error: any) {
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout.toString());
          const failed = results.suites.flatMap((suite: any) => 
            suite.specs.filter((spec: any) => spec.tests.some((test: any) => test.status === 'failed'))
          );
          console.log(`    ❌ ${failed.length} tests failed`);
          failed.slice(0, 3).forEach((spec: any) => {
            console.log(`       - ${spec.title}`);
          });
        } catch (parseError) {
          console.log(`    ❌ Tests failed (unable to parse results)`);
        }
      }
    }
  }
}

/**
 * Analyze specific test failures for patterns
 */
export function analyzeFailures(logContent: string): void {
  console.log('\n📊 Analyzing Test Failure Patterns...\n');
  
  // Common failure patterns
  const patterns = [
    {
      pattern: /browserContext\.close: Test ended/g,
      issue: 'Browser context closed prematurely',
      solution: 'Ensure proper test isolation and no shared browser contexts'
    },
    {
      pattern: /Timed out.*waiting for.*heading.*Complete Your Profile/g,
      issue: 'Profile step not reached',
      solution: 'Check if organization creation is failing or if there\'s data contamination'
    },
    {
      pattern: /Failed to capture magic link/g,
      issue: 'Email capture failing',
      solution: 'Check if emails are unique and MailHog is working correctly'
    },
    {
      pattern: /Organization.*already exists/g,
      issue: 'Duplicate organization names',
      solution: 'Ensure unique organization names with testId'
    }
  ];
  
  patterns.forEach(({ pattern, issue, solution }) => {
    const matches = logContent.match(pattern);
    if (matches) {
      console.log(`🔴 ${issue}`);
      console.log(`   Found: ${matches.length} occurrences`);
      console.log(`   Solution: ${solution}\n`);
    }
  });
}

// Run diagnostics if executed directly
if (require.main === module) {
  runDiagnostics().catch(console.error);
}