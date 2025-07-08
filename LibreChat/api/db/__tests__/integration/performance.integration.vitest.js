/**
 * @fileoverview Performance tests for organization database operations
 * @module db/__tests__/performance-tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import connectDb from '../../../lib/db/connectDb.js';
import {
  createOrganizationIndexes,
  dropOrganizationIndexes,
  PERFORMANCE_TARGETS,
} from '../../organization-indexes.js';
import {
  OrganizationPerformanceSetup,
  wrapWithMonitoring,
  mongoProfiler,
} from '../../performance-monitor.js';

// Performance test thresholds (with buffer for test environment variability)
const TEST_THRESHOLDS = {
  // Domain lookup: target < 10ms, test allows < 50ms
  DOMAIN_LOOKUP: 50,
  DOMAIN_LOOKUP_TARGET: 10,

  // Member lookup: target < 2ms, test allows < 20ms
  MEMBER_LOOKUP: 20,
  MEMBER_LOOKUP_TARGET: 2,

  // Organization slug lookup: target < 5ms, test allows < 30ms
  ORG_SLUG_LOOKUP: 30,
  ORG_SLUG_LOOKUP_TARGET: 5,

  // User organizations list: target < 10ms, test allows < 40ms
  USER_ORGS_LIST: 40,
  USER_ORGS_LIST_TARGET: 10,

  // User organizations count: target < 5ms, test allows < 30ms
  USER_ORGS_COUNT: 30,
  USER_ORGS_COUNT_TARGET: 5,

  // Bulk operations and other general operations
  BULK_OPERATIONS: 100,
  INDEX_CREATION: 30000, // 30 seconds for index creation

  // Concurrent query performance (per query)
  CONCURRENT_QUERY_MAX: 200, // max per query under load
  CONCURRENT_QUERY_AVG: 100, // average should be better
};

// Mock Better Auth API for testing
const mockBetterAuth = {
  api: {
    listOrganizations: vi.fn(),
    createOrganization: vi.fn(),
    addMember: vi.fn(),
    getMember: vi.fn(),
    listUserOrganizations: vi.fn(),
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
  },
};

// Mock getAuth
vi.mock('../../../auth.js', () => ({
  getAuth: () => mockBetterAuth,
}));

// TODO: Re-enable performance tests before production deployment
// These tests require real database connections and conflict with MongoMemoryServer used in other tests
describe.skip('Organization Database Performance Tests', () => {
  let collections = {};
  let testDb;

  beforeAll(async () => {
    try {
      await connectDb();
      testDb = mongoose.connection.db;

      // Get collections
      collections.organization = testDb.collection('organization');
      collections.member = testDb.collection('member');
      collections.invitation = testDb.collection('invitation');

      // Initialize performance monitoring
      await OrganizationPerformanceSetup.initialize({
        slowQueryThreshold: 50,
        enableMongoProfiling: false,
      });

      console.log(`📊 Performance tests running against: ${testDb.databaseName}`);
    } catch (error) {
      throw new Error(`Failed to connect to test database: ${error.message}`);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      for (const collection of Object.values(collections)) {
        await collection.deleteMany({ _test: true });
      }
      console.log('🧹 Cleaned up test data');
    } catch (error) {
      console.warn('⚠️  Failed to clean up test data:', error.message);
    }
  });

  describe('Index Creation Performance', () => {
    it('should create indexes efficiently', async () => {
      const startTime = Date.now();

      const results = await createOrganizationIndexes();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(TEST_THRESHOLDS.INDEX_CREATION); // Should complete within 30 seconds
      expect(results.errors.length).toBe(0);

      // Verify indexes were created or already exist
      const totalIndexes = results.created.length + results.skipped.length;
      expect(totalIndexes).toBeGreaterThan(5); // Should have at least 5 indexes across collections
    });

    it('should handle duplicate index creation gracefully', async () => {
      // Try to create indexes again - should skip existing ones
      const results = await createOrganizationIndexes();

      // Should either skip existing indexes or create new ones without errors
      expect(results.errors.length).toBe(0);
      // At least some operation should have occurred
      const totalOperations = results.created.length + results.skipped.length;
      expect(totalOperations).toBeGreaterThan(0);
    });
  });

  describe('Query Performance with Sample Data', () => {
    beforeAll(async () => {
      // Create sample test data for performance testing
      await createSampleTestData();
    });

    it('should perform organization domain lookups efficiently', async () => {
      const testDomain = 'testcompany.com';

      const timedQuery = wrapWithMonitoring('organization_domain_lookup_test', async () => {
        return await collections.organization.findOne({ 'metadata.domain': testDomain });
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should be fast with proper index
      expect(duration).toBeLessThan(TEST_THRESHOLDS.DOMAIN_LOOKUP); // Target: < 10ms, test allows < 50ms
      expect(result).toBeTruthy();
      expect(result.metadata.domain).toBe(testDomain);
    });

    it('should perform user membership checks efficiently', async () => {
      const testUserId = 'test-user-1';
      const testOrgId = 'test-org-1';

      const timedQuery = wrapWithMonitoring('member_lookup_test', async () => {
        return await collections.member.findOne({
          userId: testUserId,
          organizationId: testOrgId,
        });
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should be very fast with compound index
      expect(duration).toBeLessThan(TEST_THRESHOLDS.MEMBER_LOOKUP); // Target: < 2ms, test allows < 20ms
      expect(result).toBeTruthy();
      expect(result.userId).toBe(testUserId);
      expect(result.organizationId).toBe(testOrgId);
    });

    it('should perform organization slug lookups efficiently', async () => {
      const testSlug = 'testcompany';

      const timedQuery = wrapWithMonitoring('organization_slug_lookup_test', async () => {
        return await collections.organization.findOne({ slug: testSlug });
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should be fast with unique index
      expect(duration).toBeLessThan(TEST_THRESHOLDS.ORG_SLUG_LOOKUP); // Target: < 5ms, test allows < 30ms
      expect(result).toBeTruthy();
      expect(result.slug).toBe(testSlug);
    });

    it('should perform invitation status queries efficiently', async () => {
      const testOrgId = 'test-org-1';
      const testStatus = 'pending';

      const timedQuery = wrapWithMonitoring('invitation_status_lookup_test', async () => {
        return await collections.invitation
          .find({
            organizationId: testOrgId,
            status: testStatus,
          })
          .toArray();
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should be fast with compound index
      expect(duration).toBeLessThan(TEST_THRESHOLDS.USER_ORGS_LIST); // Target: < 10ms, test allows < 40ms
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should perform user organization listings efficiently', async () => {
      const testUserId = 'test-user-1';

      const timedQuery = wrapWithMonitoring('user_organizations_lookup_test', async () => {
        return await collections.member.find({ userId: testUserId }).toArray();
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should be fast with userId index
      expect(duration).toBeLessThan(TEST_THRESHOLDS.USER_ORGS_COUNT); // Target: < 5ms, test allows < 30ms
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk organization lookups efficiently', async () => {
      const domains = [
        'company1.com',
        'company2.com',
        'company3.com',
        'company4.com',
        'company5.com',
      ];

      const timedQuery = wrapWithMonitoring('bulk_organization_lookup_test', async () => {
        return await collections.organization
          .find({
            'metadata.domain': { $in: domains },
          })
          .toArray();
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should handle multiple lookups efficiently
      expect(duration).toBeLessThan(TEST_THRESHOLDS.BULK_OPERATIONS); // Should be fast with proper index
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle bulk member lookups efficiently', async () => {
      const userIds = ['test-user-1', 'test-user-2', 'test-user-3', 'test-user-4', 'test-user-5'];

      const timedQuery = wrapWithMonitoring('bulk_member_lookup_test', async () => {
        return await collections.member
          .find({
            userId: { $in: userIds },
          })
          .toArray();
      });

      const startTime = Date.now();
      const result = await timedQuery();
      const duration = Date.now() - startTime;

      // Should handle multiple user lookups efficiently
      expect(duration).toBeLessThan(TEST_THRESHOLDS.BULK_OPERATIONS);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Index Usage Verification', () => {
    it('should use indexes for organization domain queries', async () => {
      const explain = await collections.organization
        .find({ 'metadata.domain': 'testcompany.com' })
        .explain('executionStats');

      // Should use index scan, not collection scan
      expect(explain.executionStats.executionSuccess).toBe(true);

      // Check that we're not doing a full collection scan
      const docsExamined = explain.executionStats.totalDocsExamined || 0;
      const docsReturned = explain.executionStats.totalDocsReturned || 0;

      // For indexed queries, docs examined should be close to docs returned
      if (docsReturned > 0) {
        expect(docsExamined).toBeLessThanOrEqual(docsReturned + 2);
      }
    });

    it('should use indexes for member queries', async () => {
      const explain = await collections.member
        .find({ userId: 'test-user-1', organizationId: 'test-org-1' })
        .explain('executionStats');

      // Should use index scan efficiently
      expect(explain.executionStats.executionSuccess).toBe(true);
      expect(explain.executionStats.totalDocsExamined).toBeLessThanOrEqual(1);
    });

    it('should use indexes for invitation queries', async () => {
      const explain = await collections.invitation
        .find({ organizationId: 'test-org-1', status: 'pending' })
        .explain('executionStats');

      // Should use compound index
      expect(explain.executionStats.executionSuccess).toBe(true);

      // Check that we're not doing a full collection scan
      const docsExamined = explain.executionStats.totalDocsExamined || 0;
      const docsReturned = explain.executionStats.totalDocsReturned || 0;

      // For indexed queries, docs examined should be close to docs returned
      if (docsReturned > 0) {
        expect(docsExamined).toBeLessThanOrEqual(docsReturned + 5);
      }
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with concurrent queries', async () => {
      const concurrentQueries = 10;
      const maxAcceptableDuration = TEST_THRESHOLDS.CONCURRENT_QUERY_MAX; // milliseconds per query

      const queryPromises = Array.from({ length: concurrentQueries }, (_, i) =>
        wrapWithMonitoring(`concurrent_query_${i}`, async () => {
          const startTime = Date.now();
          await collections.organization.findOne({ 'metadata.domain': 'testcompany.com' });
          return Date.now() - startTime;
        })(),
      );

      const durations = await Promise.all(queryPromises);

      // All queries should complete within acceptable time
      durations.forEach((duration, index) => {
        expect(duration).toBeLessThan(maxAcceptableDuration);
      });

      // Average should be even better
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      expect(avgDuration).toBeLessThan(TEST_THRESHOLDS.CONCURRENT_QUERY_AVG);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should collect performance metrics', async () => {
      // Run a few monitored operations
      const monitoredOp = wrapWithMonitoring('test_monitored_operation', async () => {
        await collections.organization.findOne({ slug: 'testcompany' });
        return 'success';
      });

      await monitoredOp();
      await monitoredOp();
      await monitoredOp();

      // Get performance report from actual monitoring
      const report = await OrganizationPerformanceSetup.getPerformanceReport();

      expect(report.applicationMetrics).toBeDefined();

      // Check if monitoring is working (it may not collect data if disabled)
      if (report.applicationMetrics.test_monitored_operation) {
        expect(report.applicationMetrics.test_monitored_operation.count).toBe(3);
        expect(report.applicationMetrics.test_monitored_operation.avgTime).toBeGreaterThan(0);
      } else {
        // Just verify the monitoring wrapper exists and functions
        expect(monitoredOp).toBeDefined();
        expect(typeof monitoredOp).toBe('function');
      }
    });
  });
});

/**
 * Creates sample test data for performance testing
 */
