/**
 * @fileoverview Query performance monitoring for organization operations
 * @module db/performance-monitor
 */

import { logger } from '#config/index.js';
import mongoose from 'mongoose';

/**
 * Performance monitoring middleware for Better-auth organization queries
 */
class OrganizationPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.slowQueryThreshold = 100; // milliseconds
    // Enable monitoring in integration tests
    this.enabled = process.env.NODE_ENV !== 'test' || process.env.TEST_MODE === 'integration';
  }

  /**
   * Wraps a function with performance monitoring
   * @param {string} operationName - Name of the operation being monitored
   * @param {Function} operation - The operation to monitor
   * @param {Object} context - Additional context for logging
   * @returns {Function} Wrapped operation with monitoring
   */
  monitor(operationName, operation, context = {}) {
    if (!this.enabled) {
      return operation;
    }

    return async (...args) => {
      const startTime = process.hrtime.bigint();
      const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        logger.debug(`🚀 [${operationId}] Starting ${operationName}`, context);

        const result = await operation(...args);

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        // Record metrics
        this.recordMetric(operationName, durationMs, true, context);

        // Log performance
        if (durationMs > this.slowQueryThreshold) {
          logger.warn(
            `🐌 [${operationId}] SLOW QUERY ${operationName}: ${durationMs.toFixed(2)}ms`,
            {
              operation: operationName,
              duration: durationMs,
              context,
              threshold: this.slowQueryThreshold,
            },
          );
        } else {
          logger.debug(
            `✅ [${operationId}] Completed ${operationName}: ${durationMs.toFixed(2)}ms`,
            {
              operation: operationName,
              duration: durationMs,
              context,
            },
          );
        }

        return result;
      } catch (error) {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000;

        // Record failed metric
        this.recordMetric(operationName, durationMs, false, context);

        logger.error(`❌ [${operationId}] Failed ${operationName}: ${durationMs.toFixed(2)}ms`, {
          operation: operationName,
          duration: durationMs,
          context,
          error: error.message,
        });

        throw error;
      }
    };
  }

  /**
   * Records performance metrics for analysis
   * @param {string} operationName - Name of the operation
   * @param {number} durationMs - Duration in milliseconds
   * @param {boolean} success - Whether the operation succeeded
   * @param {Object} context - Additional context
   */
  recordMetric(operationName, durationMs, success, context) {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        successCount: 0,
        errorCount: 0,
        slowQueryCount: 0,
      });
    }

    const metric = this.metrics.get(operationName);
    metric.count++;
    metric.totalTime += durationMs;
    metric.minTime = Math.min(metric.minTime, durationMs);
    metric.maxTime = Math.max(metric.maxTime, durationMs);
    metric.avgTime = metric.totalTime / metric.count;

    if (success) {
      metric.successCount++;
    } else {
      metric.errorCount++;
    }

    if (durationMs > this.slowQueryThreshold) {
      metric.slowQueryCount++;
    }
  }

  /**
   * Gets performance metrics for all monitored operations
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const metrics = {};

    for (const [operationName, metric] of this.metrics.entries()) {
      metrics[operationName] = {
        ...metric,
        successRate: ((metric.successCount / metric.count) * 100).toFixed(2) + '%',
        slowQueryRate: ((metric.slowQueryCount / metric.count) * 100).toFixed(2) + '%',
      };
    }

    return metrics;
  }

  /**
   * Resets all collected metrics
   */
  resetMetrics() {
    this.metrics.clear();
    logger.info('🔄 Performance metrics reset');
  }

  /**
   * Sets the slow query threshold
   * @param {number} thresholdMs - Threshold in milliseconds
   */
  setSlowQueryThreshold(thresholdMs) {
    this.slowQueryThreshold = thresholdMs;
    logger.info(`⚡ Slow query threshold set to ${thresholdMs}ms`);
  }

  /**
   * Logs a performance summary
   */
  logPerformanceSummary() {
    const metrics = this.getMetrics();

    logger.info('📊 ORGANIZATION PERFORMANCE SUMMARY');
    logger.info('='.repeat(50));

    if (Object.keys(metrics).length === 0) {
      logger.info('No performance data collected yet');
      return;
    }

    for (const [operationName, metric] of Object.entries(metrics)) {
      logger.info(`📈 ${operationName}:`);
      logger.info(`   Calls: ${metric.count} | Success Rate: ${metric.successRate}`);
      logger.info(
        `   Avg: ${metric.avgTime.toFixed(2)}ms | Min: ${metric.minTime.toFixed(2)}ms | Max: ${metric.maxTime.toFixed(2)}ms`,
      );
      logger.info(`   Slow Queries: ${metric.slowQueryCount} (${metric.slowQueryRate})`);
    }
  }
}

