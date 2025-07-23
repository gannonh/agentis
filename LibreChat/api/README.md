# Agentis API

**Enterprise-grade Node.js API server for multi-provider AI conversations with streaming, authentication, and extensible tool integration.**

> **Note**: This API is part of the Agentis platform monorepo, based on the LibreChat open-source project. LibreChat branding is being migrated to Agentis across all components.

The Agentis API serves as the backend engine orchestrating conversations across multiple AI providers while managing authentication, file storage, real-time streaming, and enterprise-grade features within the larger Agentis platform ecosystem.

## 🚀 Quick Start

```bash
# Prerequisites: Node.js 18+, MongoDB 4.4+
# Clone and navigate to the project root (monorepo)
cd agentis

# Install dependencies for all packages
npm ci

# Build all shared packages (data-provider, data-schemas, mcp, arcade-client)
npm run build:all

# Configure environment (from project root)
cp .env.example .env
# Edit .env with your API keys and MongoDB connection

# Start API development server
npm run backend:dev  # Runs on http://localhost:3080
```

## ✨ Core Features

### Multi-Provider AI Support

- **OpenAI** (GPT-4, GPT-3.5-turbo, GPT-4o, GPT-4-turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku)
- **Google** (Gemini Pro, Gemini Flash)
- **Azure OpenAI** (Enterprise deployments)
- **Local Models** (Ollama integration)
- **AWS Bedrock** support
- **Cohere** integration

### Modern Authentication Architecture

- **Better Auth** framework with magic link and Google OAuth authentication
- **Multi-tenant organizations** with domain-based auto-assignment
- **Account linking** between authentication providers
- **Two-factor authentication** (2FA) with TOTP and backup codes
- **Role-based access control** (RBAC) with organization permissions

### Real-time Capabilities

- **Server-Sent Events** for streaming AI responses
- **Token-by-token streaming** with abort controllers
- **Real-time file processing** with progress updates
- **WebSocket support** for live updates
- **Request cancellation** and timeout handling

### Advanced Tools & Agents

- **Model Context Protocol (MCP)** server integration
- **Composio integration** streamable-http MCP services
- **LangChain agents** with function calling capabilities
- **Built-in tools**: DALL-E, Google Search, Wolfram Alpha, OpenWeather, YouTube
- **Custom plugin system** via OpenAPI specifications
- **Dynamic tool loading** and credential management

### Enterprise Features

- **Multi-tenant architecture** with organization isolation
- **Usage tracking & billing** with balance/credit management
- **Comprehensive audit logging** with structured JSON logs
- **Rate limiting** with Redis-based distributed limits
- **File storage backends** (S3, Azure Blob, Firebase, Local)
- **Database optimization** with performance monitoring and indexing
- **Search integration** with MeiliSearch
- **Email services** with template system

## 🏗️ Architecture

The Agentis API follows a modern layered architecture within a monorepo structure:

```
┌─────────────────────────────────────────────────┐
│                API Routes Layer                 │  ← Express.js REST endpoints
├─────────────────────────────────────────────────┤
│              Controllers Layer                  │  ← Request handling & validation
├─────────────────────────────────────────────────┤
│               Services Layer                    │  ← Business logic & integrations
├─────────────────────────────────────────────────┤
│           AI Client Adapters                    │  ← Provider abstraction layer
├─────────────────────────────────────────────────┤
│             Data Access Layer                   │  ← Mongoose models & MongoDB
├─────────────────────────────────────────────────┤
│            Infrastructure Layer                 │  ← Auth, caching, file storage
└─────────────────────────────────────────────────┘
```

### Monorepo Context

The API is part of a larger monorepo structure:

```
agentis/
├── api/                     # This API server
├── client/                  # React frontend
├── packages/
│   ├── data-provider/       # Shared data utilities
│   ├── data-schemas/        # TypeScript schemas
│   ├── librechat-mcp/       # MCP integration
│   └── arcade-client/       # Game framework client
├── docs/                    # Documentation
└── e2e/                     # End-to-end tests (Playwright)
```

### Technology Stack

**Core Framework:**

- **Node.js** with **ES modules** (`"type": "module"`)
- **Express.js** 4.21.2 for REST API
- **Path aliases** via `imports` field in package.json
- **MongoDB** 6.16.0 with **Mongoose** 8.12.1 ODM

