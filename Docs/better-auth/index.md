# Better Auth Documentation Links & Notes

## Overview
This directory contains local copies of Better Auth documentation for the Agentis project. These docs were fetched from the Better Auth website and converted to markdown for offline reference.

## Documentation Index

### 1. Getting Started
- [Basic Usage](./basic-usage.md) - Basic authentication setup and usage patterns

### 2. Core Concepts
- [TypeScript](./typescript.md) - Type-safe config, strict mode, and type inference for user/session objects
- [Database](./database.md) - Database adapters, migrations, schema management, and MongoDB configuration
- [User & Accounts](./users-accounts.md) - User profile, password, email, and account management
- [Plugins](./plugins.md) - Plugin system, creating custom plugins, and plugin architecture

### 3. Authentication Methods
- [Email & Password](./email-password.md) - Email/password authentication setup and configuration
- [Google OAuth](./google-oauth.md) - Google OAuth provider setup and configuration
- [Magic Link](./magic-link.md) - Passwordless authentication via email links
- [Email OTP](./email-otp.md) - One-time password authentication via email

### 4. Plugins
- [Organization](./organization.md) - Full-featured org/team/membership/invitation/role support with multi-tenancy
- [Admin](./admin.md) - User CRUD, roles, bans, impersonation, and access control
- [Stripe](./stripe.md) - Customer creation, subscription management, webhooks, team plans, and reference IDs for org billing

### 5. Release Notes
- [1.2 Release](./1-2-release.md) - Stripe, teams, captcha, API keys, and other new features

## Key Implementation Notes

### TypeScript Support
- Enable strict mode in tsconfig.json for Better Auth compatibility
- Use `$Infer` property to infer types from plugins
- Additional fields are properly typed and available on server/client

### MongoDB Backend
- Always use `authSource=admin` in MongoDB connection strings when using Docker
- Specify database name explicitly (e.g., `/Agentis`) to avoid using default "test" database
- Example: `mongodb://admin:password@localhost:27017/Agentis?authSource=admin`

### Multi-Tenancy (Organizations/Teams)
- Organizations can have teams/sub-organizations as of v1.2
- Associate subscriptions with organizations for team billing
- Implement `authorizeReference` function for permission checks

### Stripe Integration
- Supports both customer-only and subscription management
- Reference system allows associating subscriptions with users or organizations
- Team subscriptions support seat-based pricing
- Webhook handling for subscription lifecycle events

### Authentication Flows
- Email & Password with optional email verification
- Magic Link (email link) authentication
- Email OTP for passwordless sign-in
- Google OAuth with additional scope requests
- All methods support account linking

## Migration Commands

```bash
# Generate schema
npx @better-auth/cli generate

# Run migrations
npx @better-auth/cli migrate

# Initialize Better Auth in project
npx @better-auth/cli init
```



## Additional Resources

- [Better Auth Website](https://www.better-auth.com)
- [GitHub Repository](https://github.com/better-auth/better-auth)
- [Discord Community](https://discord.gg/better-auth)
