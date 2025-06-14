import express from 'express';
import { MCPManager } from 'librechat-mcp';
import { requireBetterAuth } from '#server/middleware.js';
import {  Permissions, PermissionTypes  } from 'librechat-data-provider';
import {  logger  } from '#config/index.js';

const router = express.Router();

/**
 * Helper function to diagnose user connections
 * @param {Logger} logger Winston logger instance
 */
async function diagnoseUserConnections(logger) {
  try {
    const manager = MCPManager.getInstance(logger);
    logger.info('[MCP-DIAGNOSTICS] Running diagnostics on user connections');

    // Get a reference to the userConnections map (for diagnostics only)
    // @ts-ignore - Accessing private property for diagnostics
    const userConnections = manager['userConnections'];

    // @ts-ignore - Accessing private property for diagnostics
    const userLastActivity = manager['userLastActivity'];

    if (!userConnections || !userLastActivity) {
      logger.info('[MCP-DIAGNOSTICS] Unable to access user connections or activity maps');
      return;
    }

    // Track user connection statistics
    const stats = {
      totalUsers: userConnections.size,
      totalConnections: 0,
      connectionsByServer: new Map(),
      userIDs: Array.from(userConnections.keys()),
    };

    // Log details about each user connection
    for (const [userId, serverMap] of userConnections.entries()) {
      const lastActivity = userLastActivity.get(userId);
      const lastActivityTime = lastActivity ? new Date(lastActivity).toISOString() : 'Unknown';

      logger.info(`[MCP-DIAGNOSTICS] User ${userId} - Last Activity: ${lastActivityTime}`);
      logger.info(`[MCP-DIAGNOSTICS] User ${userId} - Active connections: ${serverMap.size}`);

      stats.totalConnections += serverMap.size;

      for (const [serverName, connection] of serverMap.entries()) {
        const isConnected = await connection.isConnected().catch(() => false);
        logger.info(
          `[MCP-DIAGNOSTICS] User ${userId} - Server ${serverName} - Connected: ${isConnected}`,
        );

        const serverCount = stats.connectionsByServer.get(serverName) || 0;
        stats.connectionsByServer.set(serverName, serverCount + 1);
      }
    }

    // Log overall statistics
    logger.info(`[MCP-DIAGNOSTICS] Total unique users: ${stats.totalUsers}`);
    logger.info(`[MCP-DIAGNOSTICS] Total active connections: ${stats.totalConnections}`);
    logger.info('[MCP-DIAGNOSTICS] Connections by server:');

    for (const [serverName, count] of stats.connectionsByServer.entries()) {
      logger.info(`[MCP-DIAGNOSTICS]   - ${serverName}: ${count} connections`);
    }

    logger.info('[MCP-DIAGNOSTICS] User IDs with active connections:');
    logger.info(`[MCP-DIAGNOSTICS]   - ${stats.userIDs.join(', ')}`);

    logger.info('[MCP-DIAGNOSTICS] Diagnostics complete');
  } catch (error) {
    logger.error('[MCP-DIAGNOSTICS] Error running diagnostics:', error);
  }
}

/**
 * Helper function to diagnose a specific user's connections
 * @param {string} userId The user ID to diagnose
 * @param {Logger} logger Winston logger instance
 */
async function diagnoseSpecificUser(userId, logger) {
  try {
    const manager = MCPManager.getInstance(logger);
    logger.info(`[MCP-DIAGNOSTICS] Running diagnostics for user ${userId}`);

    // @ts-ignore - Accessing private property for diagnostics
    const userConnections = manager['userConnections'];

    // @ts-ignore - Accessing private property for diagnostics
    const userLastActivity = manager['userLastActivity'];

    if (!userConnections || !userLastActivity) {
      logger.info(
        `[MCP-DIAGNOSTICS] Unable to access user connections or activity maps for user ${userId}`,
      );
      return null;
    }

    const userServerMap = userConnections.get(userId);
    if (!userServerMap) {
      logger.info(`[MCP-DIAGNOSTICS] No connections found for user ${userId}`);
      return null;
    }

    const lastActivity = userLastActivity.get(userId);
    const lastActivityTime = lastActivity ? new Date(lastActivity).toISOString() : 'Unknown';

    const result = {
      userId,
      lastActivity: lastActivityTime,
      connections: {},
    };

    for (const [serverName, connection] of userServerMap.entries()) {
      const isConnected = await connection.isConnected().catch(() => false);
      const state = connection.getConnectionState ? connection.getConnectionState() : 'unknown';

      result.connections[serverName] = {
        isConnected,
        state,
      };

      logger.info(
        `[MCP-DIAGNOSTICS] User ${userId} - Server ${serverName} - Connected: ${isConnected}, State: ${state}`,
      );
    }

    return result;
  } catch (error) {
    logger.error(`[MCP-DIAGNOSTICS] Error diagnosing user ${userId}:`, error);
    return null;
  }
}

/**
 * @route GET /api/mcp/diagnostics
 * @description Get diagnostics for all MCP connections (admin only)
 * @access Private/Admin
 */
router.get('/', requireBetterAuth, async (req, res) => {
  try {
    // Check if user has admin permissions
    const hasAccess = await checkAccess(req.user, PermissionTypes.DIAGNOSTICS, [Permissions.ADMIN]);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Admin permission required for this endpoint' });
    }

    // Run diagnostics
    await diagnoseUserConnections(logger);

    return res.status(200).json({
      message: 'MCP diagnostics have been logged to the server logs',
      user_id: req.user.id,
    });
  } catch (error) {
    logger.error('[MCP-DIAGNOSTICS] Error running MCP diagnostics:', error);
    return res.status(500).json({ message: 'Error running MCP diagnostics' });
  }
});

/**
 * @route GET /api/mcp/diagnostics/user
 * @description Get diagnostics for the current user's MCP connections
 * @access Private
 */
router.get('/user', requireBetterAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    logger.info(`[MCP-DIAGNOSTICS] Running user self-diagnostics for ${userId}`);

    const result = await diagnoseSpecificUser(userId, logger);

    if (!result) {
      return res.status(404).json({
        message: 'No MCP connections found for your user',
        user_id: userId,
      });
    }

    return res.status(200).json({
      message: 'MCP user diagnostics completed',
      user_id: userId,
      diagnostics: result,
    });
  } catch (error) {
    logger.error(`[MCP-DIAGNOSTICS] Error running MCP user diagnostics:`, error);
    return res.status(500).json({ message: 'Error running MCP user diagnostics' });
  }
});

/**
 * @route GET /api/mcp/diagnostics/user/:userId
 * @description Get diagnostics for a specific user's MCP connections (admin only)
 * @access Private/Admin
 */
router.get('/user/:userId', requireBetterAuth, async (req, res) => {
  try {
    // Check if user has admin permissions
    const hasAccess = await checkAccess(req.user, PermissionTypes.DIAGNOSTICS, [Permissions.ADMIN]);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Admin permission required for this endpoint' });
    }

    const { userId } = req.params;
    logger.info(`[MCP-DIAGNOSTICS] Running diagnostics for user ${userId}`);

    const result = await diagnoseSpecificUser(userId, logger);

    if (!result) {
      return res.status(404).json({
        message: `No MCP connections found for user ${userId}`,
        user_id: userId,
      });
    }

    return res.status(200).json({
      message: `MCP diagnostics for user ${userId} completed`,
      diagnostics: result,
    });
  } catch (error) {
    logger.error(`[MCP-DIAGNOSTICS] Error running MCP user diagnostics:`, error);
    return res.status(500).json({ message: 'Error running MCP user diagnostics' });
  }
});

export default router;
