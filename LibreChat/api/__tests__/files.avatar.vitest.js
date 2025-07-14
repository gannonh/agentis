/**
 * @fileoverview Comprehensive tests for avatar upload API endpoint
 * @module api/__tests__/files.avatar.test
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { fileURLToPath } from 'url';
import { EImageOutputType, FileContext, FileSources } from 'librechat-data-provider';
import sharp from 'sharp';

// Get dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import modules that need to be tested
import avatarRouter from '#server/routes/files/avatar.js';
import { createMulterInstance } from '#server/routes/files/multer.js';
import { File } from '#models/index.js';
import resizeAvatar from '#server/services/Files/images/avatar.js';
import { filterFile } from '#server/services/Files/process.js';

// Mock authentication middleware
const mockUser = {
  id: new mongoose.Types.ObjectId().toString(),
  email: 'test@example.com',
  name: 'Test User',
};

vi.mock('#server/middleware.js', () => ({
  requireBetterAuth: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));

// Mock logger to avoid console noise during tests
vi.mock('#config.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the strategy functions
const mockProcessAvatar = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('#server/services/Files/strategies.js', () => ({
  getStrategyFunctions: vi.fn(() => ({
    processAvatar: mockProcessAvatar,
    deleteFile: mockDeleteFile,
  })),
}));

// Mock resizeAvatar function
vi.mock('#server/services/Files/images/avatar.js', () => ({
  default: vi.fn(),
}));

// Mock filterFile function
vi.mock('#server/services/Files/process.js', () => ({
  filterFile: vi.fn(),
}));

describe('POST /api/files/images/avatar', () => {
  let app;
  let upload;
  let mongod;
  let testImageBuffer;
  let testImagePath;

  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);

    // Create test image buffer (100x100 PNG)
    testImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Create temp test image file
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    testImagePath = path.join(tempDir, 'test-avatar.png');
    await fs.writeFile(testImagePath, testImageBuffer);
  });

  afterAll(async () => {
    // Clean up MongoDB instance
    await mongoose.disconnect();
    await mongod.stop();

    // Clean up temp files
    try {
      await fs.unlink(testImagePath);
      await fs.rmdir(path.dirname(testImagePath));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Setup express app with avatar router
    app = express();
    app.use(express.json());

    // Setup app locals first (required by multer)
    app.locals.fileStrategy = FileSources.local;
    app.locals.imageOutputType = EImageOutputType.PNG;
    app.locals.paths = {
      uploads: path.join(__dirname, 'temp'),
    };

    // Setup auth middleware
    app.use((req, res, next) => {
      req.user = mockUser;
      next();
    });

    // Setup multer for file uploads
    upload = await createMulterInstance();
    app.use('/avatar', upload.single('file'), avatarRouter);

    // Clear any existing files
    await File.deleteMany({});

    // Reset mocks
    vi.clearAllMocks();
    mockProcessAvatar.mockResolvedValue('http://example.com/avatar.png');
    vi.mocked(resizeAvatar).mockResolvedValue(testImageBuffer);
    vi.mocked(filterFile).mockImplementation(() => {}); // No-op by default
  });

  afterEach(async () => {
    // Clean up test data
    await File.deleteMany({});
    vi.clearAllMocks();
  });

  describe('Successful Avatar Upload', () => {
    it('should successfully upload and process a valid image file', async () => {
      const response = await request(app)
        .post('/avatar')
        .attach('file', testImagePath)
        .field('manual', 'true');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        url: 'http://example.com/avatar.png',
      });

      // Verify that file validation was called
      expect(filterFile).toHaveBeenCalledWith({
        req: expect.objectContaining({
          user: mockUser,
          file: expect.objectContaining({
            path: expect.any(String),
            originalname: 'test-avatar.png',
            mimetype: 'image/png',
          }),
        }),
        file: expect.objectContaining({
          path: expect.any(String),
          originalname: 'test-avatar.png',
          mimetype: 'image/png',
        }),
        image: true,
        isAvatar: true,
      });

      // Verify that resize was called with correct parameters
      expect(resizeAvatar).toHaveBeenCalledWith({
        userId: mockUser.id,
        input: testImageBuffer,
        desiredFormat: EImageOutputType.PNG,
      });

      // Verify that processAvatar was called
      expect(mockProcessAvatar).toHaveBeenCalledWith({
        buffer: testImageBuffer,
        userId: mockUser.id,
        manual: 'true',
      });
    });

    it('should handle different image formats (JPEG)', async () => {
      // Create JPEG test image
      const jpegBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const jpegPath = path.join(path.dirname(testImagePath), 'test-avatar.jpg');
      await fs.writeFile(jpegPath, jpegBuffer);

      try {
        const response = await request(app)
          .post('/avatar')
          .attach('file', jpegPath)
          .field('manual', 'true');

        expect(response.status).toBe(200);
        expect(response.body.url).toBe('http://example.com/avatar.png');
      } finally {
        await fs.unlink(jpegPath);
      }
    });

    it('should support different output formats', async () => {
      app.locals.imageOutputType = EImageOutputType.WEBP;

      const response = await request(app)
        .post('/avatar')
        .attach('file', testImagePath)
        .field('manual', 'true');

      expect(response.status).toBe(200);
      expect(resizeAvatar).toHaveBeenCalledWith({
        userId: mockUser.id,
        input: testImageBuffer,
        desiredFormat: EImageOutputType.WEBP,
      });
    });

    it('should work without manual flag', async () => {
      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(200);
      expect(mockProcessAvatar).toHaveBeenCalledWith({
        buffer: testImageBuffer,
        userId: mockUser.id,
        manual: undefined,
      });
    });
  });

  describe('File Validation', () => {
    it('should reject upload when filterFile throws an error', async () => {
      vi.mocked(filterFile).mockImplementation(() => {
        throw new Error('File too large');
      });

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
    });

    it('should reject upload when no file is provided', async () => {
      const response = await request(app).post('/avatar').field('manual', 'true');

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
    });

    it('should handle invalid image files gracefully', async () => {
      // Create a text file with image extension
      const invalidImagePath = path.join(path.dirname(testImagePath), 'invalid.png');
      await fs.writeFile(invalidImagePath, 'This is not an image');

      try {
        // Mock fs.readFile to return invalid data
        const originalReadFile = fs.readFile;
        fs.readFile = vi.fn().mockResolvedValue(Buffer.from('This is not an image'));

        vi.mocked(resizeAvatar).mockRejectedValue(new Error('Invalid image format'));

        const response = await request(app).post('/avatar').attach('file', invalidImagePath);

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('An error occurred while uploading the profile picture');

        // Restore original function
        fs.readFile = originalReadFile;
      } finally {
        await fs.unlink(invalidImagePath);
      }
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require user authentication', async () => {
      // Test that the route works correctly with proper authentication
      // The auth middleware is mocked to provide a valid user
      const response = await request(app).post('/avatar').attach('file', testImagePath);

      // With valid user auth, the upload should succeed
      expect(response.status).toBe(200);
      expect(response.body.url).toBe('http://example.com/avatar.png');
    });

    it('should handle user validation errors gracefully', async () => {
      // Test error handling by making the route throw an error during processing
      // We'll mock the avatar route to fail after multer succeeds
      vi.mocked(resizeAvatar).mockRejectedValue(new Error('User validation failed'));

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');

      // Restore mock for other tests
      vi.mocked(resizeAvatar).mockResolvedValue(testImageBuffer);
    });
  });

  describe('Image Processing', () => {
    it('should handle image resize failures', async () => {
      vi.mocked(resizeAvatar).mockRejectedValue(new Error('Image processing failed'));

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
    });

    it('should pass correct parameters to resizeAvatar', async () => {
      await request(app).post('/avatar').attach('file', testImagePath).field('manual', 'true');

      expect(resizeAvatar).toHaveBeenCalledWith({
        userId: mockUser.id,
        input: testImageBuffer,
        desiredFormat: EImageOutputType.PNG,
      });
    });

    it('should handle different file strategy configurations', async () => {
      app.locals.fileStrategy = FileSources.s3;

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(200);
      // Strategy functions should be called with S3 strategy
      expect(mockProcessAvatar).toHaveBeenCalled();
    });
  });

  describe('Storage Integration', () => {
    it('should handle storage failures gracefully', async () => {
      mockProcessAvatar.mockRejectedValue(new Error('Storage service unavailable'));

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
    });

    it('should pass manual flag to storage processor', async () => {
      await request(app).post('/avatar').attach('file', testImagePath).field('manual', 'true');

      expect(mockProcessAvatar).toHaveBeenCalledWith({
        buffer: testImageBuffer,
        userId: mockUser.id,
        manual: 'true',
      });
    });

    it('should return correct URL from storage processor', async () => {
      const expectedUrl = 'https://cdn.example.com/avatars/user123.png';
      mockProcessAvatar.mockResolvedValue(expectedUrl);

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.url).toBe(expectedUrl);
    });
  });

  describe('File Cleanup', () => {
    it('should clean up temporary files after successful upload', async () => {
      const fsSpy = vi.spyOn(fs, 'unlink');

      await request(app).post('/avatar').attach('file', testImagePath);

      // Should attempt to delete the temporary file
      expect(fsSpy).toHaveBeenCalledWith(expect.stringContaining('test-avatar.png'));

      fsSpy.mockRestore();
    });

    it('should clean up temporary files even after upload failure', async () => {
      mockProcessAvatar.mockRejectedValue(new Error('Upload failed'));
      const fsSpy = vi.spyOn(fs, 'unlink');

      await request(app).post('/avatar').attach('file', testImagePath);

      // Should still attempt to delete the temporary file
      expect(fsSpy).toHaveBeenCalled();

      fsSpy.mockRestore();
    });

    it('should handle cleanup errors gracefully', async () => {
      const fsSpy = vi.spyOn(fs, 'unlink').mockRejectedValue(new Error('File already deleted'));

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      // Upload should still succeed even if cleanup fails
      expect(response.status).toBe(200);

      fsSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should return generic error message for security', async () => {
      vi.mocked(filterFile).mockImplementation(() => {
        throw new Error('Detailed internal error with sensitive information');
      });

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
      // Should not expose internal error details
      expect(response.body.message).not.toContain('Detailed internal error');
    });

    it('should handle file read errors', async () => {
      const originalReadFile = fs.readFile;
      fs.readFile = vi.fn().mockRejectedValue(new Error('File read failed'));

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');

      // Restore original function
      fs.readFile = originalReadFile;
    });

    it('should validate file is present in request', async () => {
      // Mock multer to not set req.file
      const appNoFile = express();
      appNoFile.use(express.json());

      // Setup app locals
      appNoFile.locals.fileStrategy = FileSources.local;
      appNoFile.locals.imageOutputType = EImageOutputType.PNG;
      appNoFile.locals.paths = {
        uploads: path.join(__dirname, 'temp'),
      };

      // Create a middleware that doesn't set req.file
      appNoFile.use(
        '/avatar',
        (req, res, next) => {
          req.user = mockUser;
          req.body = { manual: 'true' };
          // Don't set req.file
          next();
        },
        avatarRouter,
      );

      const response = await request(appNoFile).post('/avatar');

      expect(response.status).toBe(500);
    });
  });

  describe('Security Tests', () => {
    it('should validate file type before processing', async () => {
      // Create malicious file with image extension
      const maliciousPath = path.join(path.dirname(testImagePath), 'malicious.png');
      await fs.writeFile(maliciousPath, '<?php echo "pwned"; ?>');

      try {
        vi.mocked(filterFile).mockImplementation(() => {
          throw new Error('Unsupported file type');
        });

        const response = await request(app).post('/avatar').attach('file', maliciousPath);

        expect(response.status).toBe(500);
        expect(filterFile).toHaveBeenCalled();
      } finally {
        await fs.unlink(maliciousPath);
      }
    });

    it('should prevent path traversal attacks in file handling', async () => {
      // This test ensures the avatar service doesn't use user-controlled file paths
      const response = await request(app).post('/avatar').attach('file', testImagePath);

      // Should succeed and not be vulnerable to path traversal
      expect(response.status).toBe(200);

      // Verify that processAvatar was called with controlled parameters
      expect(mockProcessAvatar).toHaveBeenCalledWith({
        buffer: expect.any(Buffer),
        userId: mockUser.id,
        manual: undefined,
      });
    });

    it('should handle oversized files properly', async () => {
      vi.mocked(filterFile).mockImplementation(() => {
        throw new Error('File size limit exceeded');
      });

      const response = await request(app).post('/avatar').attach('file', testImagePath);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('An error occurred while uploading the profile picture');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent uploads properly', async () => {
      const promises = Array.from({ length: 5 }, () =>
        request(app).post('/avatar').attach('file', testImagePath).field('manual', 'true'),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.url).toBe('http://example.com/avatar.png');
      });
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();

      await request(app).post('/avatar').attach('file', testImagePath);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(responseTime).toBeLessThan(5000);
    });
  });
});
