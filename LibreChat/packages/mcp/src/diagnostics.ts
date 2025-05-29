import { MCPManager } from './manager';
import type { MCPConnection } from './connection';
import type { Logger } from 'winston';

/**
 * Diagnostic function to verify unique connections per user
 * Outputs detailed information about active connections in the MCPManager
 *
 * @param logger Winston logger instance
 * @returns Void - diagnostic information is logged to the console/logs
 */
export async function diagnoseUserConnections(logger: Logger): Promise<void> {
  try {
    const manager = MCPManager.getInstance(logger);
    logger.info('[MCP-DIAGNOSTICS] Running diagnostics on user connections');

    // Get a reference to the userConnections map (for diagnostics only)
    // @ts-ignore - Accessing private property for diagnostics
    const userConnections = manager['userConnections'] as Map<string, Map<string, MCPConnection>>;

    // @ts-ignore - Accessing private property for diagnostics
    const userLastActivity = manager['userLastActivity'] as Map<string, number>;

    // Track user connection statistics
    const stats = {
      totalUsers: userConnections.size,
      totalConnections: 0,
      connectionsByServer: new Map<string, number>(),
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
 * Run diagnostic test on a specific user's connections
 *
 * @param userId User ID to diagnose
 * @param logger Winston logger instance
 * @returns Connection information for the specific user
 */
export async function diagnoseSpecificUser(
  userId: string,
  logger: Logger,
): Promise<Record<string, unknown>> {
  try {
    const manager = MCPManager.getInstance(logger);
    logger.info(`[MCP-DIAGNOSTICS] Running diagnostics for user ${userId}`);

    // @ts-ignore - Accessing private property for diagnostics
    const userConnections = manager['userConnections'] as Map<string, Map<string, MCPConnection>>;

    // @ts-ignore - Accessing private property for diagnostics
    const userLastActivity = manager['userLastActivity'] as Map<string, number>;

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
      connections: {} as Record<string, { isConnected: boolean; state: string }>,
    };

    for (const [serverName, connection] of userServerMap.entries()) {
      const isConnected = await connection.isConnected().catch(() => false);
      const state = connection.getConnectionState();

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

export default {
  diagnoseUserConnections,
  diagnoseSpecificUser,
};
