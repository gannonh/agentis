const { Composio } = require('composio-core');
const { ComposioConnectedAccount } = require('~/models');
const { logger } = require('~/config');

/**
 * Service for managing Composio connected accounts and integrations
 */
class ComposioService {
  constructor() {
    this.composio = null;
    this.initialized = false;
  }

  /**
   * Initialize the Composio client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error('COMPOSIO_API_KEY environment variable is required');
    }

    try {
      this.composio = new Composio(apiKey);
      this.initialized = true;
      logger.info('[ComposioService] Initialized successfully');
    } catch (error) {
      logger.error('[ComposioService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get or create a connected account for a user and service
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name (googlesheets, googledrive, etc.)
   * @returns {Promise<string>} The connected account ID
   */
  async getOrCreateConnectedAccount(userId, service) {
    await this.initialize();

    // First check our database for recently working connections
    const existingDbRecord = await ComposioConnectedAccount.findOne({
      user: userId,
      service: service,
      connectionStatus: 'ACTIVE',
    });

    if (existingDbRecord) {
      const timeSinceLastCheck = existingDbRecord.metadata?.lastChecked
        ? new Date() - new Date(existingDbRecord.metadata.lastChecked)
        : Infinity;

      // If we checked this connection recently (within 5 minutes), trust it
      if (timeSinceLastCheck < 5 * 60 * 1000) {
        logger.info(
          `[ComposioService] Using recently verified connection ${existingDbRecord.connectedAccountId} for user ${userId}, service ${service}`,
        );
        return existingDbRecord.connectedAccountId;
      }
    }

    // Check Composio for current connections
    const appName = this.getAppNameForService(service);
    try {
      const entity = this.composio.getEntity(userId);
      const existingConnections = await entity.getConnections();

      // Look for ANY active connection for this app, regardless of when created
      const activeConnection = existingConnections.find(
        (conn) => conn.appName.toLowerCase() === appName.toLowerCase() && conn.status === 'ACTIVE',
      );

      if (activeConnection) {
        logger.info(
          `[ComposioService] Found existing ACTIVE connection for user ${userId}, service ${service}, connection: ${activeConnection.id}`,
        );

        // Store/update in our database for future reference
        try {
          await ComposioConnectedAccount.findOneAndUpdate(
            { user: userId, service: service },
            {
              user: userId,
              service: service,
              connectedAccountId: activeConnection.id,
              appName: appName,
              connectionStatus: 'ACTIVE',
              metadata: {
                entityId: userId,
                appName: appName,
                foundExistingActive: true,
                lastChecked: new Date(),
              },
            },
            { upsert: true, new: true },
          );
        } catch (dbError) {
          logger.warn(`[ComposioService] Failed to save ACTIVE connection to database:`, dbError);
        }

        return activeConnection.id;
      }

      // Check for any existing connection (INITIATED, INITIALIZING, or even ACTIVE)
      // Since tools are working even with INITIALIZING status, just use any existing connection
      const existingConnection = existingConnections.find(
        (conn) => conn.appName.toLowerCase() === appName.toLowerCase(),
      );

      if (existingConnection) {
        logger.info(
          `[ComposioService] Found existing connection for user ${userId}, service ${service}, connection: ${existingConnection.id}, status: ${existingConnection.status}`,
        );

        // If connection is not ACTIVE, try to check if it became active recently
        if (existingConnection.status !== 'ACTIVE') {
          logger.info(
            `[ComposioService] Connection is ${existingConnection.status}, checking if it became active...`,
          );

          // Wait a moment and re-check the connection status
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

          try {
            const updatedConnections = await entity.getConnections();
            const updatedConnection = updatedConnections.find(
              (conn) => conn.id === existingConnection.id,
            );

            if (updatedConnection && updatedConnection.status === 'ACTIVE') {
              logger.info(`[ComposioService] Connection ${existingConnection.id} is now ACTIVE!`);
              existingConnection.status = 'ACTIVE'; // Update our local reference
            } else {
              logger.info(
                `[ComposioService] Connection ${existingConnection.id} is still ${updatedConnection?.status || 'not found'}, but will use it anyway since tools work`,
              );
            }
          } catch (error) {
            logger.warn(`[ComposioService] Failed to re-check connection status:`, error);
          }
        }

        // Store in our database regardless of status since it's working
        try {
          await ComposioConnectedAccount.findOneAndUpdate(
            { user: userId, service: service },
            {
              user: userId,
              service: service,
              connectedAccountId: existingConnection.id,
              appName: appName,
              connectionStatus: 'ACTIVE', // Mark as active in our DB since it's working
              metadata: {
                entityId: userId,
                appName: appName,
                composioStatus: existingConnection.status,
                reused: true,
                lastChecked: new Date(),
              },
            },
            { upsert: true, new: true },
          );
        } catch (dbError) {
          logger.warn(`[ComposioService] Failed to save connection to database:`, dbError);
        }

        return existingConnection.id;
      }
    } catch (error) {
      logger.warn(
        `[ComposioService] Failed to check existing connections for user ${userId}, service ${service}:`,
        error,
      );
    }

    // Only create new connection if no existing connections found
    logger.info(
      `[ComposioService] No existing connections found for user ${userId}, service ${service} - creating new one`,
    );

    // Create new connected account via Composio API
    try {
      logger.info(
        `[ComposioService] Creating new connected account for user ${userId}, service ${service}, app ${appName}`,
      );

      // Use the SDK method but without trying to override callback URL
      logger.info(
        `[ComposioService] Creating entity for userId: "${userId}" (type: ${typeof userId})`,
      );
      const entity = this.composio.getEntity(userId);
      logger.info(`[ComposioService] Entity created with ID: "${entity.id}"`);

      const response = await entity.initiateConnection({
        appName: appName,
        authMode: 'OAUTH2',
      });

      logger.info(`[ComposioService] Connection response: ${JSON.stringify(response, null, 2)}`);

      // Store in our database
      const connectedAccount = new ComposioConnectedAccount({
        user: userId,
        service: service,
        connectedAccountId: response.connectedAccountId,
        appName: appName,
        connectionStatus: 'ACTIVE',
        metadata: {
          entityId: userId,
          appName: appName,
          createdViaAPI: true,
          connectionStatus: response.connectionStatus,
          redirectUrl: response.redirectUrl,
        },
      });

      await connectedAccount.save();
      logger.info(
        `[ComposioService] Created connected account ${response.connectedAccountId} for user ${userId}, service ${service}`,
      );

      return response.connectedAccountId;
    } catch (error) {
      logger.error(
        `[ComposioService] Failed to create connected account for user ${userId}, service ${service}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get connected account ID for a user and service
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @returns {Promise<string|null>} The connected account ID or null if not found
   */
  async getConnectedAccountId(userId, service) {
    // Look for active connections first, then initiated (which can often work)
    const connectedAccount = await ComposioConnectedAccount.findOne({
      user: userId,
      service: service,
      connectionStatus: { $in: ['ACTIVE', 'INITIATED'] }, // Include initiated connections since they often work
    }).sort({ updatedAt: -1 }); // Get most recent

    return connectedAccount ? connectedAccount.connectedAccountId : null;
  }

  /**
   * Clean up wrong connections and start fresh
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   */
  async cleanupAndStartFresh(userId, service) {
    await this.initialize();

    try {
      // Delete from our database (wait for completion)
      const deleteResult = await ComposioConnectedAccount.deleteMany({
        user: userId,
        service: service,
      });
      logger.info(
        `[ComposioService] Cleaned up ${deleteResult.deletedCount} database records for user ${userId}, service ${service}`,
      );

      const appName = this.getAppNameForService(service);

      // Clean up user entity connections
      try {
        const entity = this.composio.getEntity(userId);
        const connections = await entity.getConnections();
        const serviceConnections = connections.filter(
          (conn) => conn.appName.toLowerCase() === appName.toLowerCase(),
        );

        for (const conn of serviceConnections) {
          try {
            await entity.connectedAccounts.delete({ connectedAccountId: conn.id });
            logger.info(
              `[ComposioService] Deleted user connection ${conn.id} for user ${userId}, app ${appName}`,
            );
          } catch (error) {
            logger.warn(`[ComposioService] Failed to delete user connection ${conn.id}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`[ComposioService] Failed to cleanup user connections:`, error);
      }

      // Also clean up default entity connections to prevent conflicts
      try {
        const defaultEntity = this.composio.getEntity('default');
        const defaultConnections = await defaultEntity.getConnections();
        const defaultServiceConnections = defaultConnections.filter(
          (conn) => conn.appName.toLowerCase() === appName.toLowerCase(),
        );

        for (const conn of defaultServiceConnections) {
          try {
            await defaultEntity.connectedAccounts.delete({ connectedAccountId: conn.id });
            logger.info(
              `[ComposioService] Deleted default connection ${conn.id} for app ${appName}`,
            );
          } catch (error) {
            logger.warn(`[ComposioService] Failed to delete default connection ${conn.id}:`, error);
          }
        }
      } catch (error) {
        logger.warn(`[ComposioService] Failed to cleanup default connections:`, error);
      }
    } catch (error) {
      logger.error(
        `[ComposioService] Failed to cleanup for user ${userId}, service ${service}:`,
        error,
      );
    }
  }

  /**
   * Remove a connected account
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   */
  async removeConnectedAccount(userId, service) {
    await ComposioConnectedAccount.deleteMany({
      user: userId,
      service: service,
    });

    logger.info(
      `[ComposioService] Deleted connected account for user ${userId}, service ${service}`,
    );
  }

  /**
   * List all connected accounts for a user
   * @param {string} userId - The LibreChat user ID
   * @returns {Promise<Array>} Array of connected accounts
   */
  async getUserConnectedAccounts(userId) {
    return await ComposioConnectedAccount.find({
      user: userId,
      connectionStatus: 'ACTIVE',
    });
  }

  /**
   * Map service names to Composio app names
   * @param {string} service - The service name
   * @returns {string} The Composio app name
   */
  getAppNameForService(service) {
    const serviceToAppMap = {
      googlesheets: 'googlesheets',
      googledrive: 'googledrive',
      googledocs: 'googledocs',
      gmail: 'gmail',
      googlecalendar: 'googlecalendar',
      notion: 'notion',
    };

    const appName = serviceToAppMap[service];
    if (!appName) {
      throw new Error(`Unsupported service: ${service}`);
    }

    return appName;
  }

  /**
   * Validate that a connected account exists and is active
   * @param {string} connectedAccountId - The connected account ID
   * @returns {Promise<boolean>} Whether the account is valid
   */
  async validateConnectedAccount(connectedAccountId) {
    await this.initialize();

    try {
      // You could call Composio API to validate the account
      // For now, just check if it exists in our database
      const account = await ComposioConnectedAccount.findOne({
        connectedAccountId: connectedAccountId,
        connectionStatus: 'ACTIVE',
      });

      return !!account;
    } catch (error) {
      logger.error(
        `[ComposioService] Failed to validate connected account ${connectedAccountId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if a user has an active connection for a service
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @returns {Promise<boolean>} Whether the user has an active connection
   */
  async hasActiveConnection(userId, service) {
    await this.initialize();

    try {
      // First check our database for active or initiated connections (initiated often work)
      const dbRecord = await ComposioConnectedAccount.findOne({
        user: userId,
        service: service,
        connectionStatus: { $in: ['ACTIVE', 'INITIATED'] },
      }).sort({ updatedAt: -1 }); // Get most recent

      if (!dbRecord) {
        return false;
      }

      // If we have a recent update (within 5 minutes), trust it
      const timeSinceUpdate = new Date() - new Date(dbRecord.updatedAt);

      if (timeSinceUpdate < 5 * 60 * 1000) {
        return true;
      }

      // Check with Composio to verify the connection is still active
      const appName = this.getAppNameForService(service);
      const entity = this.composio.getEntity(userId);
      const connections = await entity.getConnections();

      const activeConnection = connections.find(
        (conn) =>
          conn.appName.toLowerCase() === appName.toLowerCase() &&
          conn.status === 'ACTIVE' &&
          conn.id === dbRecord.connectedAccountId,
      );

      if (activeConnection) {
        // Update our database record
        await ComposioConnectedAccount.findByIdAndUpdate(dbRecord._id, {
          connectionStatus: activeConnection.status,
        });
        return true;
      } else {
        // Connection is no longer active, delete the record
        await ComposioConnectedAccount.findByIdAndDelete(dbRecord._id);
        return false;
      }
    } catch (error) {
      logger.warn(
        `[ComposioService] Failed to check connection status for user ${userId}, service ${service}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Initiate OAuth connection for a service following Composio docs
   * This creates the connection and returns redirect URL for user authentication
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @returns {Promise<{redirectUrl: string, connectedAccountId: string}>} The OAuth redirect URL and connection ID
   */
  async initiateConnection(userId, service) {
    await this.initialize();

    try {
      const appName = this.getAppNameForService(service);

      // Clean up any existing connections first
      await this.cleanupAndStartFresh(userId, service);

      logger.info(
        `[ComposioService] Initiating OAuth connection for user ${userId}, service ${service}, app ${appName}`,
      );

      // Get the entity for this user
      const entity = this.composio.getEntity(userId);

      // Initiate connection using proper Composio flow
      const connectionRequest = await entity.initiateConnection({
        appName: appName,
        redirectUrl:
          process.env.COMPOSIO_REDIRECT_URL ||
          `${process.env.DOMAIN_CLIENT}/api/composio/callback?userId=${userId}&service=${service}`,
      });

      logger.info(`[ComposioService] Connection initiated for user ${userId}, service ${service}`);
      logger.info(`[ComposioService] Redirect URL: ${connectionRequest.redirectUrl}`);
      logger.info(
        `[ComposioService] Connected Account ID: ${connectionRequest.connectedAccountId}`,
      );
      logger.info(`[ComposioService] Connection Status: ${connectionRequest.connectionStatus}`);

      // Store the pending connection in our database
      const connectedAccount = new ComposioConnectedAccount({
        user: userId,
        service: service,
        connectedAccountId: connectionRequest.connectedAccountId,
        connectionStatus: connectionRequest.connectionStatus, // Use Composio's status directly
        redirectUrl: connectionRequest.redirectUrl,
      });

      try {
        await connectedAccount.save();
        logger.info(
          `[ComposioService] Created connected account ${connectionRequest.connectedAccountId} for user ${userId}, service ${service}`,
        );
      } catch (saveError) {
        if (saveError.code === 11000) {
          // Duplicate key error
          logger.error(
            `[ComposioService] Duplicate key error - cleanup may have failed. Attempting upsert.`,
          );
          // Use upsert to update existing record
          const upsertResult = await ComposioConnectedAccount.findOneAndUpdate(
            { user: userId, service: service },
            {
              connectedAccountId: connectionRequest.connectedAccountId,
              connectionStatus: connectionRequest.connectionStatus,
              redirectUrl: connectionRequest.redirectUrl,
            },
            { upsert: true, new: true },
          );
          logger.info(
            `[ComposioService] Upserted connected account for user ${userId}, service ${service}`,
          );
        } else {
          throw saveError;
        }
      }

      return {
        redirectUrl: connectionRequest.redirectUrl,
        connectedAccountId: connectionRequest.connectedAccountId,
        connectionStatus: connectionRequest.connectionStatus,
      };
    } catch (error) {
      logger.error(
        `[ComposioService] Failed to initiate connection for user ${userId}, service ${service}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Wait for connection to become active after OAuth
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @param {string} connectedAccountId - The connected account ID
   * @param {number} timeoutSeconds - Timeout in seconds (default 180)
   * @returns {Promise<{isActive: boolean, connectedAccountId?: string}>} Whether connection became active and the new ID
   */
  async waitForConnectionActive(userId, service, connectedAccountId, timeoutSeconds = 180) {
    await this.initialize();

    try {
      logger.info(
        `[ComposioService] Waiting for connection ${connectedAccountId} to become active...`,
      );

      const entity = this.composio.getEntity(userId);
      const startTime = Date.now();
      const timeout = timeoutSeconds * 1000;

      while (Date.now() - startTime < timeout) {
        try {
          const connections = await entity.getConnections();
          const appName = this.getAppNameForService(service);

          logger.info(
            `[ComposioService] All connections for entity ${userId}:`,
            JSON.stringify(connections),
          );

          // Look for any ACTIVE connection for this app, not just the specific ID
          const activeConnection = connections.find(
            (conn) =>
              conn.appName.toLowerCase() === appName.toLowerCase() && conn.status === 'ACTIVE',
          );

          if (activeConnection) {
            logger.info(
              `[ComposioService] Found ACTIVE connection ${activeConnection.id} for ${service}!`,
            );

            // Update our database with the new active connection ID
            logger.info(
              `[ComposioService] Updating MongoDB record for user ${userId}, service ${service} with new connection ID: ${activeConnection.id}`,
            );

            // First, let's check what we're trying to update
            const existingRecord = await ComposioConnectedAccount.findOne({
              user: userId,
              service: service,
            });
            logger.info(
              `[ComposioService] Existing record before update:`,
              existingRecord ? JSON.stringify(existingRecord.toObject()) : 'null',
            );

            const updateResult = await ComposioConnectedAccount.findOneAndUpdate(
              { user: userId, service: service },
              {
                $set: {
                  connectedAccountId: activeConnection.id, // Update to the new active connection ID
                  connectionStatus: 'ACTIVE',
                },
              },
              { new: true, runValidators: false },
            );
            logger.info(
              `[ComposioService] Update result:`,
              updateResult ? JSON.stringify(updateResult.toObject()) : 'null',
            );

            return { isActive: true, connectedAccountId: activeConnection.id };
          } else {
            // Log all connections for debugging
            const serviceConnections = connections.filter(
              (conn) => conn.appName.toLowerCase() === appName.toLowerCase(),
            );
            if (serviceConnections.length > 0) {
              logger.debug(
                `[ComposioService] Found ${serviceConnections.length} ${service} connections, statuses: ${serviceConnections.map((c) => c.status).join(', ')}`,
              );
            } else {
              logger.debug(`[ComposioService] No ${service} connections found yet`);
            }
          }
        } catch (checkError) {
          logger.warn(`[ComposioService] Error checking connection status:`, checkError);
        }

        // Wait 2 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      logger.warn(
        `[ComposioService] Connection ${connectedAccountId} did not become active within ${timeoutSeconds} seconds`,
      );
      return { isActive: false };
    } catch (error) {
      logger.error(`[ComposioService] Error waiting for connection to become active:`, error);
      return { isActive: false };
    }
  }

  /**
   * Get the authorization URL for a service (backwards compatibility)
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @returns {Promise<string>} The authorization URL
   */
  async getAuthorizationUrl(userId, service) {
    const result = await this.initiateConnection(userId, service);
    return result.redirectUrl;
  }

  /**
   * Complete the OAuth flow and store the connected account
   * This should be called from the OAuth callback
   * @param {string} userId - The LibreChat user ID
   * @param {string} service - The service name
   * @param {string} connectedAccountId - The connected account ID from Composio
   * @returns {Promise<void>}
   */
  async completeOAuthFlow(userId, service, connectedAccountId) {
    await this.initialize();

    try {
      const appName = this.getAppNameForService(service);

      // Verify the connection exists and is active
      const entity = this.composio.getEntity(userId);
      const connections = await entity.getConnections();
      const connection = connections.find((conn) => conn.id === connectedAccountId);

      if (!connection) {
        throw new Error(`Connected account ${connectedAccountId} not found for user ${userId}`);
      }

      // Store in our database
      await ComposioConnectedAccount.findOneAndUpdate(
        { user: userId, service: service },
        {
          user: userId,
          service: service,
          connectedAccountId: connectedAccountId,
          appName: appName,
          connectionStatus: 'ACTIVE', // Mark as active even if still initializing
          metadata: {
            entityId: userId,
            appName: appName,
            composioStatus: connection.status,
            completedOAuth: true,
            lastChecked: new Date(),
          },
        },
        { upsert: true, new: true },
      );

      logger.info(
        `[ComposioService] Completed OAuth flow for user ${userId}, service ${service}, connected account: ${connectedAccountId}`,
      );
    } catch (error) {
      logger.error(
        `[ComposioService] Failed to complete OAuth flow for user ${userId}, service ${service}:`,
        error,
      );
      throw error;
    }
  }
}

// Export singleton instance
const composioService = new ComposioService();
module.exports = composioService;
