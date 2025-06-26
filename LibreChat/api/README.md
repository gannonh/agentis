# Agentis API

**Modern Node.js API server powering the Agentis AI conversations platform with multi-provider support, streaming, and enterprise features.**

> **Note**: This API is part of the Agentis platform, which is based on the LibreChat open-source project. All LibreChat branding will be migrated to Agentis in upcoming releases.

The Agentis API is the backend engine that orchestrates conversations across multiple AI providers while managing authentication, file storage, real-time streaming, and enterprise-grade features for the Agentis AI platform.

## 🚀 Quick Start

```bash
# Prerequisites: Node.js 18+, MongoDB 4.4+
cd LibreChat

# Install dependencies
npm ci

# Build shared packages
npm run build:packages

# Configure environment
cp .env.example .env
# Edit .env with your API keys and MongoDB connection

# Start development server
npm run backend:dev  # Runs on http://localhost:3080
```

## ✨ Core Features

### Multi-Provider AI Support
- **OpenAI** (GPT-4, GPT-3.5-turbo, GPT-4o)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Opus)
- **Google** (Gemini Pro, Gemini Flash)
- **Azure OpenAI** (Enterprise deployments)
- **Local Models** (Ollama integration)

### Modern Authentication System
- **Better Auth** framework with magic link authentication
- **OAuth providers** (Google, GitHub, Discord, Facebook)
- **Multi-tenant organizations** with domain-based assignment
- **Account linking** between authentication providers
- **Two-factor authentication** (2FA) with backup codes
- **Role-based access control** (RBAC)

### Real-time Capabilities
- **Server-Sent Events** for streaming AI responses
- **Token-by-token streaming** for live conversation updates
- **Real-time file processing** with progress updates

### Advanced Tools & Agents
- **Model Context Protocol (MCP)** integration for extensible tools
- **LangChain agents** with function calling capabilities
- **Built-in tools**: DALL-E, Google Search, Wolfram Alpha, Weather, YouTube
- **Custom plugin system** via OpenAPI specifications
- **Dynamic tool loading** and management

### Enterprise Features
- **Multi-tenant architecture** with organization support
- **Usage tracking & billing** with balance management
- **Comprehensive audit logging** with Winston
- **Rate limiting** and abuse prevention
- **File storage** with multiple backends (S3, Azure, Firebase, Local)

## 🏗️ Architecture

The Agentis API follows a modern layered architecture built on Node.js with ES modules:

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

### Technology Stack

**Core Framework:**
- **Node.js** with **ES modules** (type: "module")
- **Express.js** 4.x for REST API
- **TypeScript** support with path aliases via `imports` field
- **MongoDB** with **Mongoose** 8.x ODM

**Authentication & Security:**
- **Better Auth** v1.2.9 (modern authentication framework)
- **Organization plugins** for multi-tenancy
- **Magic link authentication** (passwordless)
- **JWT** tokens with refresh mechanism
- **bcryptjs** for password hashing

**AI & ML Integration:**
- **OpenAI SDK** v4.96.2
- **Anthropic SDK** v0.37.0
- **Google Generative AI** v0.23.0
- **LangChain** ecosystem for agents and tools
- **Custom agents** with @librechat/agents

**Testing & Development:**
- **Vitest** 3.x (modern, fast test runner)
- **MongoDB Memory Server** for isolated testing
- **Supertest** for HTTP endpoint testing
- **V8 coverage** reporting

## 📁 Directory Structure

```
api/
├── app/                     # Core application modules
│   ├── clients/            # AI provider adapters
│   │   ├── BaseClient.js   # Common client functionality
│   │   ├── OpenAIClient.js # OpenAI integration
│   │   ├── AnthropicClient.js # Anthropic Claude
│   │   ├── GoogleClient.js # Google Gemini
│   │   ├── agents/         # LangChain AI agents
│   │   ├── tools/          # Function calling tools
│   │   └── prompts/        # Prompt management
│   └── index.js            # Client modules aggregator
├── server/                  # Express.js server
│   ├── controllers/        # Route handlers
│   │   ├── auth/           # Authentication controllers
│   │   ├── assistants/     # OpenAI Assistants API
│   │   └── agents/         # AI agent controllers
│   ├── middleware/         # Request processing pipeline
│   ├── routes/             # API endpoint definitions
│   ├── services/           # Business logic layer
│   └── utils/              # Server utilities
├── models/                  # MongoDB schema definitions
├── config/                  # Configuration management
├── cache/                   # Caching utilities & Redis
├── lib/                     # Database utilities
├── utils/                   # Shared utilities
├── scripts/                 # Administrative scripts
├── coverage/                # Test coverage reports
├── logs/                    # Application logs
└── test/                    # Test configurations
```

## 🔌 API Reference

### Authentication Endpoints (Better Auth)

| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | `/api/auth/sign-in/email`   | Email authentication          |
| POST   | `/api/auth/sign-in/google`  | Google OAuth                   |
| POST   | `/api/auth/sign-up/email`   | Create account                 |
| POST   | `/api/auth/sign-out`        | End session                    |
| GET    | `/api/auth/session`         | Get current session           |
| POST   | `/api/auth/magic-link`      | Send magic link               |
| GET    | `/api/auth/organization/check-domain` | Check org by domain |