**Authentication & Security:**

- **Better Auth** 1.2.9 (modern authentication framework)
- **Organization plugins** for multi-tenancy
- **Magic link authentication** (passwordless)
- **JWT** tokens with refresh mechanism (legacy compatibility)
- **bcryptjs** 2.4.3 for password hashing
- **Helmet** 8.1.0 for security headers

**AI & ML Integration:**

- **OpenAI SDK** 4.96.2
- **Anthropic SDK** 0.37.0
- **Google Generative AI** 0.23.0
- **LangChain** ecosystem (core 0.3.55, community 0.3.42)
- **Custom agents** with @librechat/agents 2.4.317
- **Cohere** 7.9.1

**Testing & Development:**

- **Vitest** 3.2.3 (modern, fast test runner)
- **Playwright** (E2E testing)
- **MongoDB Memory Server** 10.1.3 for isolated testing
- **Supertest** 7.1.0 for HTTP endpoint testing
- **V8 coverage** reporting

## 📁 Directory Structure

```
api/
├── app/                     # Core application modules
│   ├── clients/            # AI provider adapters
│   │   ├── BaseClient.js   # Abstract base client
│   │   ├── OpenAIClient.js # OpenAI GPT integration
│   │   ├── AnthropicClient.js # Anthropic Claude
│   │   ├── GoogleClient.js # Google Gemini/PaLM
│   │   ├── ChatGPTClient.js # Legacy ChatGPT wrapper
│   │   ├── OllamaClient.js # Local model integration
│   │   ├── PluginsClient.js # Plugin system
│   │   ├── TextStream.js   # Streaming utilities
│   │   ├── agents/         # LangChain AI agents
│   │   │   ├── CustomAgent/ # Custom agent implementation
│   │   │   └── Functions/  # Function calling agents
│   │   ├── tools/          # Function calling tools
│   │   │   ├── structured/ # Pre-built tools (DALL-E, Search, etc.)
│   │   │   └── dynamic/    # OpenAPI plugin system
│   │   ├── prompts/        # Prompt engineering utilities
│   │   ├── memory/         # Conversation memory management
│   │   └── callbacks/      # Event handlers
│   └── index.js            # App initialization
├── server/                  # Express.js server
│   ├── controllers/        # Route handlers
│   │   ├── auth/           # Authentication controllers
│   │   ├── assistants/     # OpenAI Assistants API
│   │   ├── agents/         # AI agent controllers
│   │   ├── AskController.js # Chat message handling
│   │   ├── EditController.js # Message editing
│   │   ├── UserController.js # User management
│   │   └── Balance.js      # Usage/billing
│   ├── middleware/         # Request processing pipeline
│   │   ├── requireBetterAuth.js # Better Auth middleware
│   │   ├── optionalBetterAuth.js # Optional auth
│   │   ├── requireJwtAuth.js # Legacy JWT auth
│   │   ├── limiters/       # Rate limiting modules
│   │   │   ├── messageLimiters.js
│   │   │   ├── uploadLimiters.js
│   │   │   └── loginLimiter.js
│   │   └── roles/          # RBAC implementation
│   │       ├── checkAdmin.js
│   │       └── checkOrganizationAdmin.js
│   ├── routes/             # API endpoint definitions
│   │   ├── auth.js         # Authentication routes
│   │   ├── ask/            # AI chat endpoints
│   │   ├── assistants/     # OpenAI Assistants
│   │   ├── agents/         # AI agents
│   │   ├── files/          # File management
│   │   ├── bedrock/        # AWS Bedrock integration
│   │   ├── organizationJoin.js # Organization management
│   │   ├── invitations.js  # User invitations
│   │   ├── composio.js     # Composio integration
│   │   └── convos.js       # Conversations
│   ├── services/           # Business logic layer
│   │   ├── Config/         # Configuration management
│   │   ├── Endpoints/      # AI provider services
│   │   ├── Files/          # File processing (S3, Azure, etc.)
│   │   ├── Runs/           # OpenAI Assistants run management
│   │   ├── Threads/        # Conversation threading
│   │   ├── OrganizationService.js # Multi-tenancy
│   │   ├── InvitationService.js # User invitations
│   │   ├── AuthService.js  # Authentication utilities
│   │   └── TokenService.js # Usage tracking
│   ├── repositories/       # Data access patterns
│   └── utils/              # Server utilities
├── models/                  # MongoDB schema definitions
│   ├── User.js             # User management (Better Auth compatible)
│   ├── Organization.js     # Organizations (disabled, using Better Auth)
│   ├── Conversation.js     # Chat conversations
│   ├── Message.js          # Individual messages
│   ├── File.js             # File attachments
│   ├── Assistant.js        # AI assistant configurations
│   ├── Agent.js            # Custom agent definitions
│   ├── Balance.js          # Usage/billing tracking
│   └── Role.js             # RBAC roles
├── config/                  # Configuration management
│   ├── betterAuth.js       # Better Auth configuration
│   ├── winston.js          # Logging setup
│   ├── paths.js            # File path management
│   └── index.js            # Core configuration exports
├── cache/                   # Caching utilities & Redis
│   ├── ioredisClient.js    # Redis client
│   ├── keyvRedis.js        # Key-value store
│   └── banViolation.js     # Abuse prevention
├── db/                      # Database utilities & migrations
│   ├── organization-indexes.js # Database optimization
│   ├── migrate-organization-indexes.js # CLI migration tool
│   ├── performance-monitor.js # Query performance monitoring
│   └── README.md           # Database documentation
├── lib/                     # Database utilities
│   └── db/                 # Database connection management
├── utils/                   # Shared utilities
│   ├── authEvents.js       # Authentication event handlers
│   ├── organization.js     # Organization utilities
│   ├── tokens.js           # Token management
│   └── LoggingSystem.js    # Structured logging
├── scripts/                 # Administrative scripts
│   └── makeUserAdmin.js    # User management
├── test/                    # Test configurations
│   ├── vitestSetup.js      # Test environment setup
│   └── __mocks__/          # Test mocks
├── coverage/                # Test coverage reports
├── logs/                    # Application logs
│   ├── debug-*.log         # Debug logs
│   └── error-*.log         # Error logs
├── package.json             # Dependencies and scripts
├── vitest.config.js         # Unit test configuration
├── vitest.config.integration.js # Integration test configuration
├── README.md               # This documentation
├── README.testing.md       # Testing documentation
├── CLAUDE.md               # Claude Code instructions
└── GEMINI.md               # Alternative documentation
```

