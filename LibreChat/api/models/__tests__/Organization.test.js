/**
 * @file Organization model tests
 * @description TDD tests for Organization Mongoose model
 */

const mongoose = require('mongoose');
const Organization = require('../Organization');

describe('Organization Model', () => {

  describe('Model Definition', () => {
    it('should exist and be a Mongoose model', () => {
      expect(Organization).toBeDefined();
      expect(Organization.modelName).toBe('Organization');
    });

    it('should have the correct collection name', () => {
      expect(Organization.collection.collectionName).toBe('organizations');
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid organization document', () => {
      const orgData = {
        name: 'Test Organization',
        subdomain: 'test-org',
        accountOwnerId: new mongoose.Types.ObjectId(),
      };

      const organization = new Organization(orgData);
      
      expect(organization.name).toBe(orgData.name);
      expect(organization.subdomain).toBe(orgData.subdomain);
      expect(organization.accountOwnerId).toEqual(orgData.accountOwnerId);
    });

    it('should apply default values correctly', () => {
      const orgData = {
        name: 'Test Organization',
        subdomain: 'test-org',
        accountOwnerId: new mongoose.Types.ObjectId(),
      };

      const organization = new Organization(orgData);
      
      expect(organization.settings.allowPublicTeams).toBe(true);
      expect(organization.settings.requireAdminApproval).toBe(false);
      expect(organization.settings.contentRetentionDays).toBe(365);
      expect(organization.billing.plan).toBe('hobby');
      expect(organization.billing.status).toBe('active');
    });

    it('should validate required fields', async () => {
      const incompleteOrg = new Organization({
        name: 'Test Organization',
        // Missing subdomain and accountOwnerId
      });

      const validationResult = incompleteOrg.validateSync();
      expect(validationResult).toBeDefined();
      expect(validationResult.errors.subdomain).toBeDefined();
      expect(validationResult.errors.accountOwnerId).toBeDefined();
    });

    it('should validate name length constraints', async () => {
      const orgWithLongName = new Organization({
        name: 'a'.repeat(101), // Exceeds max length
        subdomain: 'test-org',
        accountOwnerId: new mongoose.Types.ObjectId(),
      });

      const validationResult = orgWithLongName.validateSync();
      expect(validationResult).toBeDefined();
      expect(validationResult.errors.name).toBeDefined();
    });
  });

  describe('Schema Properties', () => {
    it('should have unique constraint on subdomain', () => {
      const schema = Organization.schema;
      const subdomainPath = schema.path('subdomain');
      expect(subdomainPath.options.unique).toBe(true);
    });

    it('should have references to User model', () => {
      const schema = Organization.schema;
      const accountOwnerPath = schema.path('accountOwnerId');
      expect(accountOwnerPath.options.ref).toBe('User');
    });

    it('should have proper field types', () => {
      const schema = Organization.schema;
      
      expect(schema.path('name').instance).toBe('String');
      expect(schema.path('subdomain').instance).toBe('String');
      expect(schema.path('domain').instance).toBe('String');
      expect(schema.path('accountOwnerId').instance).toBe('ObjectId');
    });

    it('should have timestamps enabled', () => {
      const schema = Organization.schema;
      expect(schema.options.timestamps).toBe(true);
    });
  });
});