// Global instance
const performanceMonitor = new OrganizationPerformanceMonitor();

/**
 * Decorator for monitoring organization service methods
 * @param {string} operationName - Name of the operation
 * @param {Object} context - Additional context
 * @returns {Function} Method decorator
 */
export function monitorPerformance(operationName, context = {}) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = performanceMonitor.monitor(operationName, originalMethod, context);

    return descriptor;
  };
}

/**
 * Wraps a function with performance monitoring
 * @param {string} operationName - Name of the operation
 * @param {Function} operation - The operation to monitor
 * @param {Object} context - Additional context
 * @returns {Function} Wrapped operation
 */
export function wrapWithMonitoring(operationName, operation, context = {}) {
  return performanceMonitor.monitor(operationName, operation, context);
}

/**
 * MongoDB slow query profiler setup
 */
export class MongoPerformanceProfiler {
  constructor() {
    this.enabled = false;
  }

  /**
   * Enables MongoDB profiling for slow queries
   * @param {number} slowMs - Slow query threshold in milliseconds (default: 100)
   */
  async enableProfiling(slowMs = 100) {
    try {
      const db = mongoose.connection.db;

      // Set profiling level to 1 (slow operations only)
      await db.command({
        profile: 1,
        slowms: slowMs,
        sampleRate: 1.0, // Profile all slow operations
      });

      this.enabled = true;
      logger.info(`🔍 MongoDB profiling enabled for queries > ${slowMs}ms`);

      // Create index on system.profile for better query performance
      try {
        await db.collection('system.profile').createIndex({ ts: 1 });
        logger.debug('📂 Created index on system.profile collection');
      } catch (indexError) {
        // Index might already exist, which is fine
        logger.debug('📂 Index on system.profile already exists or creation failed');
      }
    } catch (error) {
      logger.error('❌ Failed to enable MongoDB profiling:', error);
      throw error;
    }
  }

  /**
   * Disables MongoDB profiling
   */
  async disableProfiling() {
    try {
      const db = mongoose.connection.db;

      // Set profiling level to 0 (off)
      await db.command({ profile: 0 });

      this.enabled = false;
      logger.info('🔍 MongoDB profiling disabled');
    } catch (error) {
      logger.error('❌ Failed to disable MongoDB profiling:', error);
      throw error;
    }
  }

  /**
   * Gets slow query profile data
   * @param {number} limit - Maximum number of records to return
   * @returns {Promise<Array>} Slow query profile data
   */
  async getSlowQueries(limit = 100) {
    try {
      const db = mongoose.connection.db;

      const slowQueries = await db
        .collection('system.profile')
        .find({})
        .sort({ ts: -1 })
        .limit(limit)
        .toArray();

      return slowQueries.map((query) => ({
        timestamp: query.ts,
        operation: query.op,
        collection: query.ns,
        duration: query.millis,
        command: query.command,
        executionStats: query.execStats,
      }));
    } catch (error) {
      logger.error('❌ Failed to get slow queries:', error);
      throw error;
    }
  }

  /**
   * Analyzes slow queries for organization collections
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeOrganizationSlowQueries() {
    try {
      const slowQueries = await this.getSlowQueries(1000);

      // Filter for organization-related collections
      const orgCollections = ['organization', 'member', 'invitation'];
      const orgSlowQueries = slowQueries.filter((query) =>
        orgCollections.some((col) => query.collection?.includes(col)),
      );

      // Group by collection and operation
      const analysis = {
        totalSlowQueries: orgSlowQueries.length,
        byCollection: {},
        byOperation: {},
        slowestQueries: orgSlowQueries.sort((a, b) => b.duration - a.duration).slice(0, 10),
      };

      orgSlowQueries.forEach((query) => {
        const collection = query.collection?.split('.').pop();
        const operation = query.operation;

        if (collection) {
          if (!analysis.byCollection[collection]) {
            analysis.byCollection[collection] = { count: 0, totalTime: 0, avgTime: 0 };
          }
          analysis.byCollection[collection].count++;
          analysis.byCollection[collection].totalTime += query.duration;
          analysis.byCollection[collection].avgTime =
            analysis.byCollection[collection].totalTime / analysis.byCollection[collection].count;
        }

        if (!analysis.byOperation[operation]) {
          analysis.byOperation[operation] = { count: 0, totalTime: 0, avgTime: 0 };
        }
        analysis.byOperation[operation].count++;
        analysis.byOperation[operation].totalTime += query.duration;
        analysis.byOperation[operation].avgTime =
          analysis.byOperation[operation].totalTime / analysis.byOperation[operation].count;
      });

      return analysis;
    } catch (error) {
      logger.error('❌ Failed to analyze slow queries:', error);
      throw error;
    }
  }

  /**
   * Clears the profiling collection
   */
  async clearProfile() {
    try {
      const db = mongoose.connection.db;
      await db.collection('system.profile').deleteMany({});
      logger.info('🧹 Cleared MongoDB profiling data');
    } catch (error) {
      logger.error('❌ Failed to clear profiling data:', error);
      throw error;
    }
  }
}