## 🔌 API Reference

### Better Auth Endpoints

| Method | Endpoint                    | Description                   |
| ------ | --------------------------- | ----------------------------- |
| POST   | `/api/auth/sign-in/email`   | Email/password authentication |
| POST   | `/api/auth/sign-in/google`  | Google OAuth sign-in          |
| POST   | `/api/auth/sign-in/github`  | GitHub OAuth sign-in          |
| POST   | `/api/auth/sign-in/discord` | Discord OAuth sign-in         |
| POST   | `/api/auth/sign-up/email`   | Create account with email     |
| POST   | `/api/auth/sign-out`        | End session                   |
| GET    | `/api/auth/session`         | Get current session           |
| POST   | `/api/auth/magic-link`      | Send magic link email         |
| POST   | `/api/auth/verify-email`    | Verify email address          |
| POST   | `/api/auth/forgot-password` | Password reset request        |
| POST   | `/api/auth/reset-password`  | Reset password with token     |

### Legacy Authentication (Migration Support)

| Method | Endpoint             | Description         |
| ------ | -------------------- | ------------------- |
| POST   | `/api/auth/login`    | Legacy JWT login    |
| POST   | `/api/auth/logout`   | Legacy JWT logout   |
| POST   | `/api/auth/refresh`  | JWT token refresh   |
| POST   | `/api/auth/register` | Legacy registration |

### Organization Management

| Method | Endpoint                                   | Description                          | Auth Required |
| ------ | ------------------------------------------ | ------------------------------------ | ------------- |
| POST   | `/api/organization/auto-join`              | Auto-join organization by domain     | ✅ User       |
| POST   | `/api/organization/request-join`           | Request to join organization         | ✅ User       |
| GET    | `/api/organization/:id/join-requests`      | Get join requests                    | ✅ Admin      |
| POST   | `/api/organization/:id/approve/:requestId` | Approve join request                 | ✅ Admin      |
| POST   | `/api/organization/:id/reject/:requestId`  | Reject join request                  | ✅ Admin      |
| POST   | `/api/organization/enable-domain-join`     | Enable domain auto-join              | ✅ Owner      |
| GET    | `/api/organization/membership-status`      | Check user membership status         | ✅ User       |
| GET    | `/api/organization/check-join-eligibility` | Check auto-join eligibility          | ✅ User       |
| POST   | `/api/organization/detect-domain`          | Detect organizations by email domain | ✅ User       |

