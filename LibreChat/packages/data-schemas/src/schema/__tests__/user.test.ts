/**
 * @file User schema test suite
 * @description Tests for User schema with organization relationship support
 */

import mongoose from 'mongoose';
import { Types } from 'mongoose';
import userSchema from '../user';

describe('User Schema', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let User: mongoose.Model<any>;

  beforeAll(() => {
    User = mongoose.model('TestUser', userSchema);
  });

  afterAll(async () => {
    await mongoose.deleteModel('TestUser');
  });

  describe('Organization Relationship', () => {
    it('should allow single organizationId reference', async () => {
      const organizationId = new Types.ObjectId();
      const userData = {
        email: 'test@company.com',
        emailVerified: true,
        organizationId,
        orgRole: 'member',
      };

      const user = new User(userData);
      await expect(user.validate()).resolves.not.toThrow();
      expect(user.organizationId).toEqual(organizationId);
    });

    it('should validate orgRole enum values', async () => {
      const organizationId = new Types.ObjectId();

      // Valid roles: account_owner and member
      const validRoles = ['account_owner', 'member'];
      for (const role of validRoles) {
        const user = new User({
          email: `test-${role}@example.com`,
          emailVerified: true,
          organizationId,
          orgRole: role,
        });
        await expect(user.validate()).resolves.not.toThrow();
      }
    });

    it('should reject invalid orgRole values', async () => {
      const organizationId = new Types.ObjectId();
      const user = new User({
        email: 'test@example.com',
        emailVerified: true,
        organizationId,
        orgRole: 'org_admin', // This role is not valid in the current enum
      });

      await expect(user.validate()).rejects.toThrow();
    });

    it('should not have teamMemberships field', async () => {
      const organizationId = new Types.ObjectId();
      const user = new User({
        email: 'test@example.com',
        emailVerified: true,
        organizationId,
        orgRole: 'member',
      });

      await user.validate();

      // teamMemberships field is not part of this schema version
      expect(user.teamMemberships).toBeUndefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should allow users without organizationId (for migration)', async () => {
      const user = new User({
        email: 'legacy@example.com',
        emailVerified: true,
        // No organizationId for backward compatibility
      });

      await expect(user.validate()).resolves.not.toThrow();
    });

    it('should preserve all existing user fields', async () => {
      const userData = {
        email: 'full@example.com',
        emailVerified: true,
        name: 'Full User',
        username: 'fulluser',
        password: 'password123',
        avatar: 'avatar.jpg',
        provider: 'local',
        role: 'user',
        googleId: 'google123',
        twoFactorEnabled: true,
        termsAccepted: true,
      };

      const user = new User(userData);
      await expect(user.validate()).resolves.not.toThrow();

      // Verify all existing fields are preserved
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.username).toBe(userData.username);
      expect(user.provider).toBe(userData.provider);
      expect(user.role).toBe(userData.role);
      expect(user.googleId).toBe(userData.googleId);
      expect(user.twoFactorEnabled).toBe(userData.twoFactorEnabled);
      expect(user.termsAccepted).toBe(userData.termsAccepted);
    });
  });

  describe('User Organization Scenarios', () => {
    it('should support organization creator (account_owner)', async () => {
      const organizationId = new Types.ObjectId();
      const user = new User({
        email: 'founder@startup.com',
        emailVerified: true,
        name: 'Company Founder',
        organizationId,
        orgRole: 'account_owner',
      });

      await user.validate();
      expect(user.orgRole).toBe('account_owner');
      expect(user.organizationId).toEqual(organizationId);
    });

    it('should support organization members', async () => {
      const organizationId = new Types.ObjectId();
      const user = new User({
        email: 'employee@startup.com',
        emailVerified: true,
        name: 'Team Member',
        organizationId,
        orgRole: 'member',
      });

      await user.validate();
      expect(user.orgRole).toBe('member');
      expect(user.organizationId).toEqual(organizationId);
    });

    it('should support users with personal email domains', async () => {
      // Personal email users should still get organizations (individual ones)
      const organizationId = new Types.ObjectId();
      const user = new User({
        email: 'person@gmail.com',
        emailVerified: true,
        name: 'Personal User',
        organizationId, // Even personal users get an org
        orgRole: 'account_owner', // They own their personal org
      });

      await user.validate();
      expect(user.orgRole).toBe('account_owner');
    });
  });

  describe('Database Indexes', () => {
    it('should have index on organizationId', () => {
      const indexes = userSchema.indexes();
      const orgIndex = indexes.find((index) => index[0] && index[0].organizationId);
      expect(orgIndex).toBeDefined();
    });

    it('should have compound index on organizationId and orgRole', () => {
      const indexes = userSchema.indexes();
      const compoundIndex = indexes.find(
        (index) => index[0] && index[0].organizationId && index[0].orgRole,
      );
      expect(compoundIndex).toBeDefined();
    });

    it('should preserve existing email index', () => {
      const indexes = userSchema.indexes();
      const emailIndex = indexes.find((index) => index[0] && index[0].email);
      expect(emailIndex).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should have email index for uniqueness constraint (tested at DB level)', () => {
      const indexes = userSchema.indexes();
      const emailIndex = indexes.find((index) => index[0] && index[0].email);
      expect(emailIndex).toBeDefined();
      // Note: Actual uniqueness is enforced by MongoDB, not schema validation
    });

    it('should allow multiple users in same organization', async () => {
      const organizationId = new Types.ObjectId();

      const owner = new User({
        email: 'owner@company.com',
        emailVerified: true,
        organizationId,
        orgRole: 'account_owner',
      });

      const member = new User({
        email: 'member@company.com',
        emailVerified: true,
        organizationId,
        orgRole: 'member',
      });

      await owner.validate();
      await member.validate();

      expect(owner.organizationId).toEqual(member.organizationId);
      expect(owner.orgRole).toBe('account_owner');
      expect(member.orgRole).toBe('member');
    });
  });
});
