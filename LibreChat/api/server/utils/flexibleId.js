/**
 * @fileoverview Flexible ID utilities for handling both Better Auth string IDs and MongoDB ObjectIds
 * @module server/utils/flexibleId
 *
 * This module provides utilities to handle the dual ID format system in Agentis,
 * supporting both Better Auth string IDs and MongoDB ObjectIds transparently.
 */

import mongoose from 'mongoose';
import { logger } from '#config/index.js';

/**
 * Performs a findOne operation that works with both string IDs and ObjectIds
 * @param {Object} collection - MongoDB collection object
 * @param {string} id - The ID to search for (string or ObjectId string)
 * @param {string} [idField='id'] - The field name for string IDs (default: 'id')
 * @param {Object} [additionalQuery={}] - Additional query conditions
 * @returns {Promise<Object|null>} The found document or null
 */
export async function flexibleFindOne(collection, id, idField = 'id', additionalQuery = {}) {
  const startTime = Date.now();

  try {
    // Try Better Auth string ID first
    let document = await collection.findOne({
      [idField]: id,
      ...additionalQuery,
    });

    if (document) {
      logIdOperation('findOne', collection.collectionName, id, 'string', startTime);
      return document;
    }

    // Fallback to MongoDB ObjectId if valid
    if (mongoose.Types.ObjectId.isValid(id)) {
      document = await collection.findOne({
        _id: new mongoose.Types.ObjectId(id),
        ...additionalQuery,
      });

      if (document) {
        logIdOperation('findOne', collection.collectionName, id, 'objectId', startTime);
        return document;
      }
    }

    logIdOperation('findOne', collection.collectionName, id, 'notFound', startTime);
    return null;
  } catch (error) {
    logger.error('Flexible findOne error', {
      collection: collection.collectionName,
      id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Performs an updateOne operation that works with both string IDs and ObjectIds
 * @param {Object} collection - MongoDB collection object
 * @param {string} id - The ID to update (string or ObjectId string)
 * @param {Object} update - The update operation
 * @param {string} [idField='id'] - The field name for string IDs (default: 'id')
 * @param {Object} [options={}] - MongoDB update options
 * @returns {Promise<Object>} MongoDB update result
 */
export async function flexibleUpdateOne(collection, id, update, idField = 'id', options = {}) {
  const startTime = Date.now();

  try {
    // Try string ID first
    let result = await collection.updateOne({ [idField]: id }, update, options);

    if (result.matchedCount > 0) {
      logIdOperation('updateOne', collection.collectionName, id, 'string', startTime);
      return result;
    }

    // Fallback to ObjectId if valid and no match
    if (mongoose.Types.ObjectId.isValid(id)) {
      result = await collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        update,
        options,
      );

      if (result.matchedCount > 0) {
        logIdOperation('updateOne', collection.collectionName, id, 'objectId', startTime);
        return result;
      }
    }

    logIdOperation('updateOne', collection.collectionName, id, 'notFound', startTime);
    return result;
  } catch (error) {
    logger.error('Flexible updateOne error', {
      collection: collection.collectionName,
      id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Builds a MongoDB query that matches either string ID or ObjectId
 * @param {string} id - The ID to match
 * @param {string} [idField='id'] - The field name for string IDs
 * @returns {Object} MongoDB query object with $or condition
 */
export function buildFlexibleIdQuery(id, idField = 'id') {
  const conditions = [{ [idField]: id }];

  if (mongoose.Types.ObjectId.isValid(id)) {
    conditions.push({ _id: new mongoose.Types.ObjectId(id) });
  }

  return conditions.length > 1 ? { $or: conditions } : conditions[0];
}

/**
 * Gets all possible ID variants for a given ID value
 * @param {string} id - The ID to get variants for
 * @returns {Array} Array of ID variants [original, ObjectId if valid]
 */
export function getIdVariants(id) {
  const variants = [id];

  if (mongoose.Types.ObjectId.isValid(id)) {
    try {
      variants.push(new mongoose.Types.ObjectId(id));
    } catch (error) {
      // Invalid ObjectId format, just use string
    }
  }

  return variants;
}

/**
 * Finds a membership record with flexible ID handling for both user and organization IDs
 * @param {Object} db - MongoDB database connection
 * @param {string} userId - User ID (string or ObjectId string)
 * @param {string} organizationId - Organization ID (string or ObjectId string)
 * @param {Object} [additionalQuery={}] - Additional query conditions (e.g., role filter)
 * @returns {Promise<Object|null>} The membership document or null
 */
export async function findMembershipFlexible(db, userId, organizationId, additionalQuery = {}) {
  const memberCollection = db.collection('member');
  const startTime = Date.now();

  try {
    // Build flexible query for all ID combinations
    const queries = [];
    const userIdVariants = getIdVariants(userId);
    const orgIdVariants = getIdVariants(organizationId);

    for (const uid of userIdVariants) {
      for (const oid of orgIdVariants) {
        queries.push({
          userId: uid,
          organizationId: oid,
          ...additionalQuery,
        });
      }
    }

    const membership = await memberCollection.findOne({ $or: queries });

    if (membership) {
      logger.debug('Flexible membership lookup succeeded', {
        userId,
        organizationId,
        queryCount: queries.length,
        duration: Date.now() - startTime,
      });
    }

    return membership;
  } catch (error) {
    logger.error('Flexible membership lookup error', {
      userId,
      organizationId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Normalizes an ID to ObjectId format if valid, otherwise returns original
 * @param {string|ObjectId} id - The ID to normalize
 * @returns {string|ObjectId} Normalized ID
 */
export function normalizeId(id) {
  if (mongoose.Types.ObjectId.isValid(id) && typeof id === 'string') {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch (error) {
      // Return original if conversion fails
    }
  }
  return id;
}

/**
 * Checks if two IDs are equivalent (handles string vs ObjectId comparison)
 * @param {string|ObjectId} id1 - First ID
 * @param {string|ObjectId} id2 - Second ID
 * @returns {boolean} True if IDs are equivalent
 */
export function areIdsEqual(id1, id2) {
  // Direct comparison
  if (id1 === id2) return true;

  // Convert to strings and compare
  const str1 = id1?.toString?.() || id1;
  const str2 = id2?.toString?.() || id2;

  return str1 === str2;
}

/**
 * Logs ID operation details for debugging and monitoring
 * @private
 */
function logIdOperation(operation, collection, id, result, startTime) {
  const duration = Date.now() - startTime;

  // Only log in debug mode or for slow operations
  if (logger.level === 'debug' || duration > 100) {
    logger.debug(`Flexible ID ${operation}`, {
      collection,
      id,
      result,
      duration,
      idType: mongoose.Types.ObjectId.isValid(id) ? 'objectId-compatible' : 'string-only',
    });
  }
}

/**
 * Export all utilities
 */
export default {
  flexibleFindOne,
  flexibleUpdateOne,
  buildFlexibleIdQuery,
  getIdVariants,
  findMembershipFlexible,
  normalizeId,
  areIdsEqual,
};