### User Invitations

| Method | Endpoint                          | Description                   | Auth Required |
| ------ | --------------------------------- | ----------------------------- | ------------- |
| POST   | `/api/invitations/send`           | Send user invitation          | ✅ Admin      |
| GET    | `/api/invitations/:token`         | Get invitation details        | Public        |
| POST   | `/api/invitations/:token/accept`  | Accept invitation             | ✅ User       |
| POST   | `/api/invitations/:token/decline` | Decline invitation            | ✅ User       |
| GET    | `/api/invitations`                | List organization invitations | ✅ Admin      |
| DELETE | `/api/invitations/:id`            | Cancel invitation             | ✅ Admin      |

### Two-Factor Authentication

| Method | Endpoint                          | Description                   |
| ------ | --------------------------------- | ----------------------------- |
| GET    | `/api/auth/2fa/enable`            | Generate 2FA setup QR code    |
| POST   | `/api/auth/2fa/verify`            | Verify 2FA token during login |
| POST   | `/api/auth/2fa/confirm`           | Confirm 2FA setup completion  |
| POST   | `/api/auth/2fa/disable`           | Disable 2FA                   |
| POST   | `/api/auth/2fa/backup/regenerate` | Regenerate backup codes       |

### Conversation Management

| Method | Endpoint                    | Description                  |
| ------ | --------------------------- | ---------------------------- |
| GET    | `/api/convos`               | List user conversations      |
| POST   | `/api/convos`               | Create new conversation      |
| GET    | `/api/convos/:id`           | Get specific conversation    |
| PUT    | `/api/convos/:id`           | Update conversation metadata |
| DELETE | `/api/convos/:id`           | Delete conversation          |
| POST   | `/api/convos/:id/gen-title` | Generate conversation title  |

### AI Chat Endpoints

| Method | Endpoint              | Description                    |
| ------ | --------------------- | ------------------------------ |
| POST   | `/api/ask/openAI`     | Send message to OpenAI models  |
| POST   | `/api/ask/anthropic`  | Send message to Anthropic      |
| POST   | `/api/ask/google`     | Send message to Google models  |
| POST   | `/api/ask/agents`     | Interact with LangChain agents |
| POST   | `/api/ask/custom`     | Custom endpoint models         |
| POST   | `/api/edit/openAI`    | Edit message (OpenAI)          |
| POST   | `/api/edit/anthropic` | Edit message (Anthropic)       |
| POST   | `/api/edit/google`    | Edit message (Google)          |

### OpenAI Assistants API

| Method | Endpoint                   | Description           |
| ------ | -------------------------- | --------------------- |
| GET    | `/api/assistants`          | List assistants       |
| POST   | `/api/assistants`          | Create assistant      |
| GET    | `/api/assistants/:id`      | Get assistant details |
| PUT    | `/api/assistants/:id`      | Update assistant      |
| DELETE | `/api/assistants/:id`      | Delete assistant      |
| POST   | `/api/assistants/:id/chat` | Chat with assistant   |

### File Management

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| POST   | `/api/files/upload`     | Upload file attachment    |
| GET    | `/api/files`            | List user files           |
| GET    | `/api/files/:id`        | Download specific file    |
| DELETE | `/api/files/:id`        | Delete file               |
| POST   | `/api/files/avatar`     | Upload user avatar        |
| POST   | `/api/files/speech/stt` | Speech-to-text conversion |
| POST   | `/api/files/speech/tts` | Text-to-speech generation |

### Configuration & Models

| Method | Endpoint         | Description                  |
| ------ | ---------------- | ---------------------------- |
| GET    | `/api/models`    | Get available AI models      |
| GET    | `/api/endpoints` | Get endpoint configurations  |
| GET    | `/api/config`    | Get application settings     |
| GET    | `/api/balance`   | Get user balance/usage stats |

## ⚙️ Configuration

