/**
 * @file Organization schema tests
 * @description TDD tests for organization schema validation and functionality
 */

import mongoose from 'mongoose';
import organizationSchema, { type IOrganization } from '../organization';

describe('Organization Schema', () => {
  let Organization: mongoose.Model<IOrganization>;

  beforeAll(() => {
    Organization = mongoose.model('TestOrganization', organizationSchema);
  });

  afterAll(async () => {
    await mongoose.deleteModel('TestOrganization');
  });

  describe('Schema Definition', () => {
    it('should exist and be importable', () => {
      expect(organizationSchema).toBeDefined();
      expect(organizationSchema).toBeInstanceOf(mongoose.Schema);
    });

    it('should have all required fields defined', () => {
      const paths = organizationSchema.paths;
      expect(paths.name).toBeDefined();
      expect(paths.accountOwnerId).toBeDefined();
      expect(paths.subdomain).toBeDefined();
      expect(paths.domain).toBeDefined();
      expect(paths.settings).toBeDefined();
      expect(paths.billing).toBeDefined();
      expect(paths.createdAt).toBeDefined();
      expect(paths.updatedAt).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should require name field', async () => {
      const org = new Organization({
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org'
      });

      await expect(org.validate()).rejects.toThrow(/name.*required/i);
    });

    it('should require accountOwnerId field', async () => {
      const org = new Organization({
        name: 'Test Organization',
        subdomain: 'test-org'
      });

      await expect(org.validate()).rejects.toThrow(/accountOwnerId.*required/i);
    });

    it('should require subdomain field', async () => {
      const org = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId()
      });

      await expect(org.validate()).rejects.toThrow(/subdomain.*required/i);
    });

    it('should validate name length (max 100 characters)', async () => {
      const longName = 'a'.repeat(101);
      const org = new Organization({
        name: longName,
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org'
      });

      await expect(org.validate()).rejects.toThrow(/name.*100/i);
    });

    it('should validate subdomain uniqueness constraint', () => {
      const indexes = organizationSchema.indexes();
      const hasUniqueSubdomain = indexes.some(index => 
        index[0].subdomain && index[1]?.unique === true
      );
      expect(hasUniqueSubdomain).toBe(true);
    });

    it('should validate email format for domain field', async () => {
      const org = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org',
        domain: 'invalid-domain'
      });

      await expect(org.validate()).rejects.toThrow(/Domain.*invalid/i);
    });
  });

  describe('Default Values', () => {
    it('should set default values for settings', async () => {
      const org = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org'
      });

      await org.validate();
      expect(org.settings.allowPublicTeams).toBe(true);
      expect(org.settings.requireAdminApproval).toBe(false);
      expect(org.settings.contentRetentionDays).toBe(365);
    });

    it('should set default values for billing', async () => {
      const org = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org'
      });

      await org.validate();
      expect(org.billing.plan).toBe('hobby');
      expect(org.billing.status).toBe('active');
    });
  });

  describe('Indexes', () => {
    it('should have index on subdomain field', () => {
      const indexes = organizationSchema.indexes();
      const subdomainIndex = indexes.find(index => 
        index[0].subdomain !== undefined
      );
      expect(subdomainIndex).toBeDefined();
    });

    it('should have index on domain field', () => {
      const indexes = organizationSchema.indexes();
      const domainIndex = indexes.find(index => 
        index[0].domain !== undefined
      );
      expect(domainIndex).toBeDefined();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      const options = (organizationSchema as any).options;
      expect(options.timestamps).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should create valid organization with all required fields', async () => {
      const validOrg = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org',
        domain: 'test.com'
      });

      await expect(validOrg.validate()).resolves.not.toThrow();
      expect(validOrg.name).toBe('Test Organization');
      expect(validOrg.subdomain).toBe('test-org');
      expect(validOrg.domain).toBe('test.com');
    });

    it('should handle optional fields correctly', async () => {
      const orgWithoutDomain = new Organization({
        name: 'Test Organization',
        accountOwnerId: new mongoose.Types.ObjectId(),
        subdomain: 'test-org'
      });

      await expect(orgWithoutDomain.validate()).resolves.not.toThrow();
      expect(orgWithoutDomain.domain).toBeUndefined();
    });
  });
});