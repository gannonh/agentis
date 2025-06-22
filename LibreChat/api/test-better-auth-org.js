#!/usr/bin/env node
/**
 * Test script to check Better Auth organization API availability
 */

// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.log('Error loading .env:', result.error);
} else {
  console.log('.env loaded successfully');
}

// Set required env vars if not present
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret';
process.env.NODE_ENV = 'development';

// Use actual values from .env or defaults
if (!process.env.DOMAIN_SERVER) {
  process.env.DOMAIN_SERVER = 'http://localhost:3080';
  console.log('Using default DOMAIN_SERVER:', process.env.DOMAIN_SERVER);
}
if (!process.env.DOMAIN_CLIENT) {
  process.env.DOMAIN_CLIENT = 'http://localhost:3090';
  console.log('Using default DOMAIN_CLIENT:', process.env.DOMAIN_CLIENT);
}

console.log('\nEnvironment check:');
console.log('DOMAIN_SERVER:', process.env.DOMAIN_SERVER);
console.log('DOMAIN_CLIENT:', process.env.DOMAIN_CLIENT);
console.log('BETTER_AUTH_SECRET:', process.env.BETTER_AUTH_SECRET ? 'Set' : 'Not set');
console.log('MONGO_URI:', process.env.MONGO_URI || 'Using default');

// NOW import modules after env is set
const { getAuth } = await import('./auth.js');
const mongoose = (await import('mongoose')).default;
const { logger } = await import('./config/index.js');

// Add a delay to ensure MongoDB connection is established
async function waitForAuth() {
  console.log('\nWaiting for MongoDB connection...');

  // Connect to MongoDB if not connected
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/Agentis?authSource=admin';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
  }

  // Wait for mongoose connection
  if (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => {
      mongoose.connection.once('open', resolve);
    });
  }

  // Give Better Auth time to initialize after MongoDB opens
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('MongoDB connected, checking Better Auth...');
}

async function testBetterAuthOrg() {
  try {
    await waitForAuth();

    const auth = getAuth();
    console.log('\n=== Better Auth Instance ===');
    console.log('Auth instance exists:', !!auth);
    console.log('Auth handler exists:', !!auth?.handler);
    console.log('Auth api exists:', !!auth?.api);

    if (auth?.api) {
      console.log('\n=== API Methods Available ===');
      console.log('All API keys:', Object.keys(auth.api));

      // Check for organization-specific methods
      console.log('\n=== Organization API ===');
      console.log('auth.api.organization exists:', !!auth.api.organization);

      if (auth.api.organization) {
        console.log('Organization methods:', Object.keys(auth.api.organization));
      }

      // Check for individual organization methods
      console.log('\n=== Individual Org Methods ===');
      console.log('listOrganizations:', typeof auth.api.listOrganizations);
      console.log('createOrganization:', typeof auth.api.createOrganization);
      console.log('deleteOrganization:', typeof auth.api.deleteOrganization);
      console.log('getOrganization:', typeof auth.api.getOrganization);
      console.log('updateOrganization:', typeof auth.api.updateOrganization);
      console.log('addMember:', typeof auth.api.addMember);
      console.log('removeMember:', typeof auth.api.removeMember);
      console.log('listMembers:', typeof auth.api.listMembers);

      // Check organization plugin specific methods
      console.log('\n=== Organization Plugin Methods ===');
      console.log('organization.create:', typeof auth.api.organization?.create);
      console.log(
        'organization.listOrganizations:',
        typeof auth.api.organization?.listOrganizations,
      );
      console.log('organization.checkSlug:', typeof auth.api.organization?.checkSlug);
      console.log('organization.setActive:', typeof auth.api.organization?.setActive);
      console.log(
        'organization.getFullOrganization:',
        typeof auth.api.organization?.getFullOrganization,
      );
      console.log('organization.update:', typeof auth.api.organization?.update);
      console.log('organization.inviteMember:', typeof auth.api.organization?.inviteMember);
      console.log('organization.removeMember:', typeof auth.api.organization?.removeMember);

      // Try to call listOrganizations
      console.log('\n=== Testing listOrganizations ===');
      try {
        if (auth.api.listOrganizations) {
          console.log('Calling auth.api.listOrganizations()...');
          const orgs = await auth.api.listOrganizations();
          console.log('Success! Organizations:', orgs);
        } else if (auth.api.organization?.listOrganizations) {
          console.log('Calling auth.api.organization.listOrganizations()...');
          const orgs = await auth.api.organization.listOrganizations();
          console.log('Success! Organizations:', orgs);
        } else {
          console.log('No listOrganizations method found!');
        }
      } catch (error) {
        console.log('Error calling listOrganizations:', error.message);
        console.log('Error type:', error.constructor.name);
        console.log('Error details:', error);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

// Run the test
testBetterAuthOrg();
