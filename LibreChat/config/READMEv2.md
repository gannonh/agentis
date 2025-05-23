# LibreChat Configuration Scripts

> ⚡ **Quick Start**: Run `npm run create-user` to add your first user, then `npm run add-balance` to give them tokens.

This directory contains administrative command-line tools for managing LibreChat deployments. These scripts handle everything from user management to system updates, providing a comprehensive toolkit for administrators.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Script Categories](#script-categories)
  - [User Management](#user-management)
  - [Balance Management](#balance-management)
  - [System Configuration](#system-configuration)
  - [Maintenance & Updates](#maintenance--updates)
  - [Analytics & Monitoring](#analytics--monitoring)
  - [Development Tools](#development-tools)
- [Running Scripts](#running-scripts)
- [Environment Configuration](#environment-configuration)
- [Docker vs Local Deployment](#docker-vs-local-deployment)
- [Safety & Security](#safety--security)
- [Automation & CI/CD](#automation--cicd)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Quick Reference

| Script | Purpose | Requires DB | Requires Balance | Destructive |
|--------|---------|-------------|------------------|-------------|
| `create-user` | Add new user accounts | ✅ | ❌ | ❌ |
| `delete-user` | Remove user accounts | ✅ | ❌ | ⚠️ **Yes** |
| `list-users` | Display all users | ✅ | ❌ | ❌ |
| `ban-user` | Temporarily ban users | ✅ | ❌ | ⚠️ |
| `invite-user` | Send email invitations | ✅ | ❌ | ❌ |
| `reset-password` | Change user passwords | ✅ | ❌ | ⚠️ |
| `reset-terms` | Reset ToS acceptance | ✅ | ❌ | ⚠️ |
| `add-balance` | Add tokens to balance | ✅ | ✅ | ❌ |
| `set-balance` | Set exact balance | ✅ | ✅ | ⚠️ |
| `list-balances` | Show all balances | ✅ | ✅ | ❌ |
| `user-stats` | Display usage statistics | ✅ | ❌ | ❌ |
| `update-banner` | Set system notifications | ✅ | ❌ | ❌ |
| `delete-banner` | Remove notifications | ✅ | ❌ | ❌ |
| `update` | Update LibreChat | ❌ | ❌ | ⚠️ |
| `deployed-update` | Update Docker deployment | ❌ | ❌ | ⚠️ |
| `backend:stop` | Stop backend processes | ❌ | ❌ | ⚠️ |

## Prerequisites

- **Node.js**: v18.17.0 or higher (check with `node --version`)
- **MongoDB**: Running and accessible (for most scripts)
- **Environment File**: Properly configured `.env` file in LibreChat root
- **Dependencies**: Run `npm install` from LibreChat root directory
- **Permissions**: Write access to LibreChat directory and database

## Installation

```bash
# From LibreChat root directory
npm install

# Verify installation
npm run list-users
```

## Script Categories

### User Management

#### Create User
```bash
# Interactive mode (recommended for first-time use)
npm run create-user

# Automated mode
npm run create-user -- --email user@example.com --name "John Doe"

# Skip email verification (useful for testing)
npm run create-user -- --email user@example.com --name "John Doe" --skipemail true
```

**Options:**
- `--email`: User's email address (required)
- `--name`: Display name (optional)
- `--username`: Login username (optional, defaults to email)
- `--skipemail`: Skip email verification (true/false)

#### Delete User
⚠️ **WARNING**: This permanently deletes the user and all associated data.

```bash
# Interactive mode (with confirmation)
npm run delete-user

# Automated mode (still requires confirmation)
npm run delete-user -- --email user@example.com
```

#### List Users
```bash
npm run list-users
```

**Output format:**
```
User ID                  | Email              | Username | Provider | Created
------------------------+--------------------+----------+----------+------------------------
507f1f77bcf86cd799439011 | user@example.com   | user123  | local    | 2024-01-15T10:30:00Z
```

#### Ban User
```bash
# Interactive mode
npm run ban-user

# Ban for specific duration (in days)
npm run ban-user -- --email user@example.com --duration 7
```

**Duration options:**
- Positive number: Days to ban
- -1: Permanent ban
- 0: Unban user

#### Invite User
Requires email service configuration in `.env`.

```bash
# Interactive mode
npm run invite-user

# Automated mode
npm run invite-user -- --email newuser@example.com
```

#### Reset Password
```bash
# Interactive mode (secure password input)
npm run reset-password

# Cannot be run in automated mode for security reasons
```

#### Reset Terms of Service
⚠️ **WARNING**: This affects ALL users and will require them to re-accept terms.

```bash
npm run reset-terms
```

### Balance Management

> **Note**: All balance scripts require `CHECK_BALANCE=true` in your `.env` file.

#### Add Balance
Creates a transaction record for audit trail.

```bash
# Interactive mode
npm run add-balance

# Add specific amount
npm run add-balance -- --email user@example.com --amount 1000

# Negative amounts are allowed (deduct tokens)
npm run add-balance -- --email user@example.com --amount -500
```

#### Set Balance
⚠️ **WARNING**: This overwrites the current balance without creating a transaction record.

```bash
# Interactive mode
npm run set-balance

# Set exact balance
npm run set-balance -- --email user@example.com --amount 5000
```

#### List Balances
```bash
npm run list-balances
```

**Output format:**
```
User                     | Balance
-------------------------+---------
user@example.com         | 5000
admin@example.com        | 10000
```

### System Configuration

#### Update Banner
Create system-wide notifications for all users.

```bash
# Interactive mode
npm run update-banner

# Create public banner with date range
npm run update-banner -- \
  --message "Scheduled maintenance on Sunday 2-4 PM UTC" \
  --isPublic true \
  --startDate "2024-03-10T14:00:00Z" \
  --endDate "2024-03-10T16:00:00Z"
```

**Options:**
- `--message`: Banner text (required)
- `--isPublic`: Show to non-authenticated users (true/false)
- `--startDate`: When to start showing (ISO 8601 format)
- `--endDate`: When to stop showing (ISO 8601 format)

#### Delete Banner
```bash
npm run delete-banner
```

#### List MCP Tools
Lists Model Context Protocol servers from `librechat.yaml`.

```bash
# Run directly (not an npm script)
node config/list-mcp-tools.js
```

**Output includes:**
- Server names and their display names
- Available tools per server
- Configuration template for `librechat.yaml`

### Maintenance & Updates

#### Update LibreChat
Interactive wizard for updating LibreChat installations.

```bash
# Standard update
npm run update

# Local installation update
npm run update:local

# Docker installation update
npm run update:docker

# Update with sudo (for permission issues)
npm run update:sudo
```

**Update process:**
1. Detects environment (Docker/Local)
2. Backs up configuration files
3. Updates code and dependencies
4. Runs database migrations
5. Restarts services

#### Deployed Update
For production Docker deployments with minimal downtime.

```bash
# Standard deployed update
npm run update:deployed

# Rebase local changes onto update
npm run rebase:deployed
```

#### Stop Backend
Cross-platform script to stop Node.js backend processes.

```bash
npm run backend:stop
```

### Analytics & Monitoring

#### User Statistics
```bash
npm run user-stats
```

**Output includes:**
- Per-user conversation count
- Per-user message count
- Total system statistics
- Active user metrics

### Development Tools

#### Reinstall Packages
Cleans and reinstalls all npm dependencies.

```bash
# Standard reinstall
npm run reinstall

# Docker environment
npm run reinstall:docker
```

## Running Scripts

### NPM Scripts vs Direct Execution

Most scripts can be run two ways:

```bash
# Via npm script (recommended)
npm run create-user

# Direct execution
node config/create-user.js
```

### Command Line Arguments

Scripts support two modes:

1. **Interactive Mode**: Run without arguments for guided prompts
2. **Automated Mode**: Pass arguments for scripting/CI/CD

```bash
# Interactive (prompts for each value)
npm run create-user

# Automated (no prompts)
npm run create-user -- --email user@example.com --name "User"
```

> **Note**: Use `--` before arguments when running via npm.

## Environment Configuration

### Required Variables

```env
# Database Connection (required for most scripts)
MONGO_URI=mongodb://localhost:27017/LibreChat
# For Docker: mongodb://mongodb:27017/LibreChat?authSource=admin

# Application URL
APP_TITLE=LibreChat
DOMAIN_CLIENT=http://localhost:3080
DOMAIN_SERVER=http://localhost:3080

# Balance System (required for balance scripts)
CHECK_BALANCE=true

# Email Service (required for invite-user)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-password
EMAIL_FROM="LibreChat <noreply@example.com>"
EMAIL_FROM_NAME="LibreChat"

# Security
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Environment-Specific Files

- `.env`: Local development
- `.env.production`: Production settings
- `.env.docker`: Docker-specific overrides

## Docker vs Local Deployment

### Docker Considerations

Scripts automatically detect Docker environments and adjust:

- **File Paths**: Container paths vs host paths
- **Database Connection**: Uses container hostnames
- **Process Management**: Docker commands vs direct process control
- **Updates**: Handles container recreation

### Docker-Specific Commands

```bash
# Start deployed services
npm run start:deployed

# Stop deployed services
npm run stop:deployed

# Update in Docker
npm run update:docker

# Reinstall in Docker
npm run reinstall:docker
```

### Local Development

```bash
# Start backend in development mode
npm run backend:dev

# Update local installation
npm run update:local

# Direct script execution
node config/create-user.js
```

## Safety & Security

### ⚠️ Destructive Operations

Always backup before running:
- `delete-user`: Permanently removes user data
- `reset-terms`: Affects all users
- `set-balance`: Overwrites balance without audit trail
- `update`/`deployed-update`: Modifies installation

### Best Practices

1. **Backup First**
   ```bash
   # MongoDB backup
   mongodump --uri="$MONGO_URI" --out=./backup-$(date +%Y%m%d)
   ```

2. **Test in Development**
   - Use a separate development database
   - Test scripts with dummy data first

3. **Audit Trail**
   - Use `add-balance` instead of `set-balance` when possible
   - Keep logs of administrative actions
   - Document reasons for user bans/deletions

4. **Access Control**
   - Restrict access to config directory
   - Use environment-specific credentials
   - Never commit `.env` files

## Automation & CI/CD

### Batch User Creation

```bash
#!/bin/bash
# bulk-create-users.sh

USERS=(
  "user1@example.com,User One"
  "user2@example.com,User Two"
  "user3@example.com,User Three"
)

for user in "${USERS[@]}"; do
  IFS=',' read -r email name <<< "$user"
  npm run create-user -- --email "$email" --name "$name" --skipemail true
  npm run add-balance -- --email "$email" --amount 1000
done
```

### Maintenance Automation

```bash
#!/bin/bash
# maintenance.sh

# Set maintenance banner
npm run update-banner -- \
  --message "System maintenance in progress" \
  --isPublic true

# Stop services
npm run backend:stop

# Perform backup
mongodump --uri="$MONGO_URI" --out=./backup-$(date +%Y%m%d)

# Update system
npm run update:deployed

# Remove banner
npm run delete-banner

# Verify services
curl -f http://localhost:3080/health || exit 1
```

### GitHub Actions Example

```yaml
name: Add Users
on:
  workflow_dispatch:
    inputs:
      users:
        description: 'CSV of users (email,name)'
        required: true

jobs:
  add-users:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - name: Add users
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
        run: |
          IFS=',' read -ra USERS <<< "${{ github.event.inputs.users }}"
          for user in "${USERS[@]}"; do
            npm run create-user -- --email "$user" --skipemail true
          done
```

## Troubleshooting

### Common Issues

#### "Cannot find module" Error
```bash
# Solution: Install dependencies
cd /path/to/LibreChat
npm install
```

#### "MongoDB connection failed"
```bash
# Check MongoDB is running
systemctl status mongod  # Linux
brew services list       # macOS

# Test connection
mongosh "$MONGO_URI"
```

#### "Balance features not available"
```bash
# Add to .env file
CHECK_BALANCE=true

# Restart backend
npm run backend:stop
npm run backend
```

#### "Email sending failed"
```bash
# Verify SMTP settings
npm run invite-user -- --test

# Check email service logs
```

#### Permission Errors
```bash
# Use sudo for system-wide changes
npm run update:sudo

# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
DEBUG=librechat:* npm run create-user

# Check logs
tail -f ./api/logs/debug.log
```

### Exit Codes

Scripts use consistent exit codes:
- `0`: Success
- `1`: General error
- `2`: Invalid arguments
- `3`: Database connection error
- `4`: Resource not found
- `5`: Permission denied

## Contributing

### Adding New Scripts

1. **Follow the Pattern**
   ```javascript
   const { processArgs, askQuestion } = require('./helpers');
   
   // Support both CLI args and interactive mode
   const args = process.argv.slice(2);
   const { email } = processArgs(args, ['email']);
   
   if (!email) {
     const email = await askQuestion('Email: ');
   }
   ```

2. **Use Shared Helpers**
   - Console colors: `helpers.js` exports color methods
   - User input: `askQuestion()` for prompts
   - Exit handling: `silentExit()` for clean shutdown

3. **Add Error Handling**
   ```javascript
   process.on('uncaughtException', (err) => {
     console.error('Uncaught Exception:', err);
     process.exit(1);
   });
   ```

4. **Update Documentation**
   - Add to this README
   - Include in quick reference table
   - Add npm script to package.json

5. **Test Thoroughly**
   - Test interactive and automated modes
   - Test in Docker and local environments
   - Verify error handling

### Code Style

- Use CommonJS (`require`/`module.exports`)
- Follow existing naming conventions
- Add JSDoc comments for functions
- Keep scripts focused on single tasks

## Additional Resources

- **Translations**: See [`translations/README.md`](translations/README.md) for AI-powered translation tools
- **API Documentation**: See main LibreChat documentation
- **Docker Guide**: See Docker-specific documentation
- **Security Guide**: See security best practices documentation