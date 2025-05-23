# LibreChat API

The backend API server for Agentis (a branded fork of LibreChat), providing a comprehensive REST API for AI-powered conversational experiences with advanced features like multi-provider support, streaming responses, and extensible tool systems.

## Overview

This directory contains the Node.js/Express backend that powers LibreChat's multi-provider AI chat functionality. The API is designed to be modular, scalable, and extensible, handling everything from authentication and conversation management to real-time message streaming and advanced AI agent interactions.

### Key Capabilities
- **Multi-Provider AI Integration**: Seamless switching between OpenAI, Anthropic, Google, Azure, and open-source models
- **Real-time Streaming**: Server-Sent Events (SSE) for live AI responses
- **Advanced Agent System**: Custom agents with tool use and function calling
- **Model Context Protocol (MCP)**: Extensible tool system for AI interactions
- **Flexible File Storage**: Support for local, S3, Azure Blob, and Firebase storage
- **Token Economy**: Built-in credit/balance system for usage tracking
- **Enterprise Features**: LDAP auth, RBAC, audit logging, and compliance tools

## Architecture

The API follows a layered architecture pattern:

```
┌─────────────────────────────────────────────────┐
│                   Routes Layer                  │
│         Express routes define API endpoints     │
├─────────────────────────────────────────────────┤
│                Controller Layer                 │
│     Handle HTTP requests/responses, validation  │
├─────────────────────────────────────────────────┤
│                 Service Layer                   │
│     Business logic, AI client orchestration     │
├─────────────────────────────────────────────────┤
│              Data Access Layer                  │
│        Mongoose models, database queries        │
├─────────────────────────────────────────────────┤
│                Infrastructure                   │
│    MongoDB, Redis, File Storage, External APIs  │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
api/
├── app/                    # Core application logic
│   ├── clients/           # AI provider client adapters
│   │   ├── BaseClient.js  # Abstract base class defining client interface
│   │   ├── OpenAIClient.js       # OpenAI GPT models + Assistants
│   │   ├── AnthropicClient.js    # Claude models
│   │   ├── GoogleClient.js       # PaLM/Gemini models
│   │   ├── OllamaClient.js       # Local models via Ollama
│   │   ├── PluginsClient.js      # Plugin-enhanced conversations
│   │   ├── agents/              # Agent-based conversation system
│   │   │   ├── CustomAgent/     # Extensible agent framework
│   │   │   └── Functions/       # Agent function implementations
│   │   ├── tools/               # Tool/Function calling system
│   │   │   ├── dynamic/         # Runtime-loaded tools
│   │   │   ├── structured/      # Pre-defined tool schemas
│   │   │   └── util/            # Tool utilities
│   │   ├── prompts/             # Prompt engineering
│   │   │   ├── formatMessages.js
│   │   │   ├── titlePrompts.js
│   │   │   └── artifacts.js     # Code artifact handling
│   │   └── memory/              # Conversation memory strategies
│   │       ├── summaryBuffer.js # Sliding window + summary
│   │       └── tokenBuffer.js   # Token-based truncation
│   └── index.js           # Express app initialization
│
├── cache/                 # Caching and rate limiting
│   ├── keyvRedis.js      # Redis adapter for distributed cache
│   ├── keyvMongo.js      # MongoDB adapter for persistent cache
│   ├── keyvFiles.js      # File-based cache for development
│   ├── banViolation.js   # User ban management
│   └── logViolation.js   # Rate limit violation tracking
│
├── config/               # Configuration management
│   ├── winston.js       # Structured logging setup
│   ├── paths.js         # Application path constants
│   ├── parsers.js       # YAML/JSON config parsers
│   └── index.js         # Config aggregation
│
├── lib/                  # Core libraries
│   ├── db/
│   │   ├── connectDb.js # MongoDB connection management
│   │   └── indexSync.js # Database index optimization
│   └── utils/
│       ├── mergeSort.js # Conversation sorting
│       └── misc.js      # Utility functions
│
├── models/              # Mongoose models (MongoDB schemas)
│   ├── User.js         # User accounts, preferences, roles
│   ├── Conversation.js # Conversation threads & metadata
│   ├── Message.js      # Individual messages with edits
│   ├── File.js         # File upload metadata & references
│   ├── Agent.js        # Custom AI agent configurations
│   ├── Assistant.js    # OpenAI Assistant integration
│   ├── Transaction.js  # Token usage transactions
│   ├── Balance.js      # User credit balances
│   ├── Share.js        # Shared conversation links
│   ├── Preset.js       # Saved conversation settings
│   └── ConversationTag.js # Conversation organization
│
├── server/             # Express server implementation
│   ├── index.js       # Server bootstrap & initialization
│   │
│   ├── controllers/   # Request handlers (thin controllers)
│   │   ├── auth/
│   │   │   ├── LoginController.js    # Authentication flows
│   │   │   └── TwoFactorAuthController.js # 2FA implementation
│   │   ├── AskController.js         # Message generation
│   │   ├── EditController.js        # Message editing
│   │   ├── EndpointController.js    # AI provider config
│   │   ├── ModelController.js       # Model availability
│   │   ├── UserController.js        # User management
│   │   ├── Balance.js               # Credit management
│   │   └── ErrorController.js       # Global error handling
│   │
│   ├── middleware/    # Express middleware stack
│   │   ├── requireJwtAuth.js       # JWT validation
│   │   ├── requireLdapAuth.js      # LDAP authentication
│   │   ├── checkBan.js             # Ban enforcement
│   │   ├── concurrentLimiter.js    # Concurrent request limits
│   │   ├── validateMessageReq.js   # Message validation
│   │   ├── abortControllers.js     # Request cancellation
│   │   ├── setHeaders.js           # Security headers
│   │   └── moderateText.js         # Content moderation
│   │
│   ├── routes/        # API route definitions
│   │   ├── auth.js    # POST /api/auth/login, /register, /logout
│   │   ├── ask/       # POST /api/ask/:endpoint - AI queries
│   │   ├── edit/      # POST /api/edit - Message regeneration
│   │   ├── convos.js  # /api/conversations CRUD operations
│   │   ├── messages.js # /api/messages - Message history
│   │   ├── models.js   # /api/models - Available models
│   │   ├── files/      # /api/files - File operations
│   │   │   └── speech/ # Text-to-speech endpoints
│   │   ├── agents.js   # /api/agents - Agent management
│   │   ├── assistants/ # /api/assistants - OpenAI Assistants
│   │   ├── share.js    # /api/share - Conversation sharing
│   │   └── mcp-diagnostics.js # MCP debugging endpoints
│   │
│   ├── services/      # Business logic layer
│   │   ├── AppService.js           # Application initialization
│   │   ├── AuthService.js          # Authentication logic
│   │   ├── ModelService.js         # Model configuration
│   │   ├── ToolService.js          # Tool/function management
│   │   ├── MCP.js                  # Model Context Protocol
│   │   ├── ActionService.js        # Custom action handling
│   │   ├── AssistantService.js     # OpenAI Assistant wrapper
│   │   │
│   │   ├── Endpoints/              # AI provider services
│   │   │   ├── openAI/            # OpenAI-specific logic
│   │   │   ├── anthropic/         # Anthropic-specific logic
│   │   │   ├── google/            # Google AI logic
│   │   │   ├── agents/            # Agent orchestration
│   │   │   ├── assistants/        # Assistant threads
│   │   │   └── custom/            # Custom endpoint support
│   │   │
│   │   ├── Files/                 # File storage adapters
│   │   │   ├── Local/            # Filesystem storage
│   │   │   ├── S3/               # AWS S3 integration
│   │   │   ├── Azure/            # Azure Blob Storage
│   │   │   ├── Firebase/         # Firebase Storage
│   │   │   ├── images/           # Image processing
│   │   │   └── Code/             # Code file handling
│   │   │
│   │   └── Artifacts/            # Code artifact system
│   │       └── update.js         # Artifact CRUD operations
│   │
│   └── utils/         # Server utilities
│       ├── streamResponse.js    # SSE streaming
│       ├── handleText.js        # Text processing
│       └── queue.js             # Job queue management
│
├── strategies/        # Passport.js authentication
│   ├── jwtStrategy.js          # JWT token validation
│   ├── localStrategy.js        # Username/password
│   ├── ldapStrategy.js         # LDAP/Active Directory
│   ├── googleStrategy.js       # Google OAuth
│   ├── githubStrategy.js       # GitHub OAuth
│   ├── discordStrategy.js      # Discord OAuth
│   └── openidStrategy.js       # Generic OIDC
│
└── utils/            # Shared utilities
    ├── tokens.js    # Token counting (tiktoken)
    ├── logger.js    # Logging utilities
    ├── azureUtils.js # Azure helper functions
    └── axios.js     # HTTP client configuration
```

