# LibreChat Configuration Scripts

> ⚡ **Quick Start**: `npm run create-user` → `npm run add-balance` → You're ready to go!

Administrative command-line tools for managing LibreChat deployments.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Prerequisites](#prerequisites)
- [Common Tasks](#common-tasks)
- [All Scripts](#all-scripts)
  - [User Management](#user-management)
  - [Balance Management](#balance-management)
  - [System Configuration](#system-configuration)
  - [Maintenance & Updates](#maintenance--updates)
  - [Analytics & Monitoring](#analytics--monitoring)
  - [Development Tools](#development-tools)
- [Running Scripts](#running-scripts)
- [Environment Configuration](#environment-configuration)
- [Docker vs Local](#docker-vs-local)
- [Automation](#automation)
- [Troubleshooting](#troubleshooting)

## Quick Reference

| Script | Purpose | DB | Balance | ⚠️ Risk |
|--------|---------|:--:|:-------:|:-------:|
| **User Management** |
| `create-user` | Add new user accounts | ✅ | - | Low |
| `delete-user` | Remove user accounts | ✅ | - | **High** |
| `list-users` | Display all users | ✅ | - | None |
| `ban-user` | Temporarily ban users | ✅ | - | Medium |
| `invite-user` | Send email invitations | ✅ | - | Low |
| `reset-password` | Change user passwords | ✅ | - | Medium |
| `reset-terms` | Reset ToS acceptance | ✅ | - | Medium |
| **Balance Management** |
| `add-balance` | Add tokens to balance | ✅ | ✅ | Low |
| `set-balance` | Set exact balance | ✅ | ✅ | Medium |
| `list-balances` | Show all balances | ✅ | ✅ | None |
| **System Configuration** |
| `update-banner` | Set system notifications | ✅ | - | Low |
| `delete-banner` | Remove notifications | ✅ | - | Low |
| `list-mcp-tools` | List MCP servers/tools | - | - | None |
| **Maintenance** |
| `update` | Update LibreChat | - | - | **High** |
| `deployed-update` | Update Docker deployment | - | - | **High** |
| `backend:stop` | Stop backend processes | - | - | Medium |
| **Analytics** |
| `user-stats` | Display usage statistics | ✅ | - | None |

## Prerequisites

```bash
# Check prerequisites
node --version      # Requires v18.17.0+
mongosh --version   # MongoDB must be running
```

**Required**:
- Node.js v18.17.0 or higher
- MongoDB (running and accessible)
- `.env` file configured in LibreChat root
- Dependencies installed (`npm install`)

## Common Tasks

### First-Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Create your first admin user
npm run create-user -- --email admin@example.com --name "Admin"

# 3. Give them tokens (if using balance system)
npm run add-balance -- --email admin@example.com --amount 10000
```

### Daily Operations
```bash
# Check user activity
npm run user-stats

# Add a new user
npm run create-user

# View all users
npm run list-users

# Check token balances
npm run list-balances
```

### Maintenance Tasks
```bash
# Set maintenance banner
npm run update-banner -- --message "Maintenance tonight at 10 PM" --isPublic true

# Update LibreChat
npm run update

# Remove banner after maintenance
npm run delete-banner
```

## All Scripts

### User Management

#### `create-user`
Creates new user accounts with optional email verification.

```bash
# Interactive mode (guided prompts)
npm run create-user

# Command line mode
npm run create-user -- --email user@example.com --name "John Doe"

# Skip email verification
npm run create-user -- --email user@example.com --name "John Doe" --skipemail true
```

**Options**:
- `--email` (required): User's email address
- `--name`: Display name
- `--username`: Login username (defaults to email)
- `--skipemail`: Skip email verification (true/false)

---

#### `delete-user`
⚠️ **Permanently deletes** user and all associated data.

```bash
# Interactive mode (with confirmation)
npm run delete-user

# Command line mode (still asks for confirmation)
npm run delete-user -- --email user@example.com
```

---

#### `list-users`
Displays all registered users.

```bash
npm run list-users
```

**Output**:
```
User ID                  | Email              | Username | Provider | Created
------------------------+--------------------+----------+----------+------------------------
507f1f77bcf86cd799439011 | user@example.com   | user123  | local    | 2024-01-15T10:30:00Z
```

---

#### `ban-user`
Temporarily or permanently bans users.

```bash
# Interactive mode
npm run ban-user

# Ban for 7 days
npm run ban-user -- --email user@example.com --duration 7

# Permanent ban
npm run ban-user -- --email user@example.com --duration -1

# Unban
npm run ban-user -- --email user@example.com --duration 0
```

---

#### `invite-user`
Sends email invitations (requires email service configured).

```bash
npm run invite-user -- --email newuser@example.com
```

---

#### `reset-password`
Changes a user's password (interactive only for security).

```bash
npm run reset-password
```

---

#### `reset-terms`
⚠️ Forces **all users** to re-accept terms of service.

```bash
npm run reset-terms
```

### Balance Management

> 📝 **Note**: Requires `CHECK_BALANCE=true` in `.env`

#### `add-balance`
Adds tokens to user balance (creates transaction record).

```bash
# Add tokens
npm run add-balance -- --email user@example.com --amount 1000

# Deduct tokens
npm run add-balance -- --email user@example.com --amount -500
```

---

#### `set-balance`
⚠️ Sets exact balance (no transaction record).

```bash
npm run set-balance -- --email user@example.com --amount 5000
```

---

#### `list-balances`
Shows all user balances.

```bash
npm run list-balances
```

### System Configuration

#### `update-banner`
Creates system-wide announcements.

```bash
# Simple banner
npm run update-banner -- --message "Welcome to LibreChat!"

# Timed banner
npm run update-banner -- \
  --message "Maintenance: Sunday 2-4 PM UTC" \
  --isPublic true \
  --startDate "2024-03-10T14:00:00Z" \
  --endDate "2024-03-10T16:00:00Z"
```

---

#### `delete-banner`
Removes active banner.

```bash
npm run delete-banner
```

---

#### `list-mcp-tools`
Lists Model Context Protocol servers from `librechat.yaml`.

```bash
node config/list-mcp-tools.js
```

### Maintenance & Updates

#### `update`
Interactive update wizard.

```bash
# Auto-detect environment
npm run update

# Force local update
npm run update:local

# Force Docker update
npm run update:docker

# With sudo
npm run update:sudo
```

---

#### `deployed-update`
Production Docker updates.

```bash
# Standard update
npm run update:deployed

# Rebase local changes
npm run rebase:deployed
```

---

#### `backend:stop`
Stops backend processes (cross-platform).

```bash
npm run backend:stop
```

### Analytics & Monitoring

#### `user-stats`
Shows usage statistics.

```bash
npm run user-stats
```

**Output**:
- Conversations per user
- Messages per user
- Total statistics

### Development Tools

#### Package Management
```bash
# Clean reinstall
npm run reinstall

# Docker reinstall
npm run reinstall:docker

# Rebuild package-lock
npm run rebuild:package-lock
```

## Running Scripts

### Two Ways to Run

```bash
# 1. Via npm script (recommended)
npm run create-user

# 2. Direct execution
node config/create-user.js
```

### Interactive vs Command Line

```bash
# Interactive mode - guided prompts
npm run create-user

# Command line mode - no prompts
npm run create-user -- --email user@example.com --name "User"
```

> 💡 **Tip**: Use `--` before arguments when using npm scripts

## Environment Configuration

### Essential Variables

```env
# Database (required)
MONGO_URI=mongodb://localhost:27017/LibreChat

# Application
APP_TITLE=LibreChat
DOMAIN_CLIENT=http://localhost:3080
DOMAIN_SERVER=http://localhost:3080

# Balance System
CHECK_BALANCE=true

# Email Service (for invitations)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email@example.com
EMAIL_PASSWORD=your-password
EMAIL_FROM="LibreChat <noreply@example.com>"

# Security
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Environment Files
- `.env` - Local development
- `.env.production` - Production
- `.env.docker` - Docker overrides

## Docker vs Local

### Docker Setup

```bash
# MongoDB connection in Docker
MONGO_URI=mongodb://mongodb:27017/LibreChat?authSource=admin

# Docker-specific commands
npm run update:docker
npm run reinstall:docker
npm run start:deployed
npm run stop:deployed
```

### Local Development

```bash
# MongoDB connection
MONGO_URI=mongodb://localhost:27017/LibreChat

# Development commands
npm run backend:dev
npm run update:local
node config/create-user.js
```

## Automation

### Batch User Creation

```bash
#!/bin/bash
# create-users.sh

USERS=(
  "user1@example.com,User One,1000"
  "user2@example.com,User Two,2000"
  "user3@example.com,User Three,1500"
)

for user in "${USERS[@]}"; do
  IFS=',' read -r email name balance <<< "$user"
  npm run create-user -- --email "$email" --name "$name" --skipemail true
  npm run add-balance -- --email "$email" --amount "$balance"
done
```

### Maintenance Script

```bash
#!/bin/bash
# maintenance.sh

# 1. Announce maintenance
npm run update-banner -- --message "Maintenance in progress" --isPublic true

# 2. Backup database
mongodump --uri="$MONGO_URI" --out=./backup-$(date +%Y%m%d)

# 3. Stop services
npm run backend:stop

# 4. Update system
npm run update:deployed

# 5. Clear banner
npm run delete-banner

# 6. Health check
curl -f http://localhost:3080/health || exit 1
```

### CI/CD Integration

```yaml
# .github/workflows/add-users.yml
name: Add Users
on:
  workflow_dispatch:
    inputs:
      users:
        description: 'User emails (comma-separated)'
        required: true

jobs:
  add-users:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: |
          IFS=',' read -ra EMAILS <<< "${{ github.event.inputs.users }}"
          for email in "${EMAILS[@]}"; do
            npm run create-user -- --email "$email" --skipemail true
          done
        env:
          MONGO_URI: ${{ secrets.MONGO_URI }}
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **"Cannot find module"** | Run `npm install` from LibreChat root |
| **"MongoDB connection failed"** | Check MongoDB is running: `mongosh "$MONGO_URI"` |
| **"Balance features not available"** | Add `CHECK_BALANCE=true` to `.env` |
| **"Email sending failed"** | Verify SMTP settings in `.env` |
| **Permission errors** | Use `npm run update:sudo` or fix npm permissions |

### Debug Mode

```bash
# Enable debug logging
DEBUG=librechat:* npm run create-user

# Check logs
tail -f ./api/logs/debug.log
```

### Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Database connection error
- `4` - Resource not found
- `5` - Permission denied

### Quick Fixes

```bash
# Reset npm packages
rm -rf node_modules package-lock.json
npm install

# Test MongoDB connection
mongosh "$MONGO_URI" --eval "db.adminCommand('ping')"

# Check script permissions
ls -la config/*.js

# Verify environment
node -e "console.log(process.env.MONGO_URI)"
```

## See Also

- [`translations/README.md`](translations/README.md) - AI-powered translation management
- [LibreChat Documentation](https://www.librechat.ai/docs)
- [Docker Deployment Guide](https://www.librechat.ai/docs/deployment/docker)
- [Environment Variables Reference](https://www.librechat.ai/docs/configuration/dotenv)