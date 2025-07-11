/**
 * @fileoverview Tests for flexible ID utilities
 * @module server/utils/__tests__/flexibleId.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  flexibleFindOne,
  flexibleUpdateOne,
  buildFlexibleIdQuery,
  getIdVariants,
  findMembershipFlexible,
  normalizeId,
  areIdsEqual,
} from './flexibleId.js';

// Mock logger
vi.mock('#config/index.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    level: 'info',
  },
}));

describe('Flexible ID Utilities', () => {
  describe('flexibleFindOne', () => {
    let mockCollection;

    beforeEach(() => {
      mockCollection = {
        collectionName: 'testCollection',
        findOne: vi.fn(),
      };
    });

    it('should find document by string ID first', async () => {
      const stringId = 'org_123';
      const mockDoc = { id: stringId, name: 'Test Org' };

      mockCollection.findOne.mockResolvedValueOnce(mockDoc);

      const result = await flexibleFindOne(mockCollection, stringId);

      expect(result).toBe(mockDoc);
      expect(mockCollection.findOne).toHaveBeenCalledTimes(1);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        id: stringId,
      });
    });

    it('should fallback to ObjectId when string ID not found', async () => {
      const objectIdString = '507f1f77bcf86cd799439011';
      const mockDoc = { _id: new mongoose.Types.ObjectId(objectIdString), name: 'Test Org' };

      // First call returns null (string ID not found)
      mockCollection.findOne.mockResolvedValueOnce(null);
      // Second call returns document (ObjectId found)
      mockCollection.findOne.mockResolvedValueOnce(mockDoc);

      const result = await flexibleFindOne(mockCollection, objectIdString);

      expect(result).toBe(mockDoc);
      expect(mockCollection.findOne).toHaveBeenCalledTimes(2);
      expect(mockCollection.findOne).toHaveBeenNthCalledWith(1, {
        id: objectIdString,
      });
      expect(mockCollection.findOne).toHaveBeenNthCalledWith(2, {
        _id: expect.any(mongoose.Types.ObjectId),
      });
    });

    it('should return null when document not found with either format', async () => {
      const objectIdString = '507f1f77bcf86cd799439011';

      mockCollection.findOne.mockResolvedValue(null);

      const result = await flexibleFindOne(mockCollection, objectIdString);

      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid ObjectId gracefully', async () => {
      const invalidId = 'not-an-objectid';

      mockCollection.findOne.mockResolvedValue(null);

      const result = await flexibleFindOne(mockCollection, invalidId);

      expect(result).toBeNull();
      expect(mockCollection.findOne).toHaveBeenCalledTimes(1);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        id: invalidId,
      });
    });

    it('should pass additional query parameters', async () => {
      const stringId = 'org_123';
      const additionalQuery = { deletedAt: { $exists: false } };
      const mockDoc = { id: stringId, name: 'Test Org' };

      mockCollection.findOne.mockResolvedValueOnce(mockDoc);

      const result = await flexibleFindOne(mockCollection, stringId, 'id', additionalQuery);

      expect(result).toBe(mockDoc);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        id: stringId,
        deletedAt: { $exists: false },
      });
    });

    it('should use custom ID field name', async () => {
      const stringId = 'user_123';
      const mockDoc = { userId: stringId, name: 'Test User' };

      mockCollection.findOne.mockResolvedValueOnce(mockDoc);

      const result = await flexibleFindOne(mockCollection, stringId, 'userId');

      expect(result).toBe(mockDoc);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        userId: stringId,
      });
    });
  });

  describe('flexibleUpdateOne', () => {
    let mockCollection;

    beforeEach(() => {
      mockCollection = {
        collectionName: 'testCollection',
        updateOne: vi.fn(),
      };
    });

    it('should update by string ID first', async () => {
      const stringId = 'org_123';
      const update = { $set: { name: 'Updated Org' } };
      const mockResult = { matchedCount: 1, modifiedCount: 1 };

      mockCollection.updateOne.mockResolvedValueOnce(mockResult);

      const result = await flexibleUpdateOne(mockCollection, stringId, update);

      expect(result).toBe(mockResult);
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
      expect(mockCollection.updateOne).toHaveBeenCalledWith({ id: stringId }, update, {});
    });

    it('should fallback to ObjectId when string ID not matched', async () => {
      const objectIdString = '507f1f77bcf86cd799439011';
      const update = { $set: { name: 'Updated Org' } };
      const failResult = { matchedCount: 0, modifiedCount: 0 };
      const successResult = { matchedCount: 1, modifiedCount: 1 };

      mockCollection.updateOne.mockResolvedValueOnce(failResult);
      mockCollection.updateOne.mockResolvedValueOnce(successResult);

      const result = await flexibleUpdateOne(mockCollection, objectIdString, update);

      expect(result).toBe(successResult);
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);
      expect(mockCollection.updateOne).toHaveBeenNthCalledWith(
        2,
        { _id: expect.any(mongoose.Types.ObjectId) },
        update,
        {},
      );
    });

    it('should return zero matches when document not found', async () => {
      const objectIdString = '507f1f77bcf86cd799439011';
      const update = { $set: { name: 'Updated Org' } };
      const failResult = { matchedCount: 0, modifiedCount: 0 };

      mockCollection.updateOne.mockResolvedValue(failResult);

      const result = await flexibleUpdateOne(mockCollection, objectIdString, update);

      expect(result).toBe(failResult);
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);
    });

    it('should pass MongoDB options', async () => {
      const stringId = 'org_123';
      const update = { $set: { name: 'Updated Org' } };
      const options = { upsert: true };
      const mockResult = { matchedCount: 1, modifiedCount: 1 };

      mockCollection.updateOne.mockResolvedValueOnce(mockResult);

      const result = await flexibleUpdateOne(mockCollection, stringId, update, 'id', options);

      expect(mockCollection.updateOne).toHaveBeenCalledWith({ id: stringId }, update, options);
    });
  });

  describe('buildFlexibleIdQuery', () => {
    it('should return single condition for non-ObjectId string', () => {
      const stringId = 'org_123';

      const query = buildFlexibleIdQuery(stringId);

      expect(query).toEqual({ id: stringId });
    });

    it('should return $or query for valid ObjectId string', () => {
      const objectIdString = '507f1f77bcf86cd799439011';

      const query = buildFlexibleIdQuery(objectIdString);

      expect(query).toEqual({
        $or: [{ id: objectIdString }, { _id: expect.any(mongoose.Types.ObjectId) }],
      });
    });

    it('should use custom ID field name', () => {
      const objectIdString = '507f1f77bcf86cd799439011';

      const query = buildFlexibleIdQuery(objectIdString, 'userId');

      expect(query).toEqual({
        $or: [{ userId: objectIdString }, { _id: expect.any(mongoose.Types.ObjectId) }],
      });
    });
  });

  describe('getIdVariants', () => {
    it('should return only string for non-ObjectId', () => {
      const stringId = 'org_123';

      const variants = getIdVariants(stringId);

      expect(variants).toEqual([stringId]);
    });

    it('should return string and ObjectId for valid ObjectId string', () => {
      const objectIdString = '507f1f77bcf86cd799439011';

      const variants = getIdVariants(objectIdString);

      expect(variants).toHaveLength(2);
      expect(variants[0]).toBe(objectIdString);
      expect(variants[1]).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  describe('findMembershipFlexible', () => {
    let mockDb;
    let mockMemberCollection;

    beforeEach(() => {
      mockMemberCollection = {
        findOne: vi.fn(),
      };
      mockDb = {
        collection: vi.fn().mockReturnValue(mockMemberCollection),
      };
    });

    it('should find membership with string IDs', async () => {
      const userId = 'user_123';
      const organizationId = 'org_123';
      const mockMembership = { userId, organizationId, role: 'admin' };

      mockMemberCollection.findOne.mockResolvedValueOnce(mockMembership);

      const result = await findMembershipFlexible(mockDb, userId, organizationId);

      expect(result).toBe(mockMembership);
      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        $or: [{ userId, organizationId }],
      });
    });

    it('should find membership with all ID combinations for ObjectIds', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const organizationId = '507f1f77bcf86cd799439012';
      const mockMembership = { userId, organizationId, role: 'member' };

      mockMemberCollection.findOne.mockResolvedValueOnce(mockMembership);

      const result = await findMembershipFlexible(mockDb, userId, organizationId);

      expect(result).toBe(mockMembership);
      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        $or: expect.arrayContaining([
          expect.objectContaining({ userId, organizationId }),
          expect.objectContaining({
            userId: expect.any(mongoose.Types.ObjectId),
            organizationId,
          }),
          expect.objectContaining({
            userId,
            organizationId: expect.any(mongoose.Types.ObjectId),
          }),
          expect.objectContaining({
            userId: expect.any(mongoose.Types.ObjectId),
            organizationId: expect.any(mongoose.Types.ObjectId),
          }),
        ]),
      });
    });

    it('should include additional query parameters', async () => {
      const userId = 'user_123';
      const organizationId = 'org_123';
      const additionalQuery = { role: { $in: ['admin', 'owner'] } };

      mockMemberCollection.findOne.mockResolvedValueOnce(null);

      await findMembershipFlexible(mockDb, userId, organizationId, additionalQuery);

      expect(mockMemberCollection.findOne).toHaveBeenCalledWith({
        $or: [
          {
            userId,
            organizationId,
            role: { $in: ['admin', 'owner'] },
          },
        ],
      });
    });
  });

  describe('normalizeId', () => {
    it('should convert valid ObjectId string to ObjectId', () => {
      const objectIdString = '507f1f77bcf86cd799439011';

      const result = normalizeId(objectIdString);

      expect(result).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(result.toString()).toBe(objectIdString);
    });

    it('should return original for non-ObjectId string', () => {
      const stringId = 'org_123';

      const result = normalizeId(stringId);

      expect(result).toBe(stringId);
    });

    it('should return original for already ObjectId instance', () => {
      const objectId = new mongoose.Types.ObjectId();

      const result = normalizeId(objectId);

      expect(result).toBe(objectId);
    });
  });

  describe('areIdsEqual', () => {
    it('should return true for identical strings', () => {
      const id = 'org_123';

      expect(areIdsEqual(id, id)).toBe(true);
    });

    it('should return true for ObjectId and its string representation', () => {
      const objectIdString = '507f1f77bcf86cd799439011';
      const objectId = new mongoose.Types.ObjectId(objectIdString);

      expect(areIdsEqual(objectId, objectIdString)).toBe(true);
      expect(areIdsEqual(objectIdString, objectId)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const id1 = 'org_123';
      const id2 = 'org_456';

      expect(areIdsEqual(id1, id2)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(areIdsEqual(null, null)).toBe(true);
      expect(areIdsEqual(undefined, undefined)).toBe(true);
      expect(areIdsEqual(null, undefined)).toBe(false);
      expect(areIdsEqual('org_123', null)).toBe(false);
    });
  });
});