## Core Features

### 🤖 Multi-Provider AI Support

#### Supported Providers
- **OpenAI**: GPT-4, GPT-3.5, DALL-E 3, Whisper, Assistants API
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku with vision support
- **Google**: PaLM 2, Gemini Pro/Vision, Vertex AI
- **Azure**: Azure OpenAI Service with deployment management
- **Local/OSS**: Ollama, vLLM, LiteLLM, custom OpenAI-compatible endpoints
- **Specialized**: Cohere, Mistral, Perplexity, DeepSeek

#### Provider Features
- Automatic failover between providers
- Model-specific parameter tuning
- Cost tracking per provider/model
- Custom endpoint configuration

### 🔐 Authentication & Security

#### Authentication Methods
- **Local Auth**: Email/password with bcrypt
- **JWT**: Stateless authentication with refresh tokens
- **OAuth2/OIDC**: Google, GitHub, Discord, Facebook, Apple
- **LDAP**: Enterprise Active Directory integration
- **Two-Factor Auth**: TOTP-based 2FA with backup codes
- **API Keys**: Per-user API key management

#### Security Features
- Role-Based Access Control (RBAC)
- IP-based rate limiting
- Request signing for webhooks
- Content Security Policy (CSP)
- MongoDB query sanitization
- XSS and injection protection

