# Organization Database Optimization & Indexes

This directory contains database optimization tools and index management for Better-auth organization collections.

## Overview

The organization system in Agentis uses Better-auth for multi-tenant functionality with MongoDB collections for organizations, members, and invitations. This optimization package provides:

- **Index Strategy**: Comprehensive indexes for high-frequency organization queries
- **Performance Monitoring**: Query performance tracking and slow query analysis
- **Migration Tools**: Safe database index creation and rollback capabilities
- **Performance Testing**: Automated tests to validate query optimization

## Quick Start

```bash
# View migration information
node migrate-organization-indexes.js info

# Create database indexes (production-ready)
node migrate-organization-indexes.js migrate

# Analyze current database performance
node migrate-organization-indexes.js analyze

# Rollback indexes if needed
node migrate-organization-indexes.js rollback
```

## Performance Targets

The optimization strategy targets these performance goals:

| Operation | Target | Current |
|-----------|--------|---------|
| Organization domain lookup | < 10ms | O(n) scan |
| User membership check | < 2ms | O(n) scan |
| Organization slug lookup | < 5ms | O(n) scan |
| User organization list | < 5ms | O(n) scan |
| Organization member list | < 10ms | O(n) scan |
| Invitation management | < 10ms | O(n) scan |

## Index Strategy

### Organization Collection

```javascript
// Unique constraint for organization slugs
{ slug: 1 } // unique: true

// Fast domain-based organization discovery
{ 'metadata.domain': 1 } // sparse: true

// Analytics and date sorting
{ createdAt: 1 }
```

### Member Collection

```javascript
// CRITICAL: Prevent duplicate memberships + fast permission checks
{ userId: 1, organizationId: 1 } // unique: true

// List user's organizations
{ userId: 1 }

// Find organization admins/owners
{ organizationId: 1, role: 1 }

// List organization members
{ organizationId: 1 }
```

### Invitation Collection

```javascript
// Filter invitations by organization and status
{ organizationId: 1, status: 1 }

// Prevent duplicate invitations by email
{ email: 1, status: 1 }

// Automatic expiration cleanup
{ expiresAt: 1 } // TTL index

// List organization invitations
{ organizationId: 1 }
```

## Migration Process

The migration system provides safe, reversible database optimization:

### Pre-Migration Checks
- Database connection validation
- Current index analysis
- Data size estimation
- Conflict detection

### Migration Execution
- Background index creation
- Error handling and rollback
- Progress monitoring
- Performance validation

### Post-Migration Verification
- Index existence validation
- Query performance testing
- Performance target verification

## Performance Monitoring

### Application-Level Monitoring

```javascript
import { wrapWithMonitoring } from './performance-monitor.js';

// Wrap operations with performance tracking
const monitoredOperation = wrapWithMonitoring(
  'organization_lookup',
  async () => {
    return await findOrganization(criteria);
  }
);
```

### MongoDB Profiling

```javascript
import { mongoProfiler } from './performance-monitor.js';

// Enable slow query profiling
await mongoProfiler.enableProfiling(100); // queries > 100ms

// Analyze slow queries
const analysis = await mongoProfiler.analyzeOrganizationSlowQueries();
```

### Performance Reporting

```javascript
import { OrganizationPerformanceSetup } from './performance-monitor.js';

// Initialize monitoring
await OrganizationPerformanceSetup.initialize({
  slowQueryThreshold: 100,
  enableMongoProfiling: true
});

// Get comprehensive report
const report = await OrganizationPerformanceSetup.getPerformanceReport();
```

## Query Pattern Analysis

### High Frequency Queries (Critical)

1. **Organization Domain Lookup**
   - Query: `{ 'metadata.domain': 'company.com' }`
   - Frequency: Every user login/registration
   - Index: `organization_domain_lookup`

2. **User Membership Check**
   - Query: `{ userId: 'user123', organizationId: 'org456' }`
   - Frequency: Every permission check, every API request
   - Index: `member_user_org_unique`

3. **Organization Slug Lookup**
   - Query: `{ slug: 'company-slug' }`
   - Frequency: Organization creation with collision handling
   - Index: `organization_slug_unique`

### Medium Frequency Queries

1. **Invitation Management**
   - Query: `{ organizationId: 'org123', status: 'pending' }`
   - Frequency: Admin dashboard, invitation management
   - Index: `invitation_org_status_lookup`

2. **User Organization List**
   - Query: `{ userId: 'user123' }`
   - Frequency: Session initialization, dashboard loading
   - Index: `member_user_lookup`

## Scalability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Organizations | 10,000 | Small-medium enterprises |
| Users | 100,000 | Concurrent active users |
| Memberships | 1,000,000 | Average 10 users per org |
| Invitations | 100,000 | Active + expired invitations |
| Concurrent Logins | 1,000 | Peak login performance |
| Permission Checks | 5,000/sec | High API throughput |

## Maintenance Procedures

### Regular Monitoring
```bash
# Weekly performance check
node migrate-organization-indexes.js analyze

# Monthly slow query analysis
node -e "
import('./performance-monitor.js').then(async ({ mongoProfiler }) => {
  const analysis = await mongoProfiler.analyzeOrganizationSlowQueries();
  console.log(JSON.stringify(analysis, null, 2));
});
"
```

### Index Maintenance
```bash
# Check index usage statistics
db.organization.aggregate([{ $indexStats: {} }])
db.member.aggregate([{ $indexStats: {} }])
db.invitation.aggregate([{ $indexStats: {} }])

# Rebuild indexes if needed (maintenance window)
db.organization.reIndex()
db.member.reIndex()
db.invitation.reIndex()
```

### Performance Regression Detection
```javascript
// Set up automated performance alerts
const thresholds = {
  organizationLookup: 50, // ms
  membershipCheck: 10,    // ms
  invitationList: 100     // ms
};

// Monitor and alert on threshold breaches
```

## Testing

### Performance Tests
```bash
# Run performance validation
npx vitest run db/__tests__/performance-tests.vitest.js

# Test specific query patterns
npm test -- --grep "organization domain lookup"
```

### Load Testing
```bash
# Simulate concurrent operations
node scripts/load-test-organizations.js --concurrent=100 --duration=60s
```

## Security Considerations

- **Index Background Creation**: All indexes use `background: true` for production safety
- **TTL Cleanup**: Automatic invitation expiration prevents data accumulation
- **Unique Constraints**: Prevent data integrity issues (duplicate memberships, org slugs)
- **Query Validation**: All queries are validated against expected index usage

## Troubleshooting

### Common Issues

**Slow Query Performance**
```bash
# Check if indexes are being used
db.organization.find({'metadata.domain': 'test.com'}).explain('executionStats')

# Look for COLLSCAN (bad) vs IXSCAN (good)
```

**Index Creation Failures**
```bash
# Check for conflicting data
db.organization.aggregate([
  { $group: { _id: '$slug', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])
```

**Memory Issues During Migration**
```bash
# Monitor during index creation
db.runCommand({ currentOp: true, $all: true })

# Check index build progress
db.runCommand({ currentOp: true, 'command.createIndexes': { $exists: true } })
```

## Files

- `organization-indexes.js` - Index strategy and creation functions
- `migrate-organization-indexes.js` - CLI migration tool
- `performance-monitor.js` - Query performance monitoring
- `__tests__/performance-tests.vitest.js` - Performance validation tests

## Version History

- **v1.0.0** - Initial organization index optimization strategy
  - Organization domain and slug indexes
  - Member permission and lookup indexes  
  - Invitation management and TTL indexes
  - Performance monitoring framework