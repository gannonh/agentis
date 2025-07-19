/**
 * Concurrency Fix for E2E Tests
 * 
 * This module provides utilities to fix concurrent test execution issues
 * by implementing proper test isolation and cleanup strategies.
 */

import { type Db } from 'mongodb';

/**
 * Enhanced cleanup that only removes data older than a certain threshold
 * to avoid deleting data from currently running tests
 */
export async function safeCleanDatabase(db: Db, ageThresholdMs: number = 60000): Promise<void> {
  const cutoffTime = new Date(Date.now() - ageThresholdMs);
  
  // Only delete data older than the threshold
  const cleanupFilter = {
    $or: [
      { createdAt: { $lt: cutoffTime } },
      { createdAt: { $exists: false } } // Handle legacy data without timestamps
    ]
  };
  
  // Clean in proper order
  await db.collection('session').deleteMany({
    ...cleanupFilter,
    $or: [
      { userId: { $regex: /test-.*@/ } },
      { userId: { $regex: /first-.*@/ } },
      { userId: { $regex: /second-.*@/ } },
      { userId: { $regex: /user[12]-.*@/ } },
    ]
  });
  
  await db.collection('member').deleteMany({
    ...cleanupFilter,
    $or: [
      { userId: { $regex: /test-/ } },
      { organizationId: { $regex: /test-/ } }
    ]
  });
  
  await db.collection('organization').deleteMany({
    ...cleanupFilter,
    $or: [
      { name: { $regex: /Test.*\d{13}-/ } }, // Only orgs with timestamp pattern
      { slug: { $regex: /test.*\d{13}-/ } }
    ]
  });
  
  await db.collection('user').deleteMany({
    ...cleanupFilter,
    email: { $regex: /.*-\d{13}-[a-f0-9]{8}@/ } // Only emails with our testId pattern
  });
}

/**
 * Create a test-specific beforeAll hook that marks test start time
 */
export function createTestMarker() {
  let testStartTime: number;
  
  return {
    markStart: () => {
      testStartTime = Date.now();
    },
    getStartTime: () => testStartTime,
    getTestAge: () => Date.now() - testStartTime
  };
}

/**
 * Modified cleanup strategy for concurrent tests
 */
export const concurrentTestConfig = {
  // Only clean data older than 2 minutes
  cleanupAgeThreshold: 2 * 60 * 1000,
  
  // Add small delay between test starts to reduce conflicts
  testStartDelay: () => new Promise(resolve => setTimeout(resolve, Math.random() * 1000)),
  
  // Retry configuration for flaky operations
  retryConfig: {
    retries: 3,
    delay: 1000,
    backoff: 2
  }
};

/**
 * Wrapper for operations that might fail due to concurrency
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config = concurrentTestConfig.retryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on assertion failures
      if (error instanceof Error && error.message.includes('expect(')) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = config.delay * Math.pow(config.backoff, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}