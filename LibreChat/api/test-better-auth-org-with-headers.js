#!/usr/bin/env node
/**
 * Test Better Auth organization API with proper headers
 */

// Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Set required env vars
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test-secret';
process.env.NODE_ENV = 'development';
process.env.DOMAIN_SERVER = process.env.DOMAIN_SERVER || 'http://localhost:3080';
process.env.DOMAIN_CLIENT = process.env.DOMAIN_CLIENT || 'http://localhost:3090';

// Import modules after env is set
const { getAuth } = await import('./auth.js');
const mongoose = (await import('mongoose')).default;

async function testWithHeaders() {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/Agentis?authSource=admin';
      await mongoose.connect(mongoUri);
    }
    
    // Wait for auth initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const auth = getAuth();
    
    console.log('=== Testing with Headers ===');
    
    // Test 1: List organizations without headers (should fail)
    console.log('\n1. Testing without headers:');
    try {
      const orgs = await auth.api.listOrganizations();
      console.log('Unexpected success:', orgs);
    } catch (error) {
      console.log('Expected error:', error.status, error.statusCode);
    }
    
    // Test 2: List organizations with headers
    console.log('\n2. Testing with headers:');
    
    // For server-side calls, Better Auth uses internal methods
    // We need to check how to make internal API calls
    
    // Let's check the auth instance structure
    console.log('\n=== Auth Instance Structure ===');
    console.log('auth.$Infer exists:', !!auth.$Infer);
    console.log('auth.api exists:', !!auth.api);
    console.log('auth.options exists:', !!auth.options);
    console.log('auth.context exists:', !!auth.context);
    console.log('auth.db exists:', !!auth.db);
    console.log('auth.adapter exists:', !!auth.adapter);
    console.log('auth.mongodbAdapter exists:', !!auth.mongodbAdapter);
    
    if (auth.db) {
      console.log('\n=== Auth DB Structure ===');
      console.log('DB type:', typeof auth.db);
      console.log('DB keys:', Object.keys(auth.db));
    }
    
    // Test 3: Try to access collections directly through adapter
    console.log('\n3. Testing direct DB access through Better Auth:');
    if (auth.adapter) {
      console.log('Adapter type:', typeof auth.adapter);
      console.log('Adapter methods:', Object.keys(auth.adapter));
      
      if (auth.adapter.findMany) {
        try {
          console.log('Trying adapter.findMany for organizations...');
          const orgs = await auth.adapter.findMany({ model: 'organization' });
          console.log('Organizations found:', orgs);
        } catch (error) {
          console.log('Error with adapter.findMany:', error.message);
        }
      }
    }
    
    // Test 4: Check if we can create internal request context
    console.log('\n4. Testing internal request context:');
    // Better Auth server-side usage typically requires creating a request context
    // Let's see if we can use the methods directly
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testWithHeaders();