### Environment Variables

Create `.env` in the project root (monorepo):

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/Agentis

# Better Auth Configuration
BETTER_AUTH_SECRET=your-256-bit-secret-key-for-encryption
BETTER_AUTH_URL=http://localhost:3080
DOMAIN_SERVER=localhost:3080
DOMAIN_CLIENT=localhost:3090

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
AZURE_OPENAI_API_KEY=...

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
DISCORD_CLIENT_ID=your-discord-oauth-client-id
DISCORD_CLIENT_SECRET=your-discord-oauth-client-secret

# File Storage
CDN_PROVIDER=local  # Options: local, s3, azure, firebase
UPLOAD_DIR=./uploads

# AWS S3 (if using CDN_PROVIDER=s3)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Redis (optional, for caching and rate limiting)
REDIS_URI=redis://localhost:6379

# Email Configuration (for magic links)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@agentis.ai

# Security
HELMET_ENABLED=true
CORS_ORIGIN=http://localhost:3090
ALLOW_REGISTRATION=true

# Search (optional)
MEILI_MASTER_KEY=your-meilisearch-key
MEILI_HOST=http://localhost:7700

# Logging
LOG_LEVEL=info
```

### Advanced Configuration

Configure via `librechat.yaml` in project root:

```yaml
version: 1.1.0

# AI Model Configuration
endpoints:
  openAI:
    models:
      gpt-4o:
        max_tokens: 4096
        temperature: 0.7
        stream: true
      gpt-4-turbo:
        max_tokens: 4096
        temperature: 0.7

  anthropic:
    models:
      claude-3-5-sonnet-20241022:
        max_tokens: 8192
        temperature: 0.7

  google:
    models:
      gemini-pro:
        max_tokens: 2048
        temperature: 0.9

# Rate Limiting Configuration
rateLimits:
  conversationsDaily: 100
  messagesPerHour: 50
  fileUploadsDaily: 20
  loginAttempts: 5

# MCP Server Configuration
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ['-y', '@modelcontextprotocol/server-filesystem']
      env:
        ROOT_PATH: ./workspace

  - name: brave-search
    enabled: true
    config:
      command: npx
      args: ['-y', '@modelcontextprotocol/server-brave-search']
      env:
        BRAVE_API_KEY: your-brave-api-key

# Tool Configuration
tools:
  dalle:
    enabled: true
    model: 'dall-e-3'
  google_search:
    enabled: true
    api_key: your-google-api-key
    cse_id: your-custom-search-engine-id
  wolfram:
    enabled: false
    api_key: your-wolfram-alpha-key

# Organization Settings
organizations:
  enableAutoJoin: true
  requireDomainVerification: true
  defaultRole: 'member'
```

## 🧪 Development & Testing

### Modern Testing Framework

The API uses **Vitest** for modern, ESM-native testing:

```bash
# Unit tests (default - excludes integration tests)
npm run test:unit

# All tests including integration (requires MongoDB)
npm test

# Watch mode for development
npm test -- --watch

# Coverage report
npm run test:coverage

# Integration tests only (requires MongoDB)
npm run test:integration

# Run with UI interface
npm run test:ui

# CI mode with verbose output
npm run test:ci
```

### Test Structure & Organization

**Unit Tests**:

- Files: `**/*.vitest.js` (excluding `*.integration.vitest.js`)
- Location: Co-located with source files or in `__tests__/` directories
- Database: Uses MongoDB Memory Server (no real database required)
- Speed: Fast execution for CI/CD pipelines

**Integration Tests**:

- Files: `**/*.integration.vitest.js`
- Location: `__tests__/integration/` subdirectories
- Database: Real MongoDB connection with `AgentisTest` database
- Purpose: Test actual database performance, indexes, and API endpoints

**E2E Tests** (from project root):

```bash
# Prerequisites: Frontend must be built and running
npm run build:frontend
npm run frontend:build

# Run E2E tests with Playwright
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e -- --ui
```

### Database Performance Optimization

```bash
# Set up database indexes for optimal performance
cd api && node db/migrate-organization-indexes.js migrate

# Analyze current database performance
cd api && node db/migrate-organization-indexes.js analyze

# Run performance validation tests
npm run test:integration

# View performance reports
cd api && node db/migrate-organization-indexes.js info
```

### Administrative Scripts

```bash
# User Management (run from API directory)
cd api

