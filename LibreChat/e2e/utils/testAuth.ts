/**
 * @fileoverview Better Auth Kit test utilities for e2e testing
 * @module e2e/utils/testAuth
 */

import { logger } from '../../api/config/index.js';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  organizationId?: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

export interface TestSession {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  activeOrganizationId?: string;
}

export interface TestAuthResult {
  user: TestUser;
  organization: TestOrganization;
  session: TestSession;
  sessionCookie: string;
}

/**
 * Simple database connection utility for tests
 */
export async function getTestDatabase() {
  const mongoose = (await import('mongoose')).default;

  // Ensure MongoDB is connected
  if (mongoose.connection.readyState !== 1) {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://admin:password@localhost:27017/Agentis?authSource=admin';
    await mongoose.connect(mongoUri);
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not available');
  }

  return { db, mongoose };
}

/**
 * Create a test user with organization for e2e testing
 * Uses Better Auth Kit's built-in test utilities
 */
export async function createTestUserWithOrganization(testId: string): Promise<TestAuthResult> {
  try {
    logger.info(`🧪 Creating test user using Better Auth API for testId: ${testId}`);

    // Generate unique test data
    const userEmail = `test-${testId}@example.com`;
    const userName = `Test User ${testId}`;
    const userPassword = `TestPass123!${testId}`;
    const orgName = `Test Org ${testId}`;
    const orgSlug = `test-org-${testId}`;

    logger.info(`🔧 Creating user via Better Auth: ${userEmail}`);

    // Wait a moment for the server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test server connectivity first
    logger.info('🔍 Testing server connectivity...');
    try {
      const healthCheck = await fetch('http://localhost:3080/', {
        method: 'GET',
      });
      logger.info(`✅ Server is reachable, status: ${healthCheck.status}`);
    } catch (connectError) {
      logger.error(`❌ Server connectivity test failed:`, connectError);
      const errorMessage =
        connectError instanceof Error ? connectError.message : String(connectError);
      throw new Error(`Server at http://localhost:3080 is not reachable: ${errorMessage}`);
    }

    // Create user using Better Auth's email/password method
    // First, use the signUp endpoint programmatically
    logger.info('📡 Calling sign-up endpoint...');

    // Add better error handling for fetch
    let signUpResponse;
    try {
      signUpResponse = await fetch('http://localhost:3080/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
          name: userName,
        }),
      });
    } catch (fetchError) {
      logger.error(`❌ Fetch error calling sign-up endpoint:`, fetchError);
      if (fetchError instanceof Error) {
        logger.error(`❌ Error type: ${fetchError.constructor.name}`);
        logger.error(`❌ Error message: ${fetchError.message}`);
      }
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(`Failed to connect to Better Auth endpoint: ${errorMessage}`);
    }

    logger.info(`📡 Sign-up response: ${signUpResponse.status} ${signUpResponse.statusText}`);

    if (!signUpResponse.ok) {
      const errorText = await signUpResponse.text();
      logger.error(`❌ Sign up failed: ${signUpResponse.status} ${errorText}`);
      throw new Error(`Sign up failed: ${signUpResponse.status} ${errorText}`);
    }

    const signUpData = await signUpResponse.json();
    logger.info(`✅ User signed up via Better Auth API: ${userEmail}`);

    // Sign in to get a valid session
    logger.info('📡 Calling sign-in endpoint...');
    const signInResponse = await fetch('http://localhost:3080/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword,
      }),
    });

    logger.info(`📡 Sign-in response: ${signInResponse.status} ${signInResponse.statusText}`);

    if (!signInResponse.ok) {
      const errorText = await signInResponse.text();
      logger.error(`❌ Sign in failed: ${signInResponse.status} ${errorText}`);
      throw new Error(`Sign in failed: ${signInResponse.status} ${errorText}`);
    }

    // Extract session token from Set-Cookie header
    const setCookieHeader = signInResponse.headers.get('set-cookie');
    let sessionToken = '';

    if (setCookieHeader) {
      const sessionMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      if (sessionMatch) {
        sessionToken = sessionMatch[1];
      }
    }

    if (!sessionToken) {
      throw new Error('Failed to extract session token from sign in response');
    }

    const signInData = await signInResponse.json();
    const userId = signInData.user?.id;

    if (!userId) {
      throw new Error('Failed to get user ID from sign in response');
    }

    logger.info(`🔐 Valid session created: ${sessionToken}`);

    // Create organization using Better Auth API instead of direct database manipulation
    logger.info(`🏢 Creating organization via Better Auth API...`);

    try {
      const createOrgResponse = await fetch('http://localhost:3080/api/auth/organization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug,
          metadata: {
            testId,
            createdForE2E: true,
            domain: 'example.com',
            autoCreated: false,
          },
        }),
      });

      logger.info(
        `📡 Create org response: ${createOrgResponse.status} ${createOrgResponse.statusText}`,
      );

      if (!createOrgResponse.ok) {
        const errorText = await createOrgResponse.text();
        logger.error(`❌ Organization creation failed: ${createOrgResponse.status} ${errorText}`);
        throw new Error(`Organization creation failed: ${createOrgResponse.status} ${errorText}`);
      }

      const orgData = await createOrgResponse.json();
      logger.info(`✅ Organization created via Better Auth API:`, JSON.stringify(orgData, null, 2));

      const orgId = orgData.id || orgData._id;

      // Test the organization list API to verify it's working
      logger.info(`🔍 Testing organization list API...`);
      const orgListResponse = await fetch('http://localhost:3080/api/auth/organization/list', {
        method: 'GET',
        headers: {
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
      });

      logger.info(
        `📡 Org list API response: ${orgListResponse.status} ${orgListResponse.statusText}`,
      );
      if (orgListResponse.ok) {
        const orgListData = await orgListResponse.json();
        logger.info(`📋 Organization list data:`, JSON.stringify(orgListData, null, 2));

        if (!orgListData || orgListData.length === 0) {
          throw new Error('Organization list API returned empty - authentication setup failed');
        }
      } else {
        const errorText = await orgListResponse.text();
        logger.error(`❌ Org list API error: ${errorText}`);
        throw new Error(`Organization list API failed: ${errorText}`);
      }

      // Accept terms to bypass Terms of Service modal
      logger.info(`📋 Accepting terms of service...`);
      const acceptTermsResponse = await fetch('http://localhost:3080/api/user/terms/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
      });

      logger.info(
        `📡 Accept terms response: ${acceptTermsResponse.status} ${acceptTermsResponse.statusText}`,
      );
      if (acceptTermsResponse.ok) {
        logger.info(`✅ Terms accepted successfully`);
      } else {
        const errorText = await acceptTermsResponse.text();
        logger.warn(`⚠️ Terms acceptance failed (may not be required): ${errorText}`);
        // Don't throw error - terms acceptance might not be enabled
      }

      // Complete onboarding programmatically to bypass onboarding flow
      logger.info(`🎯 Completing onboarding to bypass onboarding flow...`);
      const completeOnboardingResponse = await fetch('http://localhost:3080/api/user/update-onboarding-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
        body: JSON.stringify({
          onboardingStep: 'complete',
        }),
      });

      logger.info(
        `📡 Complete onboarding response: ${completeOnboardingResponse.status} ${completeOnboardingResponse.statusText}`,
      );
      if (completeOnboardingResponse.ok) {
        const onboardingData = await completeOnboardingResponse.json();
        logger.info(`✅ Onboarding completed successfully:`, onboardingData);
      } else {
        const errorText = await completeOnboardingResponse.text();
        logger.warn(`⚠️ Onboarding completion failed: ${errorText}`);
        // Don't throw error - might not break the test
      }

      // Format session cookie for Playwright
      const sessionCookie = `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`;

      return {
        user: {
          id: userId,
          email: userEmail,
          name: userName,
          role: 'user',
          organizationId: orgId,
        },
        organization: {
          id: orgId,
          name: orgName,
          slug: orgSlug,
          ownerId: userId,
        },
        session: {
          sessionToken: sessionToken,
          userId: userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          activeOrganizationId: orgId,
        },
        sessionCookie,
      };
    } catch (orgError) {
      logger.error(`❌ Failed to create organization:`, orgError);
      throw new Error(
        `Organization creation failed: ${orgError instanceof Error ? orgError.message : String(orgError)}`,
      );
    }
  } catch (error) {
    logger.error(`❌ Failed to create test user/org for ${testId}:`, error);
    throw new Error(
      `Test user creation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Clean up test user and associated data
 */
export async function cleanupTestUser(userId: string, organizationId: string): Promise<void> {
  try {
    logger.info(`🧹 Cleaning up test user: ${userId}`);

    const { db, mongoose } = await getTestDatabase();

    // Clean up in order: sessions, members, organizations, users
    try {
      // Delete sessions (both through Better Auth and direct DB)
      const sessionResult = await db.collection('session').deleteMany({ userId: userId });
      logger.info(`✅ Deleted ${sessionResult.deletedCount} sessions`);

      // Delete member records
      const memberResult = await db.collection('member').deleteMany({
        $or: [{ userId: userId }, { organizationId: organizationId }],
      });
      logger.info(`✅ Deleted ${memberResult.deletedCount} memberships`);

      // Delete organization
      let orgResult;
      try {
        // Try ObjectId first
        orgResult = await db.collection('organization').deleteOne({
          _id: new mongoose.Types.ObjectId(organizationId),
        });
      } catch (e) {
        // If ObjectId fails, try string ID
        orgResult = await db.collection('organization').deleteOne({
          id: organizationId,
        });
      }
      logger.info(`✅ Deleted ${orgResult.deletedCount} organizations`);

      // Delete user
      let userResult;
      try {
        // Try ObjectId first
        userResult = await db.collection('user').deleteOne({
          _id: new mongoose.Types.ObjectId(userId),
        });
      } catch (e) {
        // If ObjectId fails, try string ID
        userResult = await db.collection('user').deleteOne({
          id: userId,
        });
      }
      logger.info(`✅ Deleted ${userResult.deletedCount} users`);

      // Also clean up any account records (OAuth linkages)
      const accountResult = await db.collection('account').deleteMany({ userId: userId });
      logger.info(`✅ Deleted ${accountResult.deletedCount} accounts`);

      logger.info(`🧹 Cleanup completed for user: ${userId}`);
    } catch (cleanupError) {
      logger.warn(
        `⚠️ Partial cleanup failure:`,
        cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      );
    }
  } catch (error) {
    logger.error(`❌ Cleanup failed for user ${userId}:`, error);
    // Don't throw - cleanup failures shouldn't break tests
  }
}

/**
 * Generate a unique test ID for parallel test execution
 */
export function generateTestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Validate that Better Auth Kit test instance is working
 */
export async function validateTestAuth(): Promise<boolean> {
  try {
    // Basic validation - check if MongoDB is available
    const { db } = await getTestDatabase();
    const collections = await db.listCollections().toArray();

    logger.info(`🧪 Database validation successful - found ${collections.length} collections`);
    return true;
  } catch (error) {
    logger.error('❌ Test validation failed:', error);
    return false;
  }
}