### 📁 Advanced File Handling

#### Storage Backends
```javascript
// Local filesystem
CDN_PROVIDER=local
UPLOAD_DIR=./uploads

// AWS S3
CDN_PROVIDER=s3
S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

// Azure Blob Storage
CDN_PROVIDER=azure
AZURE_STORAGE_ACCOUNT=...
AZURE_STORAGE_KEY=...

// Firebase Storage
CDN_PROVIDER=firebase
FIREBASE_PROJECT_ID=...
```

#### File Processing
- **Images**: Automatic optimization with Sharp
- **Documents**: PDF, DOCX parsing for context
- **Code**: Syntax highlighting and formatting
- **Audio**: Transcription via Whisper API
- **Size Limits**: Configurable per file type
- **Virus Scanning**: Optional ClamAV integration

### 💬 Conversation Management

#### Features
- Thread-based conversations with branching
- Message editing with version history
- Conversation forking for exploration
- Real-time collaborative editing
- Import/Export (JSON, Markdown)
- Semantic search across messages
- Conversation templates/presets

#### Message Flow
```
User Input → Validation → Preprocessing → AI Client → 
Streaming Response → Post-processing → Save to DB → Client
```

### ⚡ Real-time Streaming

The API uses Server-Sent Events (SSE) for streaming responses:

```javascript
// Server-side streaming
const stream = new TextStream(response, {
  onProgress: (token) => {
    // Send token to client
    res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
  },
  onComplete: (fullText) => {
    // Save complete message
    saveMessage({ text: fullText, ...metadata });
  }
});
```

### 🛠️ Tool System & Function Calling