# User administration
node scripts/makeUserAdmin.js <userId>

# Available npm scripts from project root
npm run create-user        # Create new user account
npm run invite-user        # Send user invitation
npm run ban-user          # Ban user account
npm run delete-user       # Delete user account

# Balance Management
npm run add-balance       # Add credits to user account
npm run list-balances     # List all user balances
npm run user-stats        # View user statistics
```

### Development Tools

```bash
# Code quality tools (run from project root)
npm run lint:api           # ESLint for API code
npm run format             # Prettier formatting
npm run typecheck:api      # TypeScript type checking

# Development server with comprehensive debugging
DEBUG=librechat:* npm run backend:dev

# Build all shared packages
npm run build:all

# Individual package builds
npm run build:data-provider
npm run build:data-schemas
npm run build:mcp
```

### Path Aliases

The API uses ES module path aliases for clean imports:

```javascript
// Import examples using path aliases (defined in package.json)
import config from '#config';
import User from '#models/User';
import { logger } from '#config/winston';
import { requireBetterAuth } from '#server/middleware';
import { OrganizationService } from '#server/services';

// Available aliases:
// #*         → ./*
// #config/*  → ./config/*
// #models/*  → ./models/*
// #server/*  → ./server/*
// #utils/*   → ./utils/*
// #lib/*     → ./lib/*
// #app/*     → ./app/*
// #cache/*   → ./cache/*
```

## 🔒 Security Features

### Authentication Security

- **Better Auth framework** with modern security practices
- **Magic link authentication** with time-based expiration and rate limiting
- **Multi-factor authentication** (2FA) with TOTP and backup codes
- **Account linking** between OAuth providers and magic link accounts
- **Organization-based access control** with automatic domain assignment
- **Session management** with secure cookies and automatic cleanup
- **Password policies** with bcrypt hashing and salt rounds
- **Anti-brute force** protection with exponential backoff

### Data Security

- **MongoDB sanitization** to prevent NoSQL injection attacks
- **Input validation** with comprehensive Zod schemas
- **Rate limiting** on all sensitive endpoints with Redis backing
- **File upload validation** with MIME type checking and size limits
- **Helmet.js** for comprehensive security headers
- **CORS** configuration with environment-specific origins
- **Content Security Policy** headers
- **SQL injection prevention** (despite using MongoDB)

### API Security

- **JWT token validation** with RSA256 signing and refresh mechanism
- **Role-based access control** (RBAC) with granular permissions
- **Organization isolation** ensuring multi-tenant data separation
- **Request signing** for sensitive operations
- **Comprehensive audit logging** with structured JSON format
- **IP-based rate limiting** and geographic restrictions
- **API key management** with scoped permissions

### ID Format Compatibility

- **Dual ID format support**: Better Auth (string UUIDs) + MongoDB ObjectIds
- **Middleware detection** of ID formats for seamless compatibility
- **Database query optimization** for both ID types
- **Migration-safe operations** during auth system transition

## 🛠️ Extending the API

### Adding AI Providers

1. **Create client adapter extending BaseClient**:

```javascript
// app/clients/YourAIClient.js
import BaseClient from './BaseClient.js';

class YourAIClient extends BaseClient {
  constructor(options = {}) {
    super(options);
    this.sender = 'YourAI';
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL || 'https://api.yourservice.com';
  }

  async sendMessage(message, options = {}) {
    // Format messages for your AI provider
    const messages = this.formatMessages(message.messages);

    // Call your AI provider's API
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: options.model || 'your-default-model',
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.7,
        stream: options.stream || false,
      }),
    });

    return this.handleResponse(response, options);
  }

  async getTokenCount(text) {
    // Implement token counting for your provider
    return Math.ceil(text.length / 4); // Simple estimation
  }
}

export default YourAIClient;
```

2. **Register in endpoint configuration**:

```javascript
// server/services/Config/loadConfigEndpoints.js
const yourAIEndpoint = {
  type: 'yourai',
  name: 'Your AI Service',
  models: {
    'your-model-v1': {
      max_tokens: 4096,
      temperature: 0.7,
      stream: true,
    },
    'your-model-v2': {
      max_tokens: 8192,
      temperature: 0.5,
      stream: true,
    },
  },
  titleModel: 'your-model-v1',
  order: 4,
};
```

3. **Add route handler**:

```javascript
// server/routes/ask/yourAI.js
import express from 'express';
import { requireBetterAuth } from '#server/middleware';
import { handleYourAIRequest } from '#server/controllers';

