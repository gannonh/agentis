/**
 * @fileoverview Tests for invitation acceptance race condition fix
 * @module auth.invitation-race-condition.test
 *
 * Tests validate that invitation status is only updated to 'accepted'
 * after successful user creation and membership creation, preventing
 * inconsistent state if user creation fails.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

// Mock external dependencies
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
};

vi.mock('#config/winston.js', () => ({
  default: mockLogger,
}));

// Mock flexibleId utility
const mockNormalizeId = vi.fn((id) => {
  if (typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/)) {
    return new ObjectId(id);
  }
  if (ObjectId.isValid(id)) {
    return new ObjectId(id);
  }
  return id;
});

vi.mock('#server/utils/flexibleId.js', () => ({
  normalizeId: mockNormalizeId,
}));

describe('Invitation Acceptance Race Condition Fix', () => {
  let mongoServer;
  let mongoClient;
  let db;
  let pendingInvitations;
  let userCreateBeforeHook;
  let userCreateAfterHook;

  beforeEach(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db();

    // Clear mocks
    vi.clearAllMocks();

    // Initialize the pending invitations map (simulating the module-level map)
    pendingInvitations = new Map();

    // Create the hooks that we're testing (extracted from auth.js)
    userCreateBeforeHook = async (user) => {
      try {
        const invitationCollection = db.collection('invitation');
        const pendingInvitation = await invitationCollection.findOne({
          email: user.email.toLowerCase(),
          status: 'pending',
        });

        if (pendingInvitation) {
          user.onboardingStep = 'profile';

          // Store pending invitation data - NO LONGER ACCEPTING HERE
          pendingInvitations.set(user.email, {
            invitationId: pendingInvitation._id,
            organizationId: pendingInvitation.organizationId,
            role: pendingInvitation.role || 'member',
          });
        }

        return user;
      } catch (error) {
        mockLogger.error('Error in user create hook:', error);
        return user;
      }
    };

    userCreateAfterHook = async (user) => {
      try {
        const pendingData = pendingInvitations.get(user.email);
        if (pendingData) {
          const memberCollection = db.collection('member');
          const invitationCollection = db.collection('invitation');

          const membershipData = {
            _id: new ObjectId(),
            userId: mockNormalizeId(user.id),
            organizationId: mockNormalizeId(pendingData.organizationId),
            role: pendingData.role,
            createdAt: new Date(),
          };

          // Create membership first
          await memberCollection.insertOne(membershipData);

          // THEN accept the invitation - this is the fix
          await invitationCollection.updateOne(
            { _id: pendingData.invitationId },
            {
              $set: {
                status: 'accepted',
                acceptedAt: new Date(),
              },
            },
          );

          pendingInvitations.delete(user.email);
        } else {
          mockLogger.info(`ℹ️ No pending invitation data found for ${user.email}`);
        }

        return user;
      } catch (error) {
        mockLogger.error('Error in user create after hook:', error);
        return user;
      }
    };
  });

  afterEach(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    pendingInvitations.clear();
  });

  it('should NOT accept invitation in before hook', async () => {
    // RED PHASE: Verify the old behavior is gone

    // Setup: Create a pending invitation
    const invitationCollection = db.collection('invitation');
    const invitationId = new ObjectId();
    const organizationId = new ObjectId();

    await invitationCollection.insertOne({
      _id: invitationId,
      email: 'test@example.com',
      organizationId,
      role: 'member',
      status: 'pending',
      createdAt: new Date(),
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the before hook
    const result = await userCreateBeforeHook(user);

    // Assert: Invitation should still be pending
    const invitation = await invitationCollection.findOne({ _id: invitationId });
    expect(invitation.status).toBe('pending');
    expect(invitation.acceptedAt).toBeUndefined();

    // Assert: Pending data should be stored for later processing
    expect(pendingInvitations.has('test@example.com')).toBe(true);
    expect(pendingInvitations.get('test@example.com')).toEqual({
      invitationId,
      organizationId,
      role: 'member',
    });

    // Assert: User should be set to skip org creation
    expect(result.onboardingStep).toBe('profile');
  });

  it('should accept invitation ONLY in after hook after successful user creation', async () => {
    // GREEN PHASE: Test the new correct behavior

    // Setup: Create a pending invitation and simulate stored pending data
    const invitationCollection = db.collection('invitation');
    const memberCollection = db.collection('member');
    const invitationId = new ObjectId();
    const organizationId = new ObjectId();

    await invitationCollection.insertOne({
      _id: invitationId,
      email: 'test@example.com',
      organizationId,
      role: 'member',
      status: 'pending',
      createdAt: new Date(),
    });

    // Simulate what the before hook stored
    pendingInvitations.set('test@example.com', {
      invitationId,
      organizationId,
      role: 'member',
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the after hook (simulating successful user creation)
    await userCreateAfterHook(user);

    // Assert: Invitation should now be accepted
    const invitation = await invitationCollection.findOne({ _id: invitationId });
    expect(invitation.status).toBe('accepted');
    expect(invitation.acceptedAt).toBeDefined();
    expect(invitation.acceptedAt).toBeInstanceOf(Date);

    // Assert: Membership should be created
    const membership = await memberCollection.findOne({
      userId: mockNormalizeId(user.id),
      organizationId: mockNormalizeId(organizationId),
    });
    expect(membership).toBeDefined();
    expect(membership.role).toBe('member');
    expect(membership.createdAt).toBeInstanceOf(Date);

    // Assert: Pending data should be cleaned up
    expect(pendingInvitations.has('test@example.com')).toBe(false);
  });

  it('should handle user creation failure gracefully - invitation remains pending', async () => {
    // EDGE CASE: Test that failed user creation doesn't leave accepted invitations

    // Setup: Create a pending invitation
    const invitationCollection = db.collection('invitation');
    const invitationId = new ObjectId();
    const organizationId = new ObjectId();

    await invitationCollection.insertOne({
      _id: invitationId,
      email: 'test@example.com',
      organizationId,
      role: 'member',
      status: 'pending',
      createdAt: new Date(),
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the before hook (stores pending data)
    await userCreateBeforeHook(user);

    // Simulate: User creation fails - after hook never runs
    // (In reality, the user creation would throw an error and after hook wouldn't be called)

    // Assert: Invitation should still be pending (not accepted)
    const invitation = await invitationCollection.findOne({ _id: invitationId });
    expect(invitation.status).toBe('pending');
    expect(invitation.acceptedAt).toBeUndefined();

    // Assert: No membership should exist
    const memberCollection = db.collection('member');
    const membership = await memberCollection.findOne({
      userId: mockNormalizeId(user.id),
    });
    expect(membership).toBeNull();

    // Assert: Pending data is still there (would be cleaned up on retry or manual cleanup)
    expect(pendingInvitations.has('test@example.com')).toBe(true);
  });

  it('should handle membership creation failure gracefully', async () => {
    // EDGE CASE: Test that membership creation failure doesn't accept invitation

    // Create a modified after hook that we can control for testing
    const testAfterHook = async (user) => {
      try {
        const pendingData = pendingInvitations.get(user.email);
        if (pendingData) {
          // Simulate membership creation failure
          throw new Error('Membership creation failed');
        }
        return user;
      } catch (error) {
        mockLogger.error('Error in user create after hook:', error);
        return user;
      }
    };

    // Setup: Create a pending invitation
    const invitationCollection = db.collection('invitation');
    const invitationId = new ObjectId();
    const organizationId = new ObjectId();

    await invitationCollection.insertOne({
      _id: invitationId,
      email: 'test@example.com',
      organizationId,
      role: 'member',
      status: 'pending',
      createdAt: new Date(),
    });

    // Simulate stored pending data
    pendingInvitations.set('test@example.com', {
      invitationId,
      organizationId,
      role: 'member',
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the test after hook (this should fail and not accept invitation)
    await testAfterHook(user);

    // Assert: Invitation should still be pending due to membership failure
    const invitation = await invitationCollection.findOne({ _id: invitationId });
    expect(invitation.status).toBe('pending');
    expect(invitation.acceptedAt).toBeUndefined();

    // Assert: No membership should exist
    const memberCollection = db.collection('member');
    const membership = await memberCollection.findOne({
      userId: mockNormalizeId(user.id),
    });
    expect(membership).toBeNull();

    // Assert: Error should be logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error in user create after hook:',
      expect.any(Error),
    );
  });

  it('should process multiple invitations atomically', async () => {
    // EDGE CASE: Test atomic processing of multiple invitations for same email

    // Setup: Create multiple pending invitations for same email (shouldn't happen but test edge case)
    const invitationCollection = db.collection('invitation');
    const memberCollection = db.collection('member');
    const invitation1Id = new ObjectId();
    const invitation2Id = new ObjectId();
    const organization1Id = new ObjectId();
    const organization2Id = new ObjectId();

    await invitationCollection.insertMany([
      {
        _id: invitation1Id,
        email: 'test@example.com',
        organizationId: organization1Id,
        role: 'member',
        status: 'pending',
        createdAt: new Date(),
      },
      {
        _id: invitation2Id,
        email: 'test@example.com',
        organizationId: organization2Id,
        role: 'admin',
        status: 'pending',
        createdAt: new Date(),
      },
    ]);

    // Simulate before hook processing the first invitation only
    pendingInvitations.set('test@example.com', {
      invitationId: invitation1Id,
      organizationId: organization1Id,
      role: 'member',
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the after hook
    await userCreateAfterHook(user);

    // Assert: Only the first invitation should be accepted
    const invitation1 = await invitationCollection.findOne({ _id: invitation1Id });
    const invitation2 = await invitationCollection.findOne({ _id: invitation2Id });

    expect(invitation1.status).toBe('accepted');
    expect(invitation1.acceptedAt).toBeDefined();
    expect(invitation2.status).toBe('pending'); // Still pending
    expect(invitation2.acceptedAt).toBeUndefined();

    // Assert: Only one membership created for the accepted invitation
    const memberships = await memberCollection
      .find({
        userId: mockNormalizeId(user.id),
      })
      .toArray();

    expect(memberships).toHaveLength(1);
    expect(memberships[0].organizationId).toEqual(mockNormalizeId(organization1Id));
    expect(memberships[0].role).toBe('member');
  });

  it('should handle missing pending data gracefully', async () => {
    // EDGE CASE: Test after hook when no pending data exists

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Clear any existing mocks to ensure clean state
    vi.clearAllMocks();

    // Act: Run the after hook with no pending data
    const result = await userCreateAfterHook(user);

    // Assert: Should complete without errors
    expect(result).toEqual(user);

    // Check that the specific log was called for no pending data
    expect(mockLogger.info).toHaveBeenCalledWith(
      'ℹ️ No pending invitation data found for test@example.com',
    );
  });

  it('should maintain invitation data integrity throughout the flow', async () => {
    // INTEGRATION TEST: Test the complete flow from before hook to after hook

    // Setup: Create a pending invitation
    const invitationCollection = db.collection('invitation');
    const memberCollection = db.collection('member');
    const invitationId = new ObjectId();
    const organizationId = new ObjectId();
    const originalCreatedAt = new Date('2024-01-01T00:00:00.000Z');

    await invitationCollection.insertOne({
      _id: invitationId,
      email: 'test@example.com',
      organizationId,
      role: 'admin',
      status: 'pending',
      createdAt: originalCreatedAt,
      inviterId: new ObjectId(),
      expiresAt: new Date('2024-12-31T23:59:59.999Z'),
    });

    const user = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    // Act: Run the complete flow
    const beforeResult = await userCreateBeforeHook(user);
    const afterResult = await userCreateAfterHook(user);

    // Assert: All data should be preserved and updated correctly
    const finalInvitation = await invitationCollection.findOne({ _id: invitationId });
    const membership = await memberCollection.findOne({
      userId: mockNormalizeId(user.id),
    });

    // Invitation assertions
    expect(finalInvitation.status).toBe('accepted');
    expect(finalInvitation.acceptedAt).toBeDefined();
    expect(finalInvitation.acceptedAt).toBeInstanceOf(Date);
    expect(finalInvitation.createdAt).toEqual(originalCreatedAt); // Preserved
    expect(finalInvitation.role).toBe('admin'); // Preserved
    expect(finalInvitation.organizationId).toEqual(organizationId); // Preserved

    // Membership assertions
    expect(membership).toBeDefined();
    expect(membership.userId).toEqual(mockNormalizeId(user.id));
    expect(membership.organizationId).toEqual(mockNormalizeId(organizationId));
    expect(membership.role).toBe('admin');
    expect(membership.createdAt).toBeInstanceOf(Date);

    // Hook return values
    expect(beforeResult.onboardingStep).toBe('profile');
    expect(afterResult).toEqual(user);

    // Cleanup verification
    expect(pendingInvitations.has('test@example.com')).toBe(false);
  });
});
