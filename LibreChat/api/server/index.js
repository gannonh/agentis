import 'dotenv/config';

// Add uncaught exception handler at the very beginning
process.on('uncaughtException', (err) => {
  console.error('🔍 UNCAUGHT EXCEPTION - Full Error:', err);
  console.error('🔍 Stack trace:', err.stack);
  console.error('🔍 Error name:', err.name);
  console.error('🔍 Error message:', err.message);

  // Don't exit immediately to see if we can get more info
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔍 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import axios from 'axios';
import express from 'express';
import compression from 'compression';
import passport from 'passport';
import mongoSanitize from 'express-mongo-sanitize';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';
import { getAuth } from '#auth.js';
// Legacy strategies removed - using Better Auth now
import { connectDb, indexSync } from '../lib/db/index.js';
import { ensureBetterAuthCollections } from '../db/migrations/ensure-better-auth-collections.js';
import { ensureActiveOrganizationInSessions } from '../db/migrations/ensure-active-organization-in-sessions.js';
import { isEnabled } from './utils/index.js';
import { logger } from '#config/index.js';
import validateImageRequest from './middleware/validateImageRequest.js';
import errorController from './controllers/ErrorController.js';
import configureSocialLogins from './socialLogins.js';
import AppService from './services/AppService.js';
import staticCache from './utils/staticCache.js';
import noIndex from './middleware/noIndex.js';
import * as routes from './routes/index.js';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PORT, HOST, ALLOW_SOCIAL_LOGIN, DISABLE_COMPRESSION, TRUST_PROXY } = process.env ?? {};

// Allow PORT=0 to be used for automatic free port assignment
const port = isNaN(Number(PORT)) ? 3080 : Number(PORT);
const host = HOST || 'localhost';
const trusted_proxy = Number(TRUST_PROXY) || 1; /* trust first proxy by default */

const app = express();

const startServer = async () => {
  if (typeof Bun !== 'undefined') {
    axios.defaults.headers.common['Accept-Encoding'] = 'gzip';
  }
  await connectDb();
  logger.info('Connected to MongoDB');

  // Ensure Better Auth collections exist
  try {
    await ensureBetterAuthCollections();
  } catch (error) {
    logger.error('Failed to ensure Better Auth collections:', error);
    // Continue anyway - Better Auth might create them on first use
  }

  // Ensure existing sessions have activeOrganizationId set
  try {
    const db = mongoose.connection.db;
    await ensureActiveOrganizationInSessions(db);
  } catch (error) {
    logger.error('Failed to update sessions with active organization:', error);
    // Continue anyway - not critical for app startup
  }

  await indexSync();

  // Load public domains for organization domain join security checks
  try {
    const { loadPublicDomains } = await import('./services/PublicDomainService.js');
    const loaded = await loadPublicDomains();
    if (loaded) {
      logger.info('✅ Public domains loaded successfully for domain join security');
    } else {
      logger.warn('⚠️ Failed to load public domains - domain join security may be affected');
    }
  } catch (error) {
    logger.error('❌ Error loading public domains:', error);
    // Continue anyway - not critical for basic app functionality
  }

  app.disable('x-powered-by');
  app.set('trust proxy', trusted_proxy);

  await AppService(app);

  const indexPath = path.join(app.locals.paths.dist, 'index.html');
  const indexHTML = fs.readFileSync(indexPath, 'utf8');

  app.get('/health', (_req, res) => res.status(200).send('OK'));

  // Test endpoint to debug Better Auth
  app.get('/test-auth', async (req, res) => {
    try {
      const authInstance = getAuth();
      if (!authInstance) {
        return res.json({ error: 'Auth not ready' });
      }

      // Try to call Better Auth's API directly
      const testResult = await authInstance.api.getSession({
        headers: req.headers,
      });

      res.json({ success: true, session: testResult });
    } catch (error) {
      console.error('Test auth error:', error);
      res.json({ error: error.message, stack: error.stack });
    }
  });

  /* CORS must be applied before Better Auth */
  app.use(
    cors({
      origin: ['http://localhost:3090', 'http://localhost:3000', 'https://agentis.ai'],
      credentials: true,
    }),
  );

  /* Organization detection endpoint - outside /api/auth to avoid Better Auth conflicts */
  app.post('/api/organization/detect-domain', express.json(), async (req, res) => {
    try {
      const { checkDomainOrganizations } = await import(
        './services/OrganizationDetectionService.js'
      );
      const { logger } = await import('#config/index.js');

      const { email, inviteToken } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }

      // Validate email format and ensure domain exists
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
        });
      }

      const emailParts = email.split('@');
      if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].trim() === '') {
        return res.status(400).json({
          error: 'Invalid email format - missing or empty domain',
        });
      }

      // Build invite context if token is provided
      let inviteContext = null;
      if (inviteToken) {
        inviteContext = {
          inviteToken,
        };
      }

      const result = await checkDomainOrganizations(email, inviteContext);
      res.json(result);
    } catch (error) {
      logger.error('Error detecting organization domain:', error);
      res.status(500).json({
        error: 'Failed to detect organization',
        message: error.message,
      });
    }
  });

  /* Enable domain join for organization */
  app.post('/api/organization/enable-domain-join', express.json(), async (req, res) => {
    try {
      const { isPublicDomain } = await import('./services/PublicDomainService.js');
      const { logger } = await import('#config/index.js');

      const { organizationId, domain } = req.body;

      logger.info('Domain join request received:', {
        organizationId,
        organizationIdType: typeof organizationId,
        domain,
        body: req.body
      });

      if (!organizationId || !domain) {
        return res.status(400).json({
          error: 'Organization ID and domain are required',
        });
      }

      // Validate organizationId format (should be a string, not necessarily ObjectId)
      if (typeof organizationId !== 'string' || organizationId.trim() === '') {
        return res.status(400).json({
          error: 'Invalid organization ID format',
        });
      }

      // Validate domain format (should be a valid domain, not email)
      const domainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({
          error: 'Invalid domain format',
        });
      }

      // Security check: Prevent enabling domain join for public domains
      if (isPublicDomain(domain)) {
        logger.warn(`Attempt to enable domain join for public domain: ${domain}`);
        return res.status(400).json({
          error: 'Cannot enable domain join for public email domains',
        });
      }

      // Use Better Auth's API to update organization instead of raw MongoDB queries
      const authInstance = getAuth();
      if (!authInstance) {
        return res.status(503).json({
          error: 'Authentication service not available',
        });
      }

      try {
        // Use Better Auth's organization API to update the organization
        // This should handle the ID conversion and querying properly
        const db = mongoose.connection.db;
        
        // Better Auth stores organizations with string IDs, let's try both approaches
        let result;
        
        // First try: Use the organizationId as-is (Better Auth string ID)
        result = await db.collection('organization').updateOne(
          { id: organizationId },
          {
            $set: {
              'metadata.domain': domain,
              'metadata.allowDomainJoin': true,
            },
          },
        );
        
        // If no match, try converting to ObjectId for _id field
        if (result.matchedCount === 0) {
          const mongoose = await import('mongoose');
          try {
            const objectId = new mongoose.Types.ObjectId(organizationId);
            result = await db.collection('organization').updateOne(
              { _id: objectId },
              {
                $set: {
                  'metadata.domain': domain,
                  'metadata.allowDomainJoin': true,
                },
              },
            );
            logger.info(`Used _id field for organization update: ${organizationId}`);
          } catch (convertError) {
            logger.error(`Failed to convert organizationId to ObjectId: ${organizationId}`, convertError);
          }
        } else {
          logger.info(`Used id field for organization update: ${organizationId}`);
        }
        
        logger.info(`Domain join update result:`, {
          organizationId,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          acknowledged: result.acknowledged
        });

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Organization not found',
          });
        }

        logger.info(`Domain join enabled for organization ${organizationId} with domain ${domain}`);
        res.json({ success: true });
      } catch (convertError) {
        logger.error('Error in dual organization query approach:', convertError);
      }
    } catch (error) {
      logger.error('Error enabling domain join:', error);
      res.status(500).json({
        error: 'Failed to enable domain join',
        message: error.message,
      });
    }
  });

  /* Better Auth handler - MUST come before JSON parsing per docs */
  app.all('/api/auth/*', (req, res) => {
    const authInstance = getAuth();
    if (!authInstance) {
      return res.status(503).json({
        error: 'Authentication service is starting up. Please try again in a moment.',
      });
    }

    // Debug magic link requests (development only)
    if (req.path.includes('magic-link') && process.env.NODE_ENV === 'development') {
      console.log('🔍 Magic Link Request Debug:');
      console.log('  Method:', req.method);
      console.log('  Path:', req.path);
      console.log('  Query:', req.query);
      console.log('  Headers:', JSON.stringify(req.headers, null, 2));
      console.log('  Body:', req.body);
      console.log('  Raw body available:', !!req.body);

      // Debug query parameters for verification
      if (req.path.includes('verify')) {
        console.log('🔗 Magic Link Verify Request:');
        console.log('  Token in query:', req.query.token);
        console.log('  All query params:', JSON.stringify(req.query, null, 2));
      }
    }

    return toNodeHandler(authInstance)(req, res);
  });

  /* Middleware - JSON parsing comes AFTER Better Auth per docs */
  app.use(noIndex);
  app.use(errorController);
  app.use(express.json({ limit: '3mb' }));
  app.use(express.urlencoded({ extended: true, limit: '3mb' }));
  app.use(mongoSanitize());
  app.use(cookieParser());

  if (!isEnabled(DISABLE_COMPRESSION)) {
    app.use(compression());
  } else {
    console.warn('Response compression has been disabled via DISABLE_COMPRESSION.');
  }

  // Serve static assets with aggressive caching
  app.use(staticCache(app.locals.paths.dist));
  app.use(staticCache(app.locals.paths.fonts));
  app.use(staticCache(app.locals.paths.assets));

  if (!ALLOW_SOCIAL_LOGIN) {
    console.warn('Social logins are disabled. Set ALLOW_SOCIAL_LOGIN=true to enable them.');
  }

  /* Passport.js for legacy auth (JWT/local/LDAP only) */
  app.use(passport.initialize());
  // Note: JWT, local, and LDAP strategies need to be restored if needed

  if (isEnabled(ALLOW_SOCIAL_LOGIN)) {
    configureSocialLogins(app);
  }

  /* Custom Better Auth endpoints */
  // Organization domain detection endpoint
  app.get('/api/auth/organization/check-domain', async (req, res) => {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
      }

      const domain = email.split('@')[1];
      if (!domain) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // For now, return a basic response - later we can implement actual organization checking
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏢 Organization domain check for: ${domain}`);
      }

      // Mock response - assume new domain for now
      res.json({
        exists: false,
        isNewDomain: true,
        domain: domain,
      });
    } catch (error) {
      console.error('Organization domain check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  /* API Endpoints */
  app.use('/api/actions', routes.actions);
  app.use('/api/keys', routes.keys);
  app.use('/api/user', routes.user);
  app.use('/api/admin/organizations', routes.adminOrganizations);
  app.use('/api/ask', routes.ask);
  app.use('/api/search', routes.search);
  app.use('/api/edit', routes.edit);
  app.use('/api/messages', routes.messages);
  app.use('/api/convos', routes.convos);
  app.use('/api/presets', routes.presets);
  app.use('/api/prompts', routes.prompts);
  app.use('/api/categories', routes.categories);
  app.use('/api/tokenizer', routes.tokenizer);
  app.use('/api/endpoints', routes.endpoints);
  app.use('/api/balance', routes.balance);
  app.use('/api/models', routes.models);
  app.use('/api/plugins', routes.plugins);
  app.use('/api/config', routes.config);
  app.use('/api/assistants', routes.assistants);
  app.use('/api/files', await routes.files.initialize());
  app.use('/images/', validateImageRequest, routes.staticRoute);
  app.use('/api/share', routes.share);
  app.use('/api/roles', routes.roles);
  app.use('/api/agents', routes.agents);
  app.use('/api/banner', routes.banner);
  app.use('/api/bedrock', routes.bedrock);

  app.use('/api/tags', routes.tags);
  app.use('/api/composio', routes.composio);
  app.use('/api/mcp/diagnostics', routes.mcpDiagnostics);
  app.use('/api', routes.invitations);

  app.use((req, res) => {
    res.set({
      'Cache-Control': process.env.INDEX_CACHE_CONTROL || 'no-cache, no-store, must-revalidate',
      Pragma: process.env.INDEX_PRAGMA || 'no-cache',
      Expires: process.env.INDEX_EXPIRES || '0',
    });

    const lang = req.cookies.lang || req.headers['accept-language']?.split(',')[0] || 'en-US';
    const saneLang = lang.replace(/"/g, '&quot;');
    const updatedIndexHtml = indexHTML.replace(/lang="en-US"/g, `lang="${saneLang}"`);
    res.type('html');
    res.send(updatedIndexHtml);
  });

  app.listen(port, host, () => {
    if (host === '0.0.0.0') {
      logger.info(
        `Server listening on all interfaces at port ${port}. Use http://localhost:${port} to access it`,
      );
    } else {
      logger.info(`Server listening at http://${host == '0.0.0.0' ? 'localhost' : host}:${port}`);
    }
  });
};

startServer();

let messageCount = 0;
process.on('uncaughtException', (err) => {
  if (!err.message.includes('fetch failed')) {
    logger.error('There was an uncaught error:', err);
  }

  if (err.message.includes('abort')) {
    logger.warn('There was an uncatchable AbortController error.');
    return;
  }

  if (err.message.includes('GoogleGenerativeAI')) {
    logger.warn(
      '\n\n`GoogleGenerativeAI` errors cannot be caught due to an upstream issue, see: https://github.com/google-gemini/generative-ai-js/issues/303',
    );
    return;
  }

  if (err.message.includes('fetch failed')) {
    if (messageCount === 0) {
      logger.warn('Meilisearch error, search will be disabled');
      messageCount++;
    }

    return;
  }

  if (err.message.includes('OpenAIError') || err.message.includes('ChatCompletionMessage')) {
    logger.error(
      '\n\nAn Uncaught `OpenAIError` error may be due to your reverse-proxy setup or stream configuration, or a bug in the `openai` node package.',
    );
    return;
  }

  process.exit(1);
});

// export app for easier testing purposes
export default app;