const router = express.Router();

router.post('/', requireBetterAuth, handleYourAIRequest);

export default router;
```

### Adding Tools

1. **Create structured tool**:

```javascript
// app/clients/tools/structured/YourTool.js
export const yourToolDefinition = {
  type: 'function',
  function: {
    name: 'your_tool',
    description: 'Performs a specific task for users',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query or input text',
        },
        options: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['json', 'text', 'html'],
              description: 'Output format preference',
            },
          },
        },
      },
      required: ['query'],
    },
  },
};

export async function yourToolFunction({ query, options = {} }) {
  try {
    // Implement your tool's functionality
    const result = await performYourToolOperation(query, options);

    return {
      success: true,
      data: result,
      format: options.format || 'text',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
```

2. **Register tool in service**:

```javascript
// app/clients/tools/index.js
import { yourToolDefinition, yourToolFunction } from './structured/YourTool.js';

export const structuredTools = {
  // ... existing tools
  your_tool: {
    definition: yourToolDefinition,
    function: yourToolFunction,
  },
};
```

### Creating Database Models

```javascript
// models/YourModel.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const yourSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    settings: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'yourmodels',
  },
);

// Compound indexes for multi-tenant queries
yourSchema.index({ userId: 1, organizationId: 1 });
yourSchema.index({ organizationId: 1, isActive: 1 });
yourSchema.index({ createdAt: -1 });

// Instance methods
yourSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static methods
yourSchema.statics.findByUser = function (userId, organizationId) {
  return this.find({
    userId,
    organizationId,
    isActive: true,
  }).sort({ createdAt: -1 });
};

export default mongoose.model('YourModel', yourSchema);
```

### Adding Middleware

```javascript
// server/middleware/yourMiddleware.js
import { logger } from '#config/winston';

export const yourMiddleware = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Implement your middleware logic
      const result = await processRequest(req, options);

      // Add data to request object
      req.yourData = result;

      // Log the operation
      logger.info('Your middleware processed request', {
        userId: req.user?.id,
        path: req.path,
        method: req.method,
      });

      next();
    } catch (error) {
      logger.error('Your middleware error', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
      });

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
};
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Errors:**

```bash
# Check MongoDB status and connectivity
mongosh mongodb://localhost:27017/Agentis

# Test connection with authentication
mongosh "mongodb://username:password@localhost:27017/Agentis?authSource=admin"

# Verify environment variables
echo $MONGODB_URI

# Check MongoDB logs for detailed errors
docker logs mongodb-container

# Test from inside container network
docker exec -it mongodb-container mongosh
```

**Better Auth Issues:**

```bash
# Verify Better Auth environment variables
echo $BETTER_AUTH_SECRET
echo $BETTER_AUTH_URL
echo $DOMAIN_SERVER
echo $DOMAIN_CLIENT

# Check Better Auth database collections
mongosh $MONGODB_URI
> use Agentis
> show collections
> db.sessions.find().limit(5)
> db.accounts.find().limit(5)
> db.users.find().limit(5)

# Clear problematic sessions
> db.sessions.deleteMany({})

# Check for account linking issues
> db.accounts.aggregate([
    { $group: { _id: "$userId", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ])
```

**Build and Dependency Issues:**

```bash
# Clean install all dependencies
rm -rf node_modules package-lock.json
npm ci

# Rebuild all shared packages
npm run build:all

# Check for version conflicts
npm list --depth=0
npm audit

# Clear npm cache if needed
npm cache clean --force

# Check Node.js version compatibility
node --version  # Should be 18+
npm --version
```

**File Upload Problems:**

```bash
# Check upload directory permissions and existence
ls -la uploads/
mkdir -p uploads/{images,files,avatars}
chmod 755 uploads/

# Check disk space
df -h .

# Test file upload endpoint
curl -X POST http://localhost:3080/api/files/upload \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@test.txt"

# Check file storage configuration
echo $CDN_PROVIDER
echo $UPLOAD_DIR
```

**Rate Limiting Issues:**

