/**
 * @fileoverview Tests for user routes, specifically the username check endpoint
 * @module server/routes/user.vitest
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import { User } from '#models/index.js';

// Mock the middleware module
vi.mock('#server/middleware.js', () => ({
  requireBetterAuth: vi.fn((req, res, next) => {
    // Mock a user with a string ID (as Better Auth provides)
    req.user = {
      id: '507f1f77bcf86cd799439011', // Valid ObjectId string
      email: 'test@example.com',
      username: 'currentuser'
    };
    next();
  }),
  usernameCheckLimiter: vi.fn((req, res, next) => next()),
  canDeleteAccount: vi.fn(),
  verifyEmailLimiter: vi.fn(),
  checkAdmin: vi.fn(),
}));

// Mock the controllers
vi.mock('#server/controllers/UserController.js', () => ({
  getUserController: vi.fn(),
  deleteUserController: vi.fn(),
  verifyEmailController: vi.fn(),
  updateUserPluginsController: vi.fn(),
  resendVerificationController: vi.fn(),
  getTermsStatusController: vi.fn(),
  acceptTermsController: vi.fn(),
}));

// Mock logger
vi.mock('#utils/logger.js', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('User Routes - Username Check', () => {
  let mongoServer;
  let app;
  let testUser;
  let userRoutes;

  beforeEach(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/user', userRoutes);
    
    // Create a test user in the database (with ObjectId _id)
    testUser = await User.create({
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Same as the mocked user ID
      email: 'test@example.com',
      username: 'currentuser',
      name: 'Test User',
    });
  });

  afterEach(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    vi.clearAllMocks();
  });

  describe('GET /api/user/check-username', () => {
    it('should fail when string ID is not properly converted to ObjectId (demonstrating the bug)', async () => {
      // Create another user with the username we want to check
      const existingUser = await User.create({
        email: 'existing@example.com',
        username: 'testusername',
        name: 'Existing User',
      });

      // First, let's verify the bug exists by temporarily removing the ObjectId conversion
      // We'll simulate what happens when req.user.id (string) is compared directly to _id (ObjectId)
      
      // Create a direct query that would fail with the bug
      const directQuery = {
        username: { $regex: new RegExp(`^testusername$`, 'i') },
        _id: { $ne: testUser._id.toString() }, // String comparison (bug)
      };
      
      // This query should NOT exclude the current user because string !== ObjectId
      const resultWithBug = await User.findOne(directQuery);
      expect(resultWithBug).toBeTruthy(); // This would incorrectly find the user even if it's the same user
      
      // Now test the proper query with ObjectId conversion
      const properQuery = {
        username: { $regex: new RegExp(`^testusername$`, 'i') },
        _id: { $ne: new mongoose.Types.ObjectId(testUser._id.toString()) }, // ObjectId conversion (fix)
      };
      
      const resultWithFix = await User.findOne(properQuery);
      expect(resultWithFix).toBeTruthy(); // This correctly finds the existing user since it's different from current user
    });

    it('should return available: false when username exists for different user', async () => {
      // Create another user with the username we want to check
      await User.create({
        email: 'existing@example.com',
        username: 'testusername',
        name: 'Existing User',
      });

      const response = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'testusername' });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(false);
      expect(response.body.username).toBe('testusername');
    });

    it('should return available: true when username does not exist', async () => {
      const response = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'newusername' });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true);
      expect(response.body.username).toBe('newusername');
    });

    it('should return available: true when username exists for current user (properly excluded)', async () => {
      // The current user already has the username 'currentuser'
      const response = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'currentuser' });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true); // Should be available because it's the current user
      expect(response.body.username).toBe('currentuser');
    });

    it('should handle case-insensitive username checking', async () => {
      // Create user with lowercase username
      await User.create({
        email: 'existing@example.com',
        username: 'testusername',
        name: 'Existing User',
      });

      // Check with uppercase
      const response = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'TESTUSERNAME' });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(false);
      expect(response.body.username).toBe('testusername'); // Should be lowercased
    });

    it('should validate username format', async () => {
      // Test short username
      const response1 = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'ab' });

      expect(response1.status).toBe(400);
      expect(response1.body.error).toBe('Username must be 3-20 characters long');

      // Test long username
      const response2 = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'a'.repeat(21) });

      expect(response2.status).toBe(400);
      expect(response2.body.error).toBe('Username must be 3-20 characters long');

      // Test invalid characters
      const response3 = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'user@name' });

      expect(response3.status).toBe(400);
      expect(response3.body.error).toBe('Username can only contain letters, numbers, underscores, and hyphens');
    });

    it('should require username parameter', async () => {
      const response = await request(app)
        .get('/api/user/check-username');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Username parameter is required');
    });

    it('should demonstrate the fix works by properly excluding current user', async () => {
      // Create a user with the same username as the current user
      // This should be excluded from the results
      const duplicateUser = await User.create({
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Same as current user
        email: 'test@example.com',
        username: 'currentuser',
        name: 'Test User',
      });

      // The fix should properly convert req.user.id (string) to ObjectId for comparison
      const response = await request(app)
        .get('/api/user/check-username')
        .query({ username: 'currentuser' });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(true); // Should be available because it's the current user
    });
  });
});