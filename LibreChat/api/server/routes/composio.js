const express = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const composioService = require('~/server/services/ComposioService');
const { ComposioConnectedAccount } = require('~/models');
const { logger } = require('~/config');

const router = express.Router();

/**
 * POST /api/composio/auth/:service
 * Start authentication flow for a Composio service following proper OAuth flow
 */
router.post('/auth/:service', requireJwtAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user.id;

    logger.info(`[ComposioAuth] Starting OAuth flow for user ${userId}, service ${service}`);

    // Initiate connection following Composio docs
    const connectionResult = await composioService.initiateConnection(userId, service);

    res.json({
      success: true,
      redirectUrl: connectionResult.redirectUrl,
      connectedAccountId: connectionResult.connectedAccountId,
      connectionStatus: connectionResult.connectionStatus,
      service,
      message: `Please complete OAuth authorization for ${service}`,
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to start OAuth flow:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start OAuth flow',
    });
  }
});

/**
 * GET /api/composio/auth/:service (backwards compatibility)
 * Start authentication flow for a Composio service
 */
router.get('/auth/:service', requireJwtAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user.id;

    logger.info(`[ComposioAuth] Starting auth flow for user ${userId}, service ${service}`);

    // Get authorization URL from Composio
    const authUrl = await composioService.getAuthorizationUrl(userId, service);

    res.json({
      success: true,
      authUrl,
      service,
      message: `Please visit the URL to authorize access to ${service}`,
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to start auth flow:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start authentication flow',
    });
  }
});

/**
 * GET /api/composio/connection-status/:service
 * Check if user has an active connection for a service
 */
router.get('/connection-status/:service', requireJwtAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user.id;

    const hasConnection = await composioService.hasActiveConnection(userId, service);
    
    res.json({
      success: true,
      service,
      hasActiveConnection: hasConnection,
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to check connection status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check connection status',
    });
  }
});

/**
 * POST /api/composio/wait-for-connection
 * Wait for a connection to become active after OAuth
 */
router.post('/wait-for-connection', requireJwtAuth, async (req, res) => {
  try {
    const { service, connectedAccountId, timeoutSeconds = 180 } = req.body;
    const userId = req.user.id;

    if (!service || !connectedAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: service, connectedAccountId',
      });
    }

    logger.info(`[ComposioAuth] Waiting for connection ${connectedAccountId} to become active for user ${userId}, service ${service}`);

    const result = await composioService.waitForConnectionActive(userId, service, connectedAccountId, timeoutSeconds);
    
    res.json({
      success: true,
      service,
      connectedAccountId: result.connectedAccountId || connectedAccountId,
      isActive: result.isActive,
      message: result.isActive ? 'Connection is now active' : 'Connection did not become active within timeout',
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to wait for connection:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to wait for connection',
    });
  }
});

/**
 * GET /api/composio/connected-accounts
 * List all connected accounts for the current user
 */
router.get('/connected-accounts', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const connectedAccounts = await composioService.getUserConnectedAccounts(userId);
    
    res.json({
      success: true,
      connectedAccounts: connectedAccounts.map(account => ({
        service: account.service,
        connectedAccountId: account.connectedAccountId,
        status: account.status,
        createdAt: account.createdAt,
      })),
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to list connected accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list connected accounts',
    });
  }
});

/**
 * DELETE /api/composio/connected-accounts/:service
 * Remove a connected account for a service
 */
router.delete('/connected-accounts/:service', requireJwtAuth, async (req, res) => {
  try {
    const { service } = req.params;
    const userId = req.user.id;

    await composioService.removeConnectedAccount(userId, service);
    
    res.json({
      success: true,
      message: `Removed connected account for ${service}`,
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to remove connected account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to remove connected account',
    });
  }
});

/**
 * POST /api/composio/callback
 * Handle OAuth callback from Composio
 */
router.post('/callback', async (req, res) => {
  try {
    const { userId, service, connectedAccountId, error } = req.body;

    if (error) {
      logger.error('[ComposioAuth] OAuth callback received error:', error);
      return res.status(400).json({
        success: false,
        error: error,
      });
    }

    if (!userId || !service || !connectedAccountId) {
      logger.error('[ComposioAuth] OAuth callback missing required parameters:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, service, connectedAccountId',
      });
    }

    // Complete the OAuth flow and store the connected account
    await composioService.completeOAuthFlow(userId, service, connectedAccountId);
    
    logger.info(`[ComposioAuth] OAuth callback processed successfully for user ${userId}, service ${service}`);
    
    res.json({
      success: true,
      message: 'OAuth callback processed successfully',
      service,
      connectedAccountId,
    });
  } catch (error) {
    logger.error('[ComposioAuth] Failed to process OAuth callback:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process OAuth callback',
    });
  }
});