```bash
# Check Redis connection if using Redis-based rate limiting
redis-cli ping

# Verify Redis configuration
echo $REDIS_URI

# Clear rate limit data if needed
redis-cli FLUSHALL

# Check rate limit configuration in logs
grep "rate limit" logs/debug-$(date +%Y-%m-%d).log
```

### Performance Issues

**Database Performance:**

```bash
# Run database optimization migration
cd api && node db/migrate-organization-indexes.js migrate

# Analyze current performance
cd api && node db/migrate-organization-indexes.js analyze

# Check slow queries in MongoDB
mongosh $MONGODB_URI
> use Agentis
> db.setProfilingLevel(2, { slowms: 100 })
> db.system.profile.find().sort({ ts: -1 }).limit(5)

# Check index usage
> db.conversations.find({ userId: ObjectId("...") }).explain("executionStats")
```

**Memory and CPU Issues:**

```bash
# Monitor Node.js memory usage
node --max-old-space-size=4096 server/index.js

# Enable garbage collection logging
node --trace-gc server/index.js

# Use Node.js built-in profiler
node --prof server/index.js
# After stopping, process the log
node --prof-process isolate-*.log > processed.txt
```

### Debugging

**Enable comprehensive logging:**

```bash
# Start with debug logging enabled
DEBUG=librechat:* npm run backend:dev

# Enable specific debug namespaces
DEBUG=librechat:auth,librechat:db npm run backend:dev

# Log to file
DEBUG=librechat:* npm run backend:dev 2>&1 | tee debug.log
```

**Monitor application logs:**

```bash
# View real-time debug logs
tail -f logs/debug-$(date +%Y-%m-%d).log

# View real-time error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# Search for specific errors
grep -r "error" logs/ | head -20

# Monitor authentication events
grep "auth" logs/debug-$(date +%Y-%m-%d).log
```

**Database debugging:**

```bash
# Connect to MongoDB
mongosh $MONGODB_URI

# Check database statistics
> db.stats()

# Count documents in main collections
> db.users.countDocuments()
> db.conversations.countDocuments()
> db.messages.countDocuments()
> db.organization.countDocuments()

# Find recent conversations
> db.conversations.find().sort({createdAt: -1}).limit(5)

# Debug organization membership issues
> db.member.find().limit(5)
> db.accounts.find().limit(5)

# Check for data inconsistencies
> db.conversations.find({ userId: { $exists: false } }).count()
```

**API endpoint debugging:**

```bash
# Test authentication endpoints
curl -X POST http://localhost:3080/api/auth/session \
  -H "Content-Type: application/json" \
  -c cookies.txt

# Test protected endpoints
curl -X GET http://localhost:3080/api/convos \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -b cookies.txt

# Monitor API requests
curl -X GET http://localhost:3080/api/config \
  -H "Content-Type: application/json" \
  -v

# Check health endpoint
curl -X GET http://localhost:3080/api/health
```

## 📚 Additional Resources

### Documentation

- **Testing Guide**: [README.testing.md](./README.testing.md)
- **Database Optimization**: [db/README.md](./db/README.md)
- **Database Testing**: [db/README.testing.md](./db/README.testing.md)

### Monorepo Documentation

- **Frontend (React)**: `../client/README.md`
- **Data Provider Package**: `../packages/data-provider/README.md`
- **MCP Integration**: `../packages/librechat-mcp/README.md`
- **Data Schemas**: `../packages/data-schemas/README.md`
- **Project Overview**: `../../README.md`

### Test Resources

- **Test Fixtures**: `test/__mocks__/`
- **Unit Test Examples**: `models/__tests__/`
- **Integration Tests**: `**/__tests__/integration/`
- **E2E Tests**: `../../e2e/`

### External Resources

- **Better Auth Documentation**: [better-auth.com](https://better-auth.com)
- **MongoDB Manual**: [docs.mongodb.com](https://docs.mongodb.com)
- **Express.js Guide**: [expressjs.com](https://expressjs.com)
- **Vitest Documentation**: [vitest.dev](https://vitest.dev)
- **Playwright Documentation**: [playwright.dev](https://playwright.dev)
- **LangChain Documentation**: [js.langchain.com](https://js.langchain.com)

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file in the project root.

---

**Powering the future of AI conversations with Agentis** 🚀