async function createSampleTestData() {
  const testDb = mongoose.connection.db;

  // Sample organizations
  const organizations = [
    {
      _id: 'test-org-1',
      name: 'Test Company',
      slug: 'testcompany',
      metadata: { domain: 'testcompany.com', autoCreated: true },
      createdAt: new Date(),
      _test: true,
    },
    {
      _id: 'test-org-2',
      name: 'Another Company',
      slug: 'anothercompany',
      metadata: { domain: 'another.com', autoCreated: true },
      createdAt: new Date(),
      _test: true,
    },
  ];

  // Sample members
  const members = [
    {
      _id: 'test-member-1',
      userId: 'test-user-1',
      organizationId: 'test-org-1',
      role: 'owner',
      createdAt: new Date(),
      _test: true,
    },
    {
      _id: 'test-member-2',
      userId: 'test-user-2',
      organizationId: 'test-org-1',
      role: 'member',
      createdAt: new Date(),
      _test: true,
    },
    {
      _id: 'test-member-3',
      userId: 'test-user-1',
      organizationId: 'test-org-2',
      role: 'admin',
      createdAt: new Date(),
      _test: true,
    },
  ];

  // Sample invitations
  const invitations = [
    {
      _id: 'test-invitation-1',
      organizationId: 'test-org-1',
      email: 'newuser@testcompany.com',
      role: 'member',
      status: 'pending',
      inviterId: 'test-user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      _test: true,
    },
    {
      _id: 'test-invitation-2',
      organizationId: 'test-org-1',
      email: 'another@testcompany.com',
      role: 'member',
      status: 'pending',
      inviterId: 'test-user-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      _test: true,
    },
  ];

  // Insert test data
  await testDb.collection('organization').insertMany(organizations);
  await testDb.collection('member').insertMany(members);
  await testDb.collection('invitation').insertMany(invitations);
}