/**
 * GET /api/composio/callback
 * Handle OAuth callback from Composio (GET method for browser redirects)
 */
router.get('/callback', async (req, res) => {
  try {
    const { userId, service, error, state, code } = req.query;

    logger.info(`[ComposioAuth] OAuth callback received for user ${userId}, service ${service}`);
    logger.debug(`[ComposioAuth] Callback query params:`, req.query);

    if (error) {
      logger.error('[ComposioAuth] OAuth callback received error:', error);
      return res.status(400).send(`
        <html><body>
          <h1>Authentication Error</h1>
          <p>Error: ${error}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'COMPOSIO_AUTH_ERROR',
                error: '${error}'
              }, '*');
            }
            window.close();
          </script>
        </body></html>
      `);
    }

    if (!userId || !service) {
      logger.error('[ComposioAuth] OAuth callback missing required parameters:', req.query);
      return res.status(400).send(`
        <html><body>
          <h1>Authentication Error</h1>
          <p>Missing required parameters: userId or service</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'COMPOSIO_AUTH_ERROR',
                error: 'Missing required parameters'
              }, '*');
            }
            window.close();
          </script>
        </body></html>
      `);
    }

    // At this point, Composio has handled the OAuth exchange
    // We need to wait for the connection to become active
    logger.info(`[ComposioAuth] OAuth completed, waiting for connection to become active...`);
    
    // Get the connection ID from our database (we stored it during initiation)
    const dbRecord = await ComposioConnectedAccount.findOne({
      user: userId,
      service: service,
      connectionStatus: { $in: ['PENDING', 'INITIATED'] }
    });

    if (!dbRecord) {
      logger.error(`[ComposioAuth] Could not find pending connection for user ${userId}, service ${service}`);
      return res.status(400).send(`
        <html><body>
          <h1>Authentication Error</h1>
          <p>Could not find pending connection</p>
          <script>window.close();</script>
        </body></html>
      `);
    }

    const connectedAccountId = dbRecord.connectedAccountId;
    
    // Wait for connection to become active (shorter timeout for callback)
    const result = await composioService.waitForConnectionActive(userId, service, connectedAccountId, 30);
    
    if (result.isActive) {
      logger.info(`[ComposioAuth] OAuth callback processed successfully for user ${userId}, service ${service}`);
      
      const activeConnectionId = result.connectedAccountId || connectedAccountId;
      logger.info(`[ComposioAuth] Using active connection ID: ${activeConnectionId}`);
      
      // Return a success page that closes the popup
      res.send(`
        <html><body>
          <h1>Authentication Successful!</h1>
          <p>You have successfully connected ${service}.</p>
          <script>
            // Notify parent window and close popup
            if (window.opener) {
              window.opener.postMessage({
                type: 'COMPOSIO_AUTH_SUCCESS',
                service: '${service}',
                connectedAccountId: '${activeConnectionId}'
              }, '*');
            }
            setTimeout(() => window.close(), 1000);
          </script>
        </body></html>
      `);
    } else {
      logger.warn(`[ComposioAuth] Connection did not become active for user ${userId}, service ${service}`);
      
      // Still send back the UUID for pending connections
      res.send(`
        <html><body>
          <h1>Authentication In Progress</h1>
          <p>Your ${service} connection is being set up. Please wait a moment and try using the tools again.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'COMPOSIO_AUTH_PENDING',
                service: '${service}',
                connectedAccountId: '${connectedAccountId}'
              }, '*');
            }
            setTimeout(() => window.close(), 2000);
          </script>
        </body></html>
      `);
    }
  } catch (error) {
    logger.error('[ComposioAuth] Failed to process OAuth callback:', error);
    res.status(500).send(`
      <html><body>
        <h1>Authentication Error</h1>
        <p>Failed to process authentication: ${error.message}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'COMPOSIO_AUTH_ERROR',
              error: '${error.message}'
            }, '*');
          }
          window.close();
        </script>
      </body></html>
    `);
  }
});

module.exports = router;