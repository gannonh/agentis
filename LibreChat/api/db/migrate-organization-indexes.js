#!/usr/bin/env node

/**
 * @fileoverview Database migration script for organization indexes
 * @module db/migrate-organization-indexes
 */

import { program } from 'commander';
import {
  createOrganizationIndexes,
  dropOrganizationIndexes,
  PERFORMANCE_TARGETS,
  QUERY_PATTERNS,
} from './organization-indexes.js';
import { analyzeIndexUsage } from './performance-monitor.js';
import logger from '../utils/logger.js';

/**
 * Migration metadata and tracking
 */
const MIGRATION_METADATA = {
  version: '1.0.0',
  name: 'organization-indexes',
  description: 'Create optimized indexes for Better-auth organization collections',
  author: 'Agentis Development Team',
  created: new Date().toISOString(),
  collections: ['organization', 'member', 'invitation'],
  estimatedTime: '2-5 minutes',
  reversible: true,
};

/**
 * Performs pre-migration checks to ensure safety
 * @returns {Promise<boolean>} True if safe to proceed
 */
async function preMigrationChecks() {
  logger.info('🔍 Performing pre-migration safety checks...');

  try {
    // Check database connection
    const analysis = await analyzeIndexUsage();

    // Log current state
    logger.info('📊 Current database state:');
    for (const [collection, stats] of Object.entries(analysis)) {
      logger.info(
        `   ${collection}: ${stats.documentCount} documents (${(stats.totalSize / 1024 / 1024).toFixed(2)} MB)`,
      );
    }

    // Check for existing indexes
    for (const [collection, stats] of Object.entries(analysis)) {
      const existingIndexNames = stats.indexes.map((idx) => idx.name);
      logger.info(`   ${collection} existing indexes: ${existingIndexNames.join(', ')}`);

      // Check for potential conflicts (this is informational)
      const plannedIndexes = [
        'organization_slug_unique',
        'organization_domain_lookup',
        'member_user_org_unique',
        'invitation_expiration_ttl',
      ];
      const conflicts = existingIndexNames.filter((name) => plannedIndexes.includes(name));
      if (conflicts.length > 0) {
        logger.warn(`   ⚠️  Existing indexes will be skipped: ${conflicts.join(', ')}`);
      }
    }

    // Estimate migration time based on data size
    const totalDocs = Object.values(analysis).reduce((sum, stats) => sum + stats.documentCount, 0);
    const estimatedMinutes = Math.max(1, Math.ceil(totalDocs / 10000)); // Rough estimate: 10k docs per minute

    logger.info(
      `⏱️  Estimated migration time: ${estimatedMinutes} minute(s) for ${totalDocs} total documents`,
    );

    if (totalDocs > 100000) {
      logger.warn('⚠️  Large dataset detected. Consider running during maintenance window.');
    }

    return true;
  } catch (error) {
    logger.error('❌ Pre-migration checks failed:', error);
    return false;
  }
}

/**
 * Performs post-migration verification
 * @returns {Promise<boolean>} True if migration was successful
 */
async function postMigrationVerification() {
  logger.info('✅ Performing post-migration verification...');

  try {
    const analysis = await analyzeIndexUsage();

    // Verify expected indexes exist
    const expectedIndexes = {
      organization: [
        'organization_slug_unique',
        'organization_domain_lookup',
        'organization_created_analytics',
      ],
      member: [
        'member_user_org_unique',
        'member_user_lookup',
        'member_org_role_lookup',
        'member_org_lookup',
      ],
      invitation: [
        'invitation_org_status_lookup',
        'invitation_email_status_lookup',
        'invitation_expiration_ttl',
        'invitation_org_lookup',
      ],
    };

    let allIndexesPresent = true;

    for (const [collection, expectedNames] of Object.entries(expectedIndexes)) {
      const existingNames = analysis[collection]?.indexes.map((idx) => idx.name) || [];

      for (const expectedName of expectedNames) {
        if (existingNames.includes(expectedName)) {
          logger.info(`   ✅ ${collection}.${expectedName} - Present`);
        } else {
          logger.error(`   ❌ ${collection}.${expectedName} - Missing`);
          allIndexesPresent = false;
        }
      }
    }

    if (allIndexesPresent) {
      logger.info('🎉 All expected indexes are present and accounted for!');

      // Log performance improvement expectations
      logger.info('📈 Expected performance improvements:');
      logger.info(
        `   • Organization domain lookup: ${PERFORMANCE_TARGETS.organizationLookupByDomain}`,
      );
      logger.info(`   • User membership checks: ${PERFORMANCE_TARGETS.userMembershipCheck}`);
      logger.info(
        `   • Organization member listing: ${PERFORMANCE_TARGETS.organizationMemberList}`,
      );
      logger.info(`   • Invitation management: ${PERFORMANCE_TARGETS.invitationList}`);

      return true;
    } else {
      logger.error('❌ Some indexes are missing. Migration may have failed partially.');
      return false;
    }
  } catch (error) {
    logger.error('❌ Post-migration verification failed:', error);
    return false;
  }
}