### Legacy Authentication (Being Migrated)

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| POST   | `/api/auth/login`        | Legacy login                   |
| POST   | `/api/auth/logout`       | Legacy logout                  |
| POST   | `/api/auth/refresh`      | Token refresh                  |
| POST   | `/api/auth/register`     | Legacy registration            |

### Two-Factor Authentication

| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | `/api/auth/2fa/enable`       | Enable 2FA                     |
| POST   | `/api/auth/2fa/verify`       | Verify 2FA token               |
| POST   | `/api/auth/2fa/confirm`      | Confirm 2FA setup             |
| POST   | `/api/auth/2fa/disable`      | Disable 2FA                    |
| POST   | `/api/auth/2fa/backup/regenerate` | Regenerate backup codes   |

### Conversation Management

| Method | Endpoint                 | Description                    |
|--------|--------------------------|--------------------------------|
| GET    | `/api/convos`           | List user conversations        |
| POST   | `/api/convos`           | Create new conversation        |
| GET    | `/api/convos/:id`       | Get specific conversation      |
| PUT    | `/api/convos/:id`       | Update conversation            |
| DELETE | `/api/convos/:id`       | Delete conversation            |

### AI Chat Endpoints

| Method | Endpoint                | Description                    |
|--------|-------------------------|--------------------------------|
| POST   | `/api/ask/openAI`      | Send message to OpenAI         |
| POST   | `/api/ask/anthropic`   | Send message to Anthropic      |
| POST   | `/api/ask/google`      | Send message to Google         |
| POST   | `/api/ask/agents`      | Interact with AI agents        |
| POST   | `/api/edit/openAI`     | Edit message (OpenAI)          |
| POST   | `/api/edit/anthropic`  | Edit message (Anthropic)       |

### File Management

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| POST   | `/api/files/upload`  | Upload file attachment         |
| GET    | `/api/files`         | List user files                |
| GET    | `/api/files/:id`     | Download specific file         |
| DELETE | `/api/files/:id`     | Delete file                    |
| POST   | `/api/files/avatar`  | Upload user avatar             |

### Configuration & Models

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| GET    | `/api/models`       | Get available AI models        |
| GET    | `/api/endpoints`    | Get endpoint configurations    |
| GET    | `/api/config`       | Get application settings       |
| GET    | `/api/balance`      | Get user balance/usage         |

## ⚙️ Configuration

### Environment Variables

Create `.env` in the LibreChat directory:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/Agentis

# Better Auth Configuration
BETTER_AUTH_SECRET=your-256-bit-secret
BETTER_AUTH_URL=http://localhost:3080

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
AZURE_OPENAI_API_KEY=...

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# File Storage
CDN_PROVIDER=local  # or s3, firebase, azure
UPLOAD_DIR=./uploads

# Redis (optional)
REDIS_URI=redis://localhost:6379

# Email (for magic links)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security
HELMET_ENABLED=true
CORS_ORIGIN=http://localhost:3090
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
      gpt-4-turbo:
        max_tokens: 4096

  anthropic:
    models:
      claude-3-5-sonnet-20241022:
        max_tokens: 8192

# Rate Limiting
rateLimits:
  conversationsDaily: 100
  messagesPerHour: 50
  fileUploadsDaily: 20

# MCP Server Configuration
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
      
  - name: brave-search
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-brave-search"]
      env:
        BRAVE_API_KEY: your-brave-api-key

# Tool Configuration
tools:
  dalle:
    enabled: true
  google_search:
    enabled: true
    api_key: your-google-api-key
    cse_id: your-custom-search-engine-id
```

## 🧪 Development & Testing

### Testing Framework

The API uses **Vitest** for modern, fast testing:

```bash
# Run all tests
npm test

# Watch mode for development
npm test -- --watch

# Coverage report
npm run test:coverage

# Integration tests
npm run test:integration

# Run with UI
npm run test:ui
```

### Administrative Scripts

The API includes several user management utilities:

```bash
# User Management
npm run create-user        # Create new user
npm run invite-user        # Send invitation
npm run ban-user          # Ban user account
npm run delete-user       # Delete user account

# Balance Management  
npm run add-balance       # Add credits to user
npm run list-balances     # List user balances
npm run user-stats        # View user statistics
```

### Development Tools

```bash
# Code quality (run from LibreChat root)
npm run lint:api           # ESLint
npm run format             # Prettier
npm run typecheck:api      # TypeScript checking

# Development server with debugging
DEBUG=librechat:* npm run backend:dev

# Build shared packages
npm run build:packages
npm run build:data-provider
```

### Path Aliases

The API uses ES module path aliases for clean imports:

```javascript
// Import examples using path aliases
import config from '#config';
import User from '#models/User';
import { logger } from '#config/winston';
import { requireBetterAuth } from '#server/middleware';

