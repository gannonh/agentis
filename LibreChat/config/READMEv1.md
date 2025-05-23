# LibreChat Config Scripts

This directory contains administrative utility scripts for managing LibreChat deployments. These command-line tools handle user management, system configuration, database operations, and maintenance tasks.

## Overview

The config directory provides a comprehensive toolkit for LibreChat administrators, supporting both interactive and automated usage. All scripts can be run with command-line arguments for automation or interactively with prompts for ease of use.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB connection (for most scripts)
- Environment variables properly configured (`.env` file)
- npm dependencies installed (`npm install` from LibreChat root)

## Script Categories

### 1. User Management

Scripts for managing user accounts and permissions.

#### `create-user.js`
Creates a new user account with optional email verification.

```bash
# Interactive mode
npm run create-user

# With arguments
npm run create-user -- --email user@example.com --name "John Doe"

# Skip email verification
npm run create-user -- --email user@example.com --name "John Doe" --skipemail true
```

#### `delete-user.js`
Permanently deletes a user account by email address.

```bash
# Interactive mode
npm run delete-user

# With arguments
npm run delete-user -- --email user@example.com
```

#### `list-users.js`
Lists all registered users with their details.

```bash
npm run list-users
```

Output includes: User ID, Email, Username, Provider, Created Date

#### `ban-user.js`
Temporarily bans a user for a specified duration.

```bash
# Interactive mode
npm run ban-user

# Ban for 7 days
npm run ban-user -- --email user@example.com --duration 7
```

#### `invite-user.js`
Sends email invitations to new users (requires email service configuration).

```bash
# Interactive mode
npm run invite-user

# With arguments
npm run invite-user -- --email newuser@example.com
```

#### `reset-password.js`
Resets a user's password.

```bash
# Interactive mode
npm run reset-password

# With arguments
npm run reset-password -- --email user@example.com
```

#### `reset-terms.js`
Resets terms of service acceptance for all users, requiring them to accept updated terms.

```bash
npm run reset-terms
```

### 2. Balance Management

Scripts for managing user token/credit balances. Requires `CHECK_BALANCE=true` in environment variables.

#### `add-balance.js`
Adds tokens to a user's balance (creates a transaction record).

```bash
# Interactive mode
npm run add-balance

# Add 1000 tokens
npm run add-balance -- --email user@example.com --amount 1000
```

#### `set-balance.js`
Sets a user's balance to a specific amount (overwrites current balance).

```bash
# Interactive mode
npm run set-balance

# Set balance to 5000 tokens
npm run set-balance -- --email user@example.com --amount 5000
```

#### `list-balances.js`
Displays token balances for all users.

```bash
npm run list-balances
```

### 3. System Configuration

Scripts for system-wide settings and notifications.

#### `update-banner.js`
Creates or updates system-wide banner notifications.

```bash
# Interactive mode
npm run update-banner

# Create a public banner
npm run update-banner -- --message "Scheduled maintenance on Sunday" --isPublic true
```

Banners support:
- Start and end dates for time-limited notifications
- Public/private visibility settings
- Automatic UUID generation based on message content

#### `delete-banner.js`
Removes the active system banner.

```bash
npm run delete-banner
```

#### `list-mcp-tools.js`
Lists MCP (Model Context Protocol) servers and tools configured in `librechat.yaml`.

```bash
npm run list-mcp-tools
```

Use this to configure display names for MCP servers in your configuration.

### 4. Maintenance & Updates

Scripts for system maintenance and updates.

#### `update.js`
Comprehensive update wizard for both Docker and local installations.

```bash
npm run update
```

Features:
- Interactive update wizard
- Handles both Docker and local deployments
- Backs up important files
- Updates dependencies
- Runs database migrations

#### `deployed-update.js`
Specialized update script for deployed Docker environments.

```bash
npm run deployed-update
```

Optimized for production deployments with minimal downtime.

#### `stop-backend.js`
Cross-platform script to stop backend Node.js processes.

```bash
npm run stop-backend
```

Works on Windows, macOS, and Linux.

#### `prepare.js`
Sets up Husky git hooks for development.

```bash
npm run prepare
```

Run after cloning the repository for development.

### 5. Analytics & Monitoring

Scripts for usage analytics and system monitoring.

#### `user-stats.js`
Displays user activity statistics.

```bash
npm run user-stats
```

Shows:
- Total conversations per user
- Total messages per user
- Summary statistics

### 6. Utility Scripts

Helper scripts for various administrative tasks.

#### `packages.js`
Cleans and reinstalls npm packages (useful for resolving dependency issues).

```bash
npm run packages
```

#### `connect.js`
Database connection utility used by other scripts. Not typically run directly.

#### `helpers.js`
Shared utility functions for console I/O, colored output, and Docker detection.

## Environment Variables

Most scripts require proper environment configuration. Key variables include:

```env
# Database
MONGO_URI=mongodb://localhost:27017/LibreChat

# Balance System (required for balance scripts)
CHECK_BALANCE=true

# Email Service (required for invite-user.js)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-password
EMAIL_FROM_NAME="LibreChat"
```

## Automation Examples

### User Onboarding Script
```bash
#!/bin/bash
# Bulk user creation
for email in user1@example.com user2@example.com user3@example.com; do
  npm run create-user -- --email "$email" --name "User" --skipemail true
  npm run add-balance -- --email "$email" --amount 1000
done
```

### Maintenance Script
```bash
#!/bin/bash
# Pre-maintenance tasks
npm run update-banner -- --message "Maintenance in progress" --isPublic true
npm run stop-backend
# ... perform maintenance ...
npm run delete-banner
```

## Safety Considerations

- **Always backup your database** before running scripts that modify data
- **Test in development** before running in production
- **Use confirmation prompts** - most destructive operations ask for confirmation
- **Check logs** - scripts output colored console messages for easy tracking
- **Monitor disk space** when running update scripts

## Docker Considerations

Several scripts detect Docker environments and adjust behavior:
- File paths are adjusted for container volumes
- Update scripts handle container restarts
- Package installation respects container boundaries

## Troubleshooting

### Common Issues

1. **"Cannot find module"**: Run `npm install` from LibreChat root directory
2. **"MongoDB connection failed"**: Check MONGO_URI and ensure MongoDB is running
3. **"Balance features not available"**: Set `CHECK_BALANCE=true` in .env
4. **"Email sending failed"**: Verify email service configuration

### Debug Mode

Most scripts support verbose output. Check individual script source for debug flags.

## Contributing

When adding new config scripts:
1. Follow the existing pattern of CLI arguments with interactive fallback
2. Use the shared helpers for consistent console output
3. Add proper error handling and validation
4. Update this README with usage examples
5. Test in both Docker and local environments

## Translations Subdirectory

The `translations/` subdirectory contains sophisticated AI-powered translation tools. See `translations/README.md` for detailed documentation. Note: These tools use the Anthropic API and can be expensive to run for large translation sets.