/**
 * Runs the migration to create indexes
 */
async function runMigration() {
  logger.info('🚀 Starting organization database optimization migration');
  logger.info(`📋 Migration: ${MIGRATION_METADATA.name} v${MIGRATION_METADATA.version}`);
  logger.info(`📝 Description: ${MIGRATION_METADATA.description}`);

  const startTime = Date.now();

  try {
    // Pre-migration checks
    const checksPass = await preMigrationChecks();
    if (!checksPass) {
      throw new Error('Pre-migration checks failed');
    }

    // Create indexes
    logger.info('🔨 Creating organization indexes...');
    const results = await createOrganizationIndexes();

    // Log results
    logger.info('📊 Migration Results:');
    logger.info(`   ✅ Created: ${results.created.length} indexes`);
    logger.info(`   ⏭️  Skipped: ${results.skipped.length} existing indexes`);
    logger.info(`   ❌ Errors: ${results.errors.length} failed indexes`);

    if (results.created.length > 0) {
      logger.info('📋 Created indexes:');
      results.created.forEach((idx) => {
        logger.info(`   • ${idx.collection}.${idx.name} - ${idx.rationale}`);
      });
    }

    if (results.skipped.length > 0) {
      logger.info('⏭️  Skipped indexes (already exist):');
      results.skipped.forEach((idx) => {
        logger.info(`   • ${idx.collection}.${idx.name}`);
      });
    }

    if (results.errors.length > 0) {
      logger.error('❌ Failed indexes:');
      results.errors.forEach((idx) => {
        logger.error(`   • ${idx.collection}.${idx.name}: ${idx.error}`);
      });
    }

    // Post-migration verification
    const verificationPass = await postMigrationVerification();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (verificationPass && results.errors.length === 0) {
      logger.info(`🎉 Migration completed successfully in ${duration}s`);
      logger.info('💡 Next steps:');
      logger.info(
        '   1. Monitor query performance with: node migrate-organization-indexes.js analyze',
      );
      logger.info('   2. Run performance tests to validate improvements');
      logger.info('   3. Check slow query logs for remaining optimization opportunities');

      process.exit(0);
    } else {
      logger.error(`❌ Migration completed with issues in ${duration}s`);
      process.exit(1);
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`💥 Migration failed after ${duration}s:`, error);

    // Provide rollback instructions
    logger.info('🔄 To rollback this migration, run:');
    logger.info('   node migrate-organization-indexes.js rollback');

    process.exit(1);
  }
}

/**
 * Rolls back the migration by dropping created indexes
 */
