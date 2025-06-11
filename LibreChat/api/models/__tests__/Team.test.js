/**
 * @file Team model tests
 * @description TDD tests for Team Mongoose model
 */

const mongoose = require('mongoose');
const Team = require('../Team');

describe('Team Model', () => {
  describe('Model Definition', () => {
    it('should exist and be a Mongoose model', () => {
      expect(Team).toBeDefined();
      expect(Team.modelName).toBe('Team');
    });

    it('should have the correct collection name', () => {
      expect(Team.collection.collectionName).toBe('teams');
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid team document', () => {
      const teamData = {
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      };

      const team = new Team(teamData);

      expect(team.organizationId).toEqual(teamData.organizationId);
      expect(team.name).toBe(teamData.name);
      expect(team.ownerId).toEqual(teamData.ownerId);
    });

    it('should apply default values correctly', () => {
      const teamData = {
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
      };

      const team = new Team(teamData);

      expect(team.isPublic).toBe(false);
      expect(team.memberIds).toEqual([]);
      expect(team.adminIds).toEqual([]);
      expect(team.settings.allowMemberInvites).toBe(true);
      expect(team.settings.requireAdminApproval).toBe(false);
    });

    it('should validate required fields', () => {
      const incompleteTeam = new Team({
        name: 'Test Team',
        // Missing organizationId and ownerId
      });

      const validationResult = incompleteTeam.validateSync();
      expect(validationResult).toBeDefined();
      expect(validationResult.errors.organizationId).toBeDefined();
      expect(validationResult.errors.ownerId).toBeDefined();
    });

    it('should validate name length constraints', () => {
      const teamWithLongName = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'a'.repeat(51), // Exceeds max length
        ownerId: new mongoose.Types.ObjectId(),
      });

      const validationResult = teamWithLongName.validateSync();
      expect(validationResult).toBeDefined();
      expect(validationResult.errors.name).toBeDefined();
    });

    it('should validate description length constraints', () => {
      const teamWithLongDescription = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        description: 'a'.repeat(501), // Exceeds max length
      });

      const validationResult = teamWithLongDescription.validateSync();
      expect(validationResult).toBeDefined();
      expect(validationResult.errors.description).toBeDefined();
    });

    it('should handle member and admin arrays correctly', () => {
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

      expect(teamWithMembers.memberIds).toHaveLength(3);
      expect(teamWithMembers.adminIds).toHaveLength(2);
      expect(teamWithMembers.memberIds).toContain(userId1);
      expect(teamWithMembers.adminIds).toContain(userId1);
    });
  });

  describe('Schema Properties', () => {
    it('should have compound unique constraint on organizationId and name', () => {
      const schema = Team.schema;
      const indexes = schema.indexes();

      const compoundIndex = indexes.find(
        (index) =>
          index[0].organizationId !== undefined &&
          index[0].name !== undefined &&
          index[1]?.unique === true,
      );

      expect(compoundIndex).toBeDefined();
    });

    it('should have references to correct models', () => {
      const schema = Team.schema;

      const orgPath = schema.path('organizationId');
      expect(orgPath.options.ref).toBe('Organization');

      const ownerPath = schema.path('ownerId');
      expect(ownerPath.options.ref).toBe('User');

      const memberPath = schema.path('memberIds');
      expect(memberPath.options.ref).toBe('User');

      const adminPath = schema.path('adminIds');
      expect(adminPath.options.ref).toBe('User');
    });

    it('should have proper field types', () => {
      const schema = Team.schema;

      expect(schema.path('organizationId').instance).toBe('ObjectId');
      expect(schema.path('name').instance).toBe('String');
      expect(schema.path('description').instance).toBe('String');
      expect(schema.path('ownerId').instance).toBe('ObjectId');
      expect(schema.path('isPublic').instance).toBe('Boolean');
      expect(schema.path('memberIds').instance).toBe('Array');
      expect(schema.path('adminIds').instance).toBe('Array');
    });

    it('should have timestamps enabled', () => {
      const schema = Team.schema;
      expect(schema.options.timestamps).toBe(true);
    });

    it('should have proper indexes for performance', () => {
      const schema = Team.schema;
      const indexes = schema.indexes();

      // Check for organizationId index
      const orgIndex = indexes.find((index) => index[0].organizationId !== undefined);
      expect(orgIndex).toBeDefined();

      // Check for ownerId index
      const ownerIndex = indexes.find((index) => index[0].ownerId !== undefined);
      expect(ownerIndex).toBeDefined();

      // Check for memberIds index
      const memberIndex = indexes.find((index) => index[0].memberIds !== undefined);
      expect(memberIndex).toBeDefined();
    });
  });

  describe('Business Logic', () => {
    it('should allow public teams', () => {
      const publicTeam = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Public Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        isPublic: true,
      });

      expect(publicTeam.isPublic).toBe(true);
    });

    it('should handle optional description field', () => {
      const teamWithDescription = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        description: 'A team for testing purposes',
      });

      expect(teamWithDescription.description).toBe('A team for testing purposes');
    });

    it('should handle team settings correctly', () => {
      const teamWithSettings = new Team({
        organizationId: new mongoose.Types.ObjectId(),
        name: 'Test Team',
        ownerId: new mongoose.Types.ObjectId(),
        settings: {
          allowMemberInvites: false,
          requireAdminApproval: true,
        },
      });

      expect(teamWithSettings.settings.allowMemberInvites).toBe(false);
      expect(teamWithSettings.settings.requireAdminApproval).toBe(true);
    });
  });
});