// Global profiler instance
const mongoProfiler = new MongoPerformanceProfiler();

/**
 * Comprehensive performance monitoring setup for organization operations
 */
export class OrganizationPerformanceSetup {
  // Store interval ID for cleanup
  static reportingIntervalId = null;
  /**
   * Initializes performance monitoring for organization operations
   * @param {Object} options - Configuration options
   */
  static async initialize(options = {}) {
    const {
      slowQueryThreshold = 100,
      enableMongoProfiling = true,
      mongoSlowThreshold = 100,
    } = options;

    logger.info('🚀 Initializing organization performance monitoring');

    // Configure application-level monitoring
    performanceMonitor.setSlowQueryThreshold(slowQueryThreshold);

    // Enable MongoDB profiling
    if (enableMongoProfiling) {
      try {
        await mongoProfiler.enableProfiling(mongoSlowThreshold);
      } catch (error) {
        logger.warn('⚠️  MongoDB profiling setup failed - continuing without it:', error.message);
      }
    }

    // Set up periodic reporting
    if (process.env.NODE_ENV !== 'test') {
      // Clear any existing interval before setting a new one
      if (this.reportingIntervalId) {
        clearInterval(this.reportingIntervalId);
      }

      this.reportingIntervalId = setInterval(() => {
        performanceMonitor.logPerformanceSummary();
      }, 300000); // Every 5 minutes
    }

    logger.info('✅ Organization performance monitoring initialized');
  }

  /**
   * Gets comprehensive performance report
   * @returns {Promise<Object>} Performance report
   */
  static async getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      applicationMetrics: performanceMonitor.getMetrics(),
      mongoSlowQueries: null,
      mongoAnalysis: null,
    };

    try {
      if (mongoProfiler.enabled) {
        report.mongoSlowQueries = await mongoProfiler.getSlowQueries(50);
        report.mongoAnalysis = await mongoProfiler.analyzeOrganizationSlowQueries();
      }
    } catch (error) {
      logger.warn('⚠️  Failed to get MongoDB performance data:', error.message);
    }

    return report;
  }

  /**
   * Logs a comprehensive performance report
   */
  static async logPerformanceReport() {
    try {
      const report = await this.getPerformanceReport();

      logger.info('📊 COMPREHENSIVE PERFORMANCE REPORT');
      logger.info('='.repeat(60));
      logger.info(`📅 Generated: ${report.timestamp}`);

      // Application metrics
      logger.info('\n🚀 APPLICATION METRICS:');
      if (Object.keys(report.applicationMetrics).length > 0) {
        for (const [operation, metrics] of Object.entries(report.applicationMetrics)) {
          logger.info(
            `   ${operation}: ${metrics.count} calls, ${metrics.avgTime.toFixed(2)}ms avg, ${metrics.successRate} success`,
          );
        }
      } else {
        logger.info('   No application metrics collected');
      }

      // MongoDB analysis
      if (report.mongoAnalysis) {
        logger.info('\n🔍 MONGODB SLOW QUERY ANALYSIS:');
        logger.info(`   Total slow queries: ${report.mongoAnalysis.totalSlowQueries}`);

        if (Object.keys(report.mongoAnalysis.byCollection).length > 0) {
          logger.info('   By collection:');
          for (const [collection, stats] of Object.entries(report.mongoAnalysis.byCollection)) {
            logger.info(
              `     ${collection}: ${stats.count} queries, ${stats.avgTime.toFixed(2)}ms avg`,
            );
          }
        }

        if (report.mongoAnalysis.slowestQueries.length > 0) {
          logger.info('   Slowest queries:');
          report.mongoAnalysis.slowestQueries.slice(0, 3).forEach((query, index) => {
            logger.info(
              `     ${index + 1}. ${query.operation} on ${query.collection}: ${query.duration}ms`,
            );
          });
        }
      }
    } catch (error) {
      logger.error('❌ Failed to generate performance report:', error);
    }
  }

  /**
   * Cleanup method to stop periodic reporting and free resources
   */
  static cleanup() {
    if (this.reportingIntervalId) {
      clearInterval(this.reportingIntervalId);
      this.reportingIntervalId = null;
      logger.info('🧹 Performance monitoring cleanup completed');
    }
  }
}

export { performanceMonitor, mongoProfiler };