async function rollbackMigration() {
  logger.warn('🔄 Rolling back organization database optimization migration');

  const startTime = Date.now();

  try {
    const results = await dropOrganizationIndexes();

    logger.info('📊 Rollback Results:');
    logger.info(`   🗑️  Dropped: ${results.dropped.length} indexes`);
    logger.info(`   ❌ Errors: ${results.errors.length} failed drops`);

    if (results.dropped.length > 0) {
      logger.info('🗑️  Dropped indexes:');
      results.dropped.forEach((idx) => {
        logger.info(`   • ${idx.collection}.${idx.name}`);
      });
    }

    if (results.errors.length > 0) {
      logger.error('❌ Failed to drop indexes:');
      results.errors.forEach((idx) => {
        logger.error(`   • ${idx.collection}.${idx.name}: ${idx.error}`);
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (results.errors.length === 0) {
      logger.info(`✅ Rollback completed successfully in ${duration}s`);
      logger.warn('⚠️  Database performance will return to pre-optimization levels');
      process.exit(0);
    } else {
      logger.error(`❌ Rollback completed with issues in ${duration}s`);
      process.exit(1);
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.error(`💥 Rollback failed after ${duration}s:`, error);
    process.exit(1);
  }
}

/**
 * Analyzes current database state and index usage
 */
async function analyzeDatabaseState() {
  logger.info('📊 Analyzing organization database performance');

  try {
    const analysis = await analyzeIndexUsage();

    console.log('\n📋 DATABASE ANALYSIS REPORT');
    console.log('='.repeat(50));

    for (const [collection, stats] of Object.entries(analysis)) {
      console.log(`\n📁 Collection: ${collection}`);
      console.log(`   📊 Documents: ${stats.documentCount.toLocaleString()}`);
      console.log(`   💾 Total Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   📏 Avg Doc Size: ${stats.avgDocumentSize} bytes`);
      console.log(`   🗂️  Indexes: ${stats.indexes.length}`);

      if (stats.indexes.length > 1) {
        // Skip default _id index
        stats.indexes.forEach((idx) => {
          if (idx.name !== '_id_') {
            const features = [];
            if (idx.unique) features.push('UNIQUE');
            if (idx.sparse) features.push('SPARSE');
            if (idx.ttl) features.push('TTL');

            console.log(
              `      • ${idx.name}: ${JSON.stringify(idx.key)} ${features.length > 0 ? `[${features.join(', ')}]` : ''}`,
            );
          }
        });
      } else {
        console.log('      ⚠️  Only default _id index found - Performance may be suboptimal');
      }
    }

    // Query patterns analysis
    console.log('\n🔍 QUERY PATTERNS ANALYSIS');
    console.log('='.repeat(50));

    console.log('\n🔥 High Frequency Queries (Need Immediate Optimization):');
    QUERY_PATTERNS.highFrequency.forEach((pattern) => {
      console.log(`   • ${pattern.collection}: ${JSON.stringify(pattern.query)}`);
      console.log(`     Description: ${pattern.description}`);
      console.log(`     Current: ${pattern.currentPerformance}`);
      console.log(`     Target: ${pattern.targetPerformance}`);
      console.log('');
    });

    console.log('📊 Medium Frequency Queries:');
    QUERY_PATTERNS.mediumFrequency.forEach((pattern) => {
      console.log(
        `   • ${pattern.collection}: ${JSON.stringify(pattern.query)} - ${pattern.description}`,
      );
    });

    // Performance targets
    console.log('\n🎯 PERFORMANCE TARGETS');
    console.log('='.repeat(50));
    Object.entries(PERFORMANCE_TARGETS).forEach(([metric, target]) => {
      if (typeof target === 'string') {
        console.log(`   ${metric}: ${target}`);
      } else {
        console.log(`   ${metric}: ${target.toLocaleString()}`);
      }
    });

    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(50));

    // Check if indexes are missing
    const totalDocs = Object.values(analysis).reduce((sum, stats) => sum + stats.documentCount, 0);
    const totalIndexes = Object.values(analysis).reduce(
      (sum, stats) => sum + stats.indexes.length - 1,
      0,
    ); // Exclude _id indexes

    if (totalIndexes < 10) {
      console.log('   🚨 CRITICAL: Missing organization indexes detected!');
      console.log('   📝 Run migration: node migrate-organization-indexes.js migrate');
    } else {
      console.log('   ✅ Organization indexes appear to be in place');
    }

    if (totalDocs > 10000) {
      console.log('   📈 Large dataset detected - monitor query performance closely');
    }

    console.log('   📊 Use MongoDB Compass or explain() to analyze query execution plans');
    console.log('   ⏱️  Enable slow query logging for queries > 100ms');
  } catch (error) {
    logger.error('❌ Database analysis failed:', error);
    process.exit(1);
  }
}

/**
 * Shows migration information
 */
function showMigrationInfo() {
  console.log('\n📋 ORGANIZATION DATABASE OPTIMIZATION MIGRATION');
  console.log('='.repeat(50));
  console.log(`Version: ${MIGRATION_METADATA.version}`);
  console.log(`Name: ${MIGRATION_METADATA.name}`);
  console.log(`Description: ${MIGRATION_METADATA.description}`);
  console.log(`Author: ${MIGRATION_METADATA.author}`);
  console.log(`Collections: ${MIGRATION_METADATA.collections.join(', ')}`);
  console.log(`Estimated Time: ${MIGRATION_METADATA.estimatedTime}`);
  console.log(`Reversible: ${MIGRATION_METADATA.reversible ? 'Yes' : 'No'}`);

  console.log('\n🎯 This migration will create the following optimizations:');
  console.log('   • Unique slug constraint for organizations');
  console.log('   • Fast domain-based organization lookup');
  console.log('   • Optimized user membership queries');
  console.log('   • Compound indexes for permission checks');
  console.log('   • TTL cleanup for expired invitations');
  console.log('   • Admin/owner role lookups for invitations');

  console.log('\n⚠️  Important Notes:');
  console.log('   • Run during low-traffic periods for large datasets');
  console.log('   • Migration is reversible with rollback command');
  console.log('   • Existing data will not be affected');
  console.log('   • Only indexes will be created/modified');
}

// CLI setup
program
  .name('migrate-organization-indexes')
  .description('Database migration tool for organization performance optimization')
  .version(MIGRATION_METADATA.version);

program
  .command('migrate')
  .description('Run the migration to create organization indexes')
  .action(runMigration);

program
  .command('rollback')
  .description('Rollback the migration by dropping created indexes')
  .action(rollbackMigration);

program
  .command('analyze')
  .description('Analyze current database state and performance')
  .action(analyzeDatabaseState);

program.command('info').description('Show migration information').action(showMigrationInfo);

// Default to showing help
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
