/**
 * @file Team schema tests
 * @description TDD tests for team schema validation and functionality
 */

import mongoose from 'mongoose';
import teamSchema, { type ITeam } from '../team';

describe('Team Schema', () => {
  let Team: mongoose.Model<ITeam>;

  beforeAll(() => {
    Team = mongoose.model('TestTeam', teamSchema);
  });

  afterAll(async () => {
    await mongoose.deleteModel('TestTeam');
  });

  describe('Schema Definition', () => {
    it('should exist and be importable', () => {
      expect(teamSchema).toBeDefined();
      expect(teamSchema).toBeInstanceOf(mongoose.Schema);
    });

    it('should have all required fields defined', () => {
      const paths = teamSchema.paths;
      expect(paths.organizationId).toBeDefined();
      expect(paths.name).toBeDefined();
      expect(paths.description).toBeDefined();
      expect(paths.ownerId).toBeDefined();
      expect(paths.isPublic).toBeDefined();
      expect(paths.memberIds).toBeDefined();
      expect(paths.adminIds).toBeDefined();
      expect(paths.settings).toBeDefined();
      expect(paths.createdAt).toBeDefined();
      expect(paths.updatedAt).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should require organizationId field', async () => {
      const team = new Team({
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      });

      await expect(team.validate()).rejects.toThrow(/organizationId.*required/i);
    });

    it('should require name field', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        ownerId: new mongoose.Types.ObjectId(),
      });

      await expect(team.validate()).rejects.toThrow(/name.*required/i);
    });

    it('should require ownerId field', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
      });

      await expect(team.validate()).rejects.toThrow(/ownerId.*required/i);
    });

    it('should validate name length (max 50 characters)', async () => {
      const longName = 'a'.repeat(51);
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: longName,
        ownerId: new mongoose.Types.ObjectId(),
      });

      await expect(team.validate()).rejects.toThrow(/name.*50/i);
    });

    it('should validate description length (max 500 characters)', async () => {
      const longDescription = 'a'.repeat(501);
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        description: longDescription,
      });

      await expect(team.validate()).rejects.toThrow(/description.*500/i);
    });

    it('should validate memberIds as array of ObjectIds', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        memberIds: ['invalid-id'],
      });

      await expect(team.validate()).rejects.toThrow();
    });

    it('should validate adminIds as array of ObjectIds', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        adminIds: ['invalid-id'],
      });

      await expect(team.validate()).rejects.toThrow();
    });
  });

  describe('Default Values', () => {
    it('should set default values for isPublic (false)', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      });

      await team.validate();
      expect(team.isPublic).toBe(false);
    });

    it('should set default values for settings', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      });

      await team.validate();
      expect(team.settings.allowMemberInvites).toBe(true);
      expect(team.settings.requireAdminApproval).toBe(false);
    });

    it('should initialize empty arrays for memberIds and adminIds', async () => {
      const team = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      });

      await team.validate();
      expect(team.memberIds).toEqual([]);
      expect(team.adminIds).toEqual([]);
    });
  });

  describe('Indexes', () => {
    it('should have index on organizationId field', () => {
      const indexes = teamSchema.indexes();
      const orgIndex = indexes.find(index => 
        index[0].organizationId !== undefined
      );
      expect(orgIndex).toBeDefined();
    });

    it('should have compound index on organizationId and name', () => {
      const indexes = teamSchema.indexes();
      const compoundIndex = indexes.find(index => 
        index[0].organizationId !== undefined && index[0].name !== undefined
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should have index on ownerId field', () => {
      const indexes = teamSchema.indexes();
      const ownerIndex = indexes.find(index => 
        index[0].ownerId !== undefined
      );
      expect(ownerIndex).toBeDefined();
    });

    it('should have index on memberIds field', () => {
      const indexes = teamSchema.indexes();
      const memberIndex = indexes.find(index => 
        index[0].memberIds !== undefined
      );
      expect(memberIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      const options = (teamSchema as any).options;
      expect(options.timestamps).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should create valid team with all required fields', async () => {
      const validTeam = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        description: 'A test team for validation',
      });

      await expect(validTeam.validate()).resolves.not.toThrow();
      expect(validTeam.name).toBe('Test Team');
      expect(validTeam.description).toBe('A test team for validation');
      expect(validTeam.isPublic).toBe(false);
    });

    it('should handle optional fields correctly', async () => {
      const teamWithoutDescription = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      });

      await expect(teamWithoutDescription.validate()).resolves.not.toThrow();
      expect(teamWithoutDescription.description).toBeUndefined();
    });

    it('should handle member and admin arrays correctly', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();

      const teamWithMembers = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: userId1,
        memberIds: [userId1, userId2, userId3],
        adminIds: [userId1, userId2],
      });

      await expect(teamWithMembers.validate()).resolves.not.toThrow();
      expect(teamWithMembers.memberIds).toHaveLength(3);
      expect(teamWithMembers.adminIds).toHaveLength(2);
      expect(teamWithMembers.memberIds).toContain(userId1);
      expect(teamWithMembers.adminIds).toContain(userId1);
    });

    it('should allow public teams', async () => {
      const publicTeam = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Public Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        isPublic: true,
      });

      await expect(publicTeam.validate()).resolves.not.toThrow();
      expect(publicTeam.isPublic).toBe(true);
    });
  });
});