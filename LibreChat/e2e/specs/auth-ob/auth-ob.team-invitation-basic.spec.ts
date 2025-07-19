/**
 * @fileoverview Basic Team Invitation API Test
 * @description Tests Better Auth invitation functionality directly through API calls
 */

import { test, expect } from '@playwright/test';
import { logProgress } from '../../utils/testLogger';
import { 
  createTestUserWithOrganization, 
  cleanupTestUser, 
  generateTestId, 
  type TestAuthResult 
} from '../../utils/testAuth';

test.describe('Team Invitation API Tests', () => {
  let testAuth: TestAuthResult;
  let testId: string;

  test.beforeAll(async () => {
    testId = generateTestId();
    testAuth = await createTestUserWithOrganization(testId);
    logProgress(`✅ Created test user: ${testAuth.user.email} with org: ${testAuth.organization.name}`);
  });

  test.afterAll(async () => {
    if (testAuth) {
      try {
        await cleanupTestUser(testAuth.user.id, testAuth.organization.id);
        logProgress(`✅ Cleaned up test user: ${testAuth.user.email}`);
      } catch (error) {
        logProgress(`⚠️ Cleanup failed for user ${testAuth.user.email}: ${error}`);
      }
    }
  });

  test('should send invitation via Better Auth API and verify inviter information', async () => {
    logProgress('🚀 Testing Better Auth invitation API...');
    
    const testEmail = `invite-test-${Date.now()}@example.com`;
    
    try {
      // Send invitation via Better Auth API
      const inviteResponse = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: testEmail,
          role: 'member',
          resend: true
        })
      });

      logProgress(`📡 Invitation response: ${inviteResponse.status} ${inviteResponse.statusText}`);
      
      if (!inviteResponse.ok) {
        const errorText = await inviteResponse.text();
        logProgress(`❌ Invitation failed: ${errorText}`);
        throw new Error(`Invitation failed: ${inviteResponse.status} ${errorText}`);
      }

      const inviteData = await inviteResponse.json();
      logProgress(`✅ Invitation sent successfully: ${JSON.stringify(inviteData, null, 2)}`);

      // Check if invitation was created in database
      // Connect to MongoDB to check invitation record
      const mongoose = (await import('mongoose')).default;
      
      if (mongoose.connection.readyState !== 1) {
        const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin';
        await mongoose.connect(mongoUri);
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not available');
      }

      // Query invitation collection to see what Better Auth stored
      const invitation = await db.collection('invitation').findOne({ 
        email: testEmail 
      });

      logProgress(`🔍 Invitation record in database: ${JSON.stringify(invitation, null, 2)}`);

      if (invitation) {
        // Check what inviter information Better Auth captured
        expect(invitation.email).toBe(testEmail);
        expect(invitation.organizationId).toBeDefined();
        expect(invitation.inviterId).toBeDefined();
        
        logProgress(`✅ Invitation stored with:`);
        logProgress(`   Email: ${invitation.email}`);
        logProgress(`   Organization ID: ${invitation.organizationId}`);
        logProgress(`   Inviter ID: ${invitation.inviterId}`);
        logProgress(`   Status: ${invitation.status}`);
        logProgress(`   Created At: ${invitation.createdAt}`);
        logProgress(`   Expires At: ${invitation.expiresAt}`);
        
        // Check if Better Auth stores inviter details automatically
        if (invitation.inviterName) {
          logProgress(`   Inviter Name: ${invitation.inviterName}`);
        } else {
          logProgress(`   ⚠️ No inviter name stored automatically`);
        }
        
        if (invitation.inviterEmail) {
          logProgress(`   Inviter Email: ${invitation.inviterEmail}`);
        } else {
          logProgress(`   ⚠️ No inviter email stored automatically`);
        }
        
        // Check for any additional Better Auth fields
        const additionalFields = Object.keys(invitation).filter(key => 
          !['_id', 'email', 'organizationId', 'inviterId', 'status', 'createdAt', 'expiresAt'].includes(key)
        );
        
        if (additionalFields.length > 0) {
          logProgress(`   Additional fields: ${additionalFields.join(', ')}`);
          additionalFields.forEach(field => {
            logProgress(`     ${field}: ${invitation[field]}`);
          });
        }
        
        logProgress('✅ Basic invitation functionality working correctly');
      } else {
        throw new Error('Invitation not found in database after API call');
      }
      
    } catch (error) {
      logProgress(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('should verify Better Auth invitation resend functionality', async () => {
    logProgress('🚀 Testing invitation resend functionality...');
    
    const testEmail = `resend-test-${Date.now()}@example.com`;
    
    try {
      // Send initial invitation
      const inviteResponse1 = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: testEmail,
          role: 'member',
          resend: false // Initial invitation
        })
      });

      expect(inviteResponse1.ok).toBe(true);
      const inviteData1 = await inviteResponse1.json();
      logProgress(`✅ Initial invitation sent`);

      // Send duplicate invitation with resend=true
      const inviteResponse2 = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: testEmail,
          role: 'member',
          resend: true // Should handle duplicate gracefully
        })
      });

      expect(inviteResponse2.ok).toBe(true);
      const inviteData2 = await inviteResponse2.json();
      logProgress(`✅ Resend invitation handled gracefully`);

      logProgress('✅ Resend functionality working correctly');
      
    } catch (error) {
      logProgress(`❌ Resend test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  test('should test role assignment in invitations', async () => {
    logProgress('🚀 Testing invitation role assignment...');
    
    const memberEmail = `member-test-${Date.now()}@example.com`;
    const adminEmail = `admin-test-${Date.now()}@example.com`;
    
    try {
      // Send member invitation
      const memberInviteResponse = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: memberEmail,
          role: 'member',
          resend: true
        })
      });

      expect(memberInviteResponse.ok).toBe(true);
      logProgress(`✅ Member invitation sent`);

      // Send admin invitation
      const adminInviteResponse = await fetch('http://localhost:3080/api/auth/organization/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `better-auth.session_token=${testAuth.session.sessionToken}`
        },
        body: JSON.stringify({
          email: adminEmail,
          role: 'admin',
          resend: true
        })
      });

      expect(adminInviteResponse.ok).toBe(true);
      logProgress(`✅ Admin invitation sent`);

      // Verify roles in database using MongoDB native client
      const { MongoClient } = await import('mongodb');
      const mongoUri = process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin';
      const mongoClient = new MongoClient(mongoUri);
      
      try {
        await mongoClient.connect();
        const db = mongoClient.db();

        const memberInvitation = await db.collection('invitation').findOne({ email: memberEmail });
        const adminInvitation = await db.collection('invitation').findOne({ email: adminEmail });

        expect(memberInvitation?.role).toBe('member');
        expect(adminInvitation?.role).toBe('admin');

        logProgress('✅ Role assignment working correctly');
      } finally {
        await mongoClient.close();
      }
      
    } catch (error) {
      logProgress(`❌ Role assignment test failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
});