// Available aliases (defined in package.json imports):
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
- **Magic link authentication** with time-based expiration
- **Better Auth framework** with modern security practices
- **Multi-factor authentication** (2FA) with TOTP
- **Account linking** between OAuth and magic link accounts
- **Organization-based access control** with domain assignment
- **Session management** with automatic cleanup

### Data Security
- **MongoDB sanitization** to prevent NoSQL injection
- **Input validation** with Zod schemas
- **Rate limiting** on all sensitive endpoints
- **File upload validation** with type and size restrictions
- **Helmet.js** for security headers
- **CORS** configuration for cross-origin requests

### API Security
- **JWT token validation** with refresh mechanism
- **Role-based access control** (RBAC)
- **Organization isolation** for multi-tenancy
- **Comprehensive logging** for audit trails
- **Request validation** middleware

## 🛠️ Extending the API

### Adding AI Providers

1. **Create client adapter**:

```javascript
// app/clients/YourAIClient.js
import BaseClient from './BaseClient.js';

class YourAIClient extends BaseClient {
  constructor(options = {}) {
    super(options);
    this.sender = 'YourAI';
    this.apiKey = options.apiKey;
  }

  async sendMessage(message, options = {}) {
    // Implement AI provider integration
    const response = await this.yourAIProvider.chat({
      messages: this.formatMessages(message.messages),
      ...options
    });

    return this.handleResponse(response);
  }

  async getTokenCount(text) {
    // Implement token counting
    return this.yourAIProvider.countTokens(text);
  }
}

export default YourAIClient;
```

2. **Register in endpoint configuration**:

```javascript
// server/services/Config/loadConfigEndpoints.js
const yourAIEndpoint = {
  type: 'yourai',
  models: {
    'your-model-name': {
      max_tokens: 4096,
      temperature: 0.7,
    }
  }
};
```

### Adding Tools

1. **Create structured tool**:

```javascript
// app/clients/tools/structured/YourTool.js
export const yourToolDefinition = {
  name: 'your_tool',
  description: 'Description of what your tool does',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      }
    },
    required: ['query']
  }
};

export async function yourToolFunction({ query }) {
  // Implement tool functionality
  const result = await yourApiCall(query);
  
  return {
    result: result.data,
    success: true
  };
}
```

### Creating Database Models

```javascript
// models/YourModel.js
import mongoose from 'mongoose';

const yourSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
});

// Ensure multi-tenant isolation
yourSchema.index({ userId: 1, organizationId: 1 });
yourSchema.index({ createdAt: -1 });

export default mongoose.model('YourModel', yourSchema);
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Errors:**
```bash
# Check MongoDB status
mongosh mongodb://localhost:27017/Agentis

# Verify connection string format
echo $MONGODB_URI

# Test connection with auth
mongosh "mongodb://user:pass@localhost:27017/Agentis?authSource=admin"
```

**Better Auth Issues:**
```bash
# Verify environment variables
echo $BETTER_AUTH_SECRET
echo $BETTER_AUTH_URL

# Check auth database collections
# In MongoDB shell:
show collections
db.sessions.find().limit(5)
db.accounts.find().limit(5)

# Clear sessions if needed
db.sessions.deleteMany({})
```

**Build Issues:**
```bash
# Rebuild all shared packages
npm run build:packages

# Clean install if persistent issues
rm -rf node_modules package-lock.json
npm ci

# Check package versions
npm list --depth=0
```

**File Upload Problems:**
```bash
# Check upload directory permissions
ls -la uploads/

# Create upload directories
mkdir -p uploads/images uploads/files uploads/avatars

# Check disk space
df -h .
```

### Debugging

**Enable comprehensive logging:**
```bash
DEBUG=librechat:* npm run backend:dev
```

**Monitor application logs:**
```bash
# View debug logs
tail -f logs/debug-$(date +%Y-%m-%d).log

# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# View login logs
tail -f login-logs.log
```

**Database debugging:**
```bash
# Connect to MongoDB
mongosh $MONGODB_URI

# Common debugging queries
db.users.countDocuments()
db.conversations.find().sort({createdAt: -1}).limit(5)
db.messages.find().sort({createdAt: -1}).limit(5)
```

## 📚 Additional Resources

### Testing Documentation
- **Comprehensive testing guide**: [README.testing.md](./README.testing.md)
- **Test fixtures and mocks**: `test/__mocks__/`
- **Integration test examples**: `models/__tests__/`

### Related Documentation
- **Agentis Frontend**: `../client/README.md`
- **Shared Packages**: `../packages/*/README.md`
- **Project Overview**: `../../README.md`
- **Configuration Examples**: `../config/`

### External Resources
- **Better Auth Documentation**: [better-auth.com](https://better-auth.com)
- **MongoDB Manual**: [docs.mongodb.com](https://docs.mongodb.com)
- **Express.js Guide**: [expressjs.com](https://expressjs.com)
- **Vitest Documentation**: [vitest.dev](https://vitest.dev)

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file in the project root.

---

**Powering the future of AI conversations with Agentis** 🚀