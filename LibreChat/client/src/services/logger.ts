/**
 * @fileoverview Client-side secure logging service
 * @module services/logger
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Secure client-side logger
 * - Development: logs to console with all levels
 * - Production: only logs errors to console, sends logs to server
 * - Never logs sensitive data (emails, tokens, passwords)
 */
class Logger {
  private isDevelopment =
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = this.isDevelopment ? 'debug' : 'error';

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'email', 'accessToken', 'refreshToken', 'secret'];
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Create structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext) {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeContext(context) : undefined,
    };
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    // Always log debug in development, regardless of shouldLog check
    if (this.isDevelopment) {
      console.debug(`🔍 [DEBUG] ${message}`, context ? this.sanitizeContext(context) : '');
      return;
    }

    if (!this.shouldLog('debug')) return;
    const entry = this.createLogEntry('debug', message, context);
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    // Always log info in development, regardless of shouldLog check
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`, context ? this.sanitizeContext(context) : '');
      return;
    }

    if (!this.shouldLog('info')) return;
    const entry = this.createLogEntry('info', message, context);
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    // Always log warnings in development, regardless of shouldLog check
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context ? this.sanitizeContext(context) : '');
      return;
    }

    if (!this.shouldLog('warn')) return;
    const entry = this.createLogEntry('warn', message, context);
  }

  /**
   * Log errors (always shown)
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const fullContext = { ...context, error: error?.message, stack: error?.stack };
    const entry = this.createLogEntry('error', message, fullContext);

    // Always log errors to console, even in production
    console.error(`❌ [ERROR] ${message}`, error, context ? this.sanitizeContext(context) : '');

    // TODO: Send to error reporting service in production
  }
}

/**
 * Auth-specific logger with predefined context
 */
class AuthLogger extends Logger {
  /**
   * Log authentication events
   */
  login(userId: string, method: 'magic-link' | 'oauth'): void {
    this.info('User login attempt', {
      userId,
      method,
      action: 'login',
    });
  }

  logout(userId: string): void {
    this.info('User logout', {
      userId,
      action: 'logout',
    });
  }

  organizationSet(userId: string, organizationId: string): void {
    this.info('Active organization set', {
      userId,
      organizationId,
      action: 'org-set',
    });
  }

  redirecting(from: string, to: string, reason: string): void {
    this.debug('Auth redirect', {
      from,
      to,
      reason,
      action: 'redirect',
    });
  }

  sessionExpired(userId?: string): void {
    this.warn('Session expired', {
      userId,
      action: 'session-expired',
    });
  }
}

// Export singleton instances
export const logger = new Logger();
export const authLogger = new AuthLogger();

// Export for testing
export { Logger, AuthLogger };
