# Database Performance Testing Guide

This guide explains how to test the organization database optimization features with a clean, organized test structure.

## Test Organization

The testing system uses clear file naming conventions and directory structure:

### File Naming Conventions

```
Legacy Jest Unit tests (excluded until migrated):
- *.spec.js
- *.test.js

New Vitest Unit tests:
- [dir]/__tests__/[test].vitest.js

New Vitest Integration tests:
- [dir]/__tests__/integration/[test].integration.vitest.js
```

### Directory Structure

Integration tests are co-located with unit tests in dedicated subdirectories:

```
api/db/__tests__/
├── [unit-tests].vitest.js           # Unit tests (if any)
└── integration/                     # Integration tests directory
    └── performance.integration.vitest.js  # Database performance tests
```

## Running Tests

### Unit Tests (Default)
- **Command**: `npm run test:api`
- **Files**: Runs all `*.vitest.js` files (excludes `*.integration.vitest.js`)
- **Database**: Uses dummy database (fast, no real database needed)
- **Purpose**: Fast CI/CD compatible tests

```bash
# Run unit tests only
npm run test:api
```

### Integration Tests
- **Command**: `npm run test:api:integration`
- **Files**: Runs only `*.integration.vitest.js` files
- **Database**: Uses real MongoDB with separate `AgentisTest` database
- **Purpose**: Test actual database performance, indexes, and query optimization

```bash
# Run integration tests only
npm run test:api:integration
```

## Configuration

The test system uses a single configuration file `test/vitestSetup.js`:

### How It Works

1. **Environment Detection**: Checks `TEST_MODE` environment variable
2. **Automatic Configuration**: Sets appropriate database URI and credentials
3. **Clear Separation**: Unit tests always use dummy data, integration tests use real database

### Integration Test Environment

When `TEST_MODE=integration`, the setup automatically configures:
- Real MongoDB: `mongodb://admin:password@localhost:27017/AgentisTest?authSource=admin`
- Proper JWT secrets and encryption keys
- Separate test database for isolation

### Unit Test Environment

When `TEST_MODE` is not set or not `integration`, the setup configures:
- Dummy MongoDB URI (no real connection)
- Dummy secrets and keys
- Fast, isolated testing

## Prerequisites for Integration Tests

1. **Start MongoDB**:
   ```bash
   # From project root
   docker-compose -f docker-compose.dev.yml up mongodb
   ```

2. **Run integration tests**:
   ```bash
   npm run test:api:integration
   ```

## Database Migration

To create the optimized indexes on your database:

```bash
# View current database state
cd api && node db/migrate-organization-indexes.js info

# Create indexes (safe operation)
cd api && node db/migrate-organization-indexes.js migrate

# Analyze performance impact
cd api && node db/migrate-organization-indexes.js analyze

# Rollback if needed
cd api && node db/migrate-organization-indexes.js rollback
```

## Performance Targets

Integration tests validate these performance goals:

- **Organization domain lookup**: < 50ms (target: < 10ms)
- **User membership check**: < 20ms (target: < 2ms)  
- **Organization slug lookup**: < 30ms (target: < 5ms)
- **User organization list**: < 30ms (target: < 5ms)
- **Bulk operations**: < 100ms
- **Concurrent queries**: < 200ms per query

*Note: Test thresholds include buffer for CI environment variability*

## Troubleshooting

### Integration Tests Not Running

Check that you're using the correct command:
```bash
# Correct command for integration tests
npm run test:api:integration

# This will NOT run integration tests
npm run test:api
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker ps | grep mongodb

# Test connection manually
mongosh "mongodb://admin:password@localhost:27017/AgentisTest?authSource=admin"

# Check test configuration
cd api && TEST_MODE=integration node -e "console.log('MONGO_URI:', process.env.MONGO_URI)"
```

### Performance Tests Failing

1. **Create indexes first**:
   ```bash
   cd api && node db/migrate-organization-indexes.js migrate
   ```

2. **Check index usage**:
   ```bash
   cd api && node db/migrate-organization-indexes.js analyze
   ```

3. **Run with verbose output**:
   ```bash
   npm run test:api:integration -- --reporter=verbose
   ```

## Adding New Tests

### Unit Tests
Create files following the pattern: `[dir]/__tests__/[test].vitest.js`

### Integration Tests
1. Create integration directory if it doesn't exist: `[dir]/__tests__/integration/`
2. Create test file: `[dir]/__tests__/integration/[test].integration.vitest.js`
3. No conditional logic needed - tests run based on filename pattern

Example integration test:
```javascript
// api/someFeature/__tests__/integration/database.integration.vitest.js
import { describe, it, expect } from 'vitest';

describe('Database Integration Tests', () => {
  it('should perform real database operations', async () => {
    // Test real database operations here
    // Environment is automatically configured by vitestSetup.js
  });
});
```

## Architecture Benefits

✅ **Clear separation**: Unit vs integration tests are obvious from file structure
✅ **Co-located organization**: Integration tests near related unit tests  
✅ **Simple commands**: Easy to run exactly what you need
✅ **No conditional logic**: Tests run based on filename patterns
✅ **Single configuration**: All environment setup in one place
✅ **Scalable**: Easy to add new integration tests anywhere

## Files Overview

- `test/vitestSetup.js` - Single test configuration file
- `db/__tests__/integration/performance.integration.vitest.js` - Database performance tests
- `migrate-organization-indexes.js` - CLI migration tool  
- `performance-monitor.js` - Query performance monitoring
- `organization-indexes.js` - Index strategy and creation functions