#### Built-in Tools
- **Web Search**: Google, Bing integration
- **Calculator**: Mathematical computations
- **Code Interpreter**: Sandpack integration
- **Image Generation**: DALL-E, Stable Diffusion
- **File Operations**: Read/write capabilities
- **API Calls**: HTTP request tool

#### Model Context Protocol (MCP)
```javascript
// MCP server configuration in librechat.yaml
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
```

### 💰 Token Economy & Billing

#### Balance System
- Per-user token credits
- Model-specific pricing multipliers
- Transaction history tracking
- Auto-refill options
- Usage analytics and reporting

```javascript
// Token cost calculation
const multiplier = getMultiplier({ model, endpoint });
const cost = tokenCount * multiplier;
await checkBalance({ user, cost });
```

### 🎯 Agent System

#### Custom Agents
- Tool-equipped AI assistants
- Multi-step reasoning
- Memory persistence
- Custom prompts and behaviors
- Agent marketplace (coming soon)

```javascript
// Agent configuration
{
  name: "Research Assistant",
  model: "gpt-4-turbo",
  tools: ["web_search", "calculator", "code_interpreter"],
  systemPrompt: "You are a helpful research assistant...",
  temperature: 0.7
}
```

## API Endpoints

### Authentication & User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (JWT/OAuth) |
| POST | `/api/auth/register` | New user registration |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/auth/verify` | Verify email address |
| POST | `/api/auth/requestPasswordReset` | Password reset email |
| POST | `/api/auth/resetPassword` | Complete password reset |
| GET | `/api/auth/2fa/enable` | Get 2FA QR code |
| POST | `/api/auth/2fa/verify` | Verify 2FA token |
| GET | `/api/user` | Get user profile |
| PUT | `/api/user` | Update user profile |
| DELETE | `/api/user` | Delete user account |
| GET | `/api/user/balance` | Check token balance |

### Conversations & Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation |
| PUT | `/api/conversations/:id` | Update conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/conversations/:id/fork` | Fork conversation |
| GET | `/api/conversations/search` | Search conversations |
| POST | `/api/ask/:endpoint` | Send message to AI |
| POST | `/api/edit` | Edit & regenerate |
| GET | `/api/messages/:conversationId` | Get messages |
| PUT | `/api/messages/:messageId` | Update message |
| DELETE | `/api/messages/:messageId` | Delete message |
| POST | `/api/messages/:messageId/stop` | Stop generation |

### Models & Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models |
| GET | `/api/models/:endpoint` | Get endpoint models |
| POST | `/api/models/query` | Query model features |
| GET | `/api/endpoints` | Get endpoints config |
| GET | `/api/config` | Get app configuration |
| GET | `/api/keys` | List user API keys |
| POST | `/api/keys` | Generate API key |
| DELETE | `/api/keys/:keyId` | Revoke API key |

### Files & Artifacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List user files |
| GET | `/api/files/:fileId` | Download file |
| DELETE | `/api/files/:fileId` | Delete file |
| POST | `/api/files/images` | Process image |
| POST | `/api/files/code` | Create code file |
| GET | `/api/artifacts/:id` | Get code artifact |
| PUT | `/api/artifacts/:id` | Update artifact |

### Tools & Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools` | List available tools |
| POST | `/api/tools/execute` | Execute tool |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/:id/run` | Run agent |

### Admin & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Usage statistics |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users/:id/ban` | Ban user |
| GET | `/api/mcp/diagnostics` | MCP status |

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# === CORE CONFIGURATION ===
NODE_ENV=production
PORT=3080
HOST=localhost
MONGO_URI=mongodb://localhost:27017/librechat
DOMAIN_CLIENT=http://localhost:3090
DOMAIN_SERVER=http://localhost:3080

# === SECURITY ===
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
CREDS_KEY=32-byte-encryption-key
CREDS_IV=16-byte-init-vector

# === AI PROVIDERS ===
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_API_KEY=...
GOOGLE_PROJECT_ID=...

# Azure OpenAI
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# === FILE STORAGE ===
CDN_PROVIDER=local # s3, azure, firebase
UPLOAD_DIR=./uploads
FILE_SIZE_LIMIT=10485760 # 10MB

# === OPTIONAL SERVICES ===
# Redis (for caching/sessions)
REDIS_URI=redis://localhost:6379

# MeiliSearch (for search)
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_KEY=masterKey

# Email (for notifications)
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your-email
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# === FEATURES ===
REGISTRATION_OPEN=true
ALLOW_SOCIAL_LOGIN=true
CHECK_BALANCE=true
START_BALANCE=1000000 # Initial tokens for new users
```

### librechat.yaml Configuration

Advanced configuration via `librechat.yaml`:

```yaml
version: 1.1.0

# Cache settings
cache:
  redis:
    url: ${REDIS_URI}
    ttl: 3600

# Registration settings
registration:
  allowedDomains:
    - "@company.com"
    - "@partner.org"
  socialLogins:
    - google
    - github
    - discord

# Endpoint configurations
endpoints:
  openAI:
    enabled: true
    models:
      gpt-4-turbo:
        max_tokens: 4096
        vision: true
      gpt-3.5-turbo:
        max_tokens: 4096
    
  anthropic:
    enabled: true
    models:
      claude-3-opus:
        max_tokens: 4096
      claude-3-sonnet:
        max_tokens: 4096
    
  custom:
    - name: "Local Ollama"
      apiKey: "not-needed"
      baseURL: "http://localhost:11434/v1"
      models:
        - llama3
        - mistral
        - phi3

# Rate limiting
rateLimits:
  conversationsDaily: 100
  messagesPerHour: 50
  tokensPerDay: 1000000

# File handling
fileConfig:
  maxSize: 20971520 # 20MB
  allowedMimeTypes:
    - "image/*"
    - "application/pdf"
    - "text/*"
    - "application/vnd.*"

# MCP Servers
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
      env:
        FILE_ROOT: "./data"
```

## Development

### Prerequisites

- Node.js 18+ (or Bun runtime)
- MongoDB 4.4+ (or MongoDB Atlas)
- Redis 6+ (optional)
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/agentis.git
cd agentis

# Install dependencies
npm ci

# Build shared packages
npm run build:packages

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if local)
mongod --dbpath ./data/db

# Run in development
npm run backend:dev
```

### Testing

```bash
# Run all tests
npm run test:api

# Run specific test suite
npm run test:api -- --testPathPattern=auth

# Run with coverage
npm run test:api -- --coverage

# Run integration tests
npm run test:api:integration

# Run E2E tests
npm run test:e2e
```

#### Test Structure
```
__tests__/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── fixtures/      # Test data
└── helpers/       # Test utilities
```

### Debugging

```bash
# Enable debug logging
DEBUG=librechat:* npm run backend:dev

# Inspect with Chrome DevTools
node --inspect server/index.js

# Use VS Code debugger
# Launch configuration in .vscode/launch.json
```

### Code Quality

```bash
# Linting
npm run lint:api

# Type checking
npm run typecheck

# Format code
npm run format

# Pre-commit checks
npm run precommit
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secrets
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up MongoDB replica set
- [ ] Configure Redis for sessions
- [ ] Enable rate limiting
- [ ] Set up monitoring (PM2/DataDog)
- [ ] Configure backup strategy
- [ ] Review security headers
- [ ] Enable CORS appropriately
- [ ] Set up log rotation
- [ ] Configure CDN for static assets

### Deployment Options

#### PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Setup startup script
pm2 startup
pm2 save
```

#### Docker
```bash
# Build image
docker build -t agentis-api .

# Run container
docker run -d \
  --name agentis-api \
  -p 3080:3080 \
  --env-file .env \
  agentis-api
```

#### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentis-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agentis-api
  template:
    metadata:
      labels:
        app: agentis-api
    spec:
      containers:
      - name: api
        image: agentis-api:latest
        ports:
        - containerPort: 3080
        env:
        - name: NODE_ENV
          value: "production"
```

### Scaling Considerations

1. **Horizontal Scaling**: API is stateless, scale with load balancer
2. **Database**: Use MongoDB replica sets for HA
3. **Caching**: Redis cluster for distributed caching
4. **File Storage**: Use S3/Azure for distributed file access
5. **Message Queue**: Add RabbitMQ/Kafka for async jobs
6. **CDN**: CloudFlare/Fastly for static assets

## Troubleshooting

### Common Issues

#### MongoDB Connection Failed
```bash
# Check MongoDB is running
systemctl status mongod

# Verify connection string
mongosh "mongodb://localhost:27017/librechat"

# Check firewall
sudo ufw allow 27017
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3080

# Kill process
kill -9 <PID>

# Or use different port
PORT=3081 npm run backend:dev
```

#### File Upload Issues
```bash
# Check permissions
chmod 755 ./uploads

# Verify storage config
echo $CDN_PROVIDER

# Check disk space
df -h
```

#### Memory Issues
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run backend

# Monitor memory usage
pm2 monit
```

### Debug Endpoints

```bash
# Health check
curl http://localhost:3080/health

# MCP diagnostics
curl http://localhost:3080/api/mcp/diagnostics \
  -H "Authorization: Bearer $JWT_TOKEN"

# Model availability
curl http://localhost:3080/api/models

# Check rate limits
curl -I http://localhost:3080/api/conversations \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Follow coding standards (ESLint, Prettier)
4. Write tests for new features
5. Ensure all tests pass: `npm run test:api`
6. Update documentation
7. Submit PR with clear description

### Code Style Guidelines

- Use CommonJS modules (`require`/`module.exports`)
- Follow Airbnb JavaScript style guide
- Add JSDoc comments for all functions
- Keep functions small and focused
- Handle errors explicitly
- Use meaningful variable names
- Avoid deep nesting

### Adding a New AI Provider

1. Create client in `app/clients/YourProviderClient.js`:
```javascript
const BaseClient = require('./BaseClient');

class YourProviderClient extends BaseClient {
  constructor(apiKey, options) {
    super(apiKey, options);
    // Initialize provider-specific settings
  }

  async setOptions(options) {
    // Validate and set options
  }

  async buildMessages(messages) {
    // Format messages for provider
  }

  async getCompletion(input) {
    // Call provider API
  }
}

module.exports = YourProviderClient;
```

2. Register in `app/clients/index.js`
3. Add configuration to `librechat.yaml`
4. Update model service
5. Add tests

## Performance Optimization

### Best Practices

1. **Database Indexing**: Ensure proper indexes on frequently queried fields
2. **Query Optimization**: Use `.lean()` for read-only operations
3. **Caching Strategy**: Cache model configs, user preferences
4. **Connection Pooling**: Reuse database connections
5. **Streaming**: Use SSE for real-time responses
6. **Pagination**: Limit results for list endpoints
7. **Compression**: Enable gzip for responses

### Monitoring

- **Logs**: Check `api/logs/` directory
- **Metrics**: Integrate with Prometheus/Grafana
- **APM**: Use DataDog, New Relic, or AppDynamics
- **Error Tracking**: Sentry integration available

## Security Best Practices

1. **Input Validation**: Sanitize all user inputs
2. **SQL Injection**: Use parameterized queries
3. **XSS Prevention**: Escape HTML in responses
4. **CSRF Protection**: Validate request origins
5. **Rate Limiting**: Prevent abuse
6. **Secrets Management**: Use environment variables
7. **HTTPS Only**: Enforce SSL in production
8. **Security Headers**: HSTS, CSP, X-Frame-Options
9. **Regular Updates**: Keep dependencies current
10. **Audit Logging**: Track sensitive operations

## License

This project is licensed under the MIT License. See the LICENSE file in the root directory for full details.

## Support

- Documentation: [docs.librechat.ai](https://docs.librechat.ai)
- Discord Community: [discord.librechat.ai](https://discord.librechat.ai)
- GitHub Issues: [github.com/danny-avila/LibreChat/issues](https://github.com/danny-avila/LibreChat/issues)