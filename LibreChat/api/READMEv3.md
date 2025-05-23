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

## Quick Start

```bash
# Prerequisites: Node.js 18+, MongoDB 4.4+

# From project root
npm ci                    # Install dependencies
npm run build:packages    # Build shared packages

# Configure environment
cp .env.example .env      # Copy example config
# Edit .env with your API keys and settings

# Run development server
npm run backend:dev       # Starts on http://localhost:3080
```

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
│   │   ├── tools/               # Tool/Function calling system
│   │   ├── prompts/             # Prompt engineering
│   │   └── memory/              # Conversation memory strategies
│   └── index.js           # Express app initialization
│
├── cache/                 # Caching and rate limiting
├── config/               # Configuration management
├── lib/                  # Core libraries
├── models/              # Mongoose models (MongoDB schemas)
├── server/             # Express server implementation
│   ├── controllers/   # Request handlers
│   ├── middleware/    # Express middleware
│   ├── routes/        # API route definitions
│   ├── services/      # Business logic layer
│   └── utils/         # Server utilities
├── strategies/        # Passport.js authentication
└── utils/            # Shared utilities
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

### 🔐 Authentication & Security

- **Local Auth**: Email/password with bcrypt
- **JWT**: Stateless authentication with refresh tokens
- **OAuth2/OIDC**: Google, GitHub, Discord, Facebook, Apple
- **LDAP**: Enterprise Active Directory integration
- **Two-Factor Auth**: TOTP-based 2FA with backup codes
- **API Keys**: Per-user API key management
- **RBAC**: Role-based access control

### 📁 File Handling

Storage backends are configurable via `CDN_PROVIDER`:
- `local`: Filesystem storage
- `s3`: AWS S3 compatible storage
- `azure`: Azure Blob Storage
- `firebase`: Firebase Storage

### 💬 Conversation Management

- Thread-based conversations with branching
- Message editing with version history
- Real-time streaming via Server-Sent Events
- Import/Export functionality
- Semantic search across messages

### ⚡ Real-time Streaming

```javascript
// Example SSE implementation
const stream = new TextStream(response, {
  onProgress: (token) => {
    res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
  }
});
```

### 🛠️ Tool System & MCP

The Model Context Protocol (MCP) enables extensible tool integration:

```yaml
# librechat.yaml
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
```

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | New user registration |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation |
| PUT | `/api/conversations/:id` | Update conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ask/:endpoint` | Send message to AI |
| POST | `/api/edit` | Edit & regenerate |
| GET | `/api/messages/:conversationId` | Get messages |

### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models` | List available models |
| GET | `/api/endpoints` | Get endpoints config |
| GET | `/api/config` | Get app configuration |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file |
| GET | `/api/files` | List user files |
| GET | `/api/files/:fileId` | Download file |
| DELETE | `/api/files/:fileId` | Delete file |

## Configuration

### Essential Environment Variables

```bash
# Core
NODE_ENV=production
PORT=3080
MONGO_URI=mongodb://localhost:27017/librechat

# Security
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# AI Providers (add as needed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# File Storage
CDN_PROVIDER=local
UPLOAD_DIR=./uploads
```

### Advanced Configuration (librechat.yaml)

```yaml
version: 1.1.0

# Cache settings
cache:
  redis:
    url: ${REDIS_URI}

# Endpoint configurations
endpoints:
  openAI:
    models:
      gpt-4-turbo:
        max_tokens: 4096
      gpt-3.5-turbo:
        max_tokens: 4096
    
  custom:
    - name: "Local Ollama"
      apiKey: "not-needed"
      baseURL: "http://localhost:11434/v1"
      models:
        - llama3

# Rate limiting
rateLimits:
  conversationsDaily: 100
  messagesPerHour: 50

# MCP Servers
mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
```

## Development

### Running Tests

```bash
# All tests
npm run test:api

# Specific test suite
npm run test:api -- --testPathPattern=auth

# With coverage
npm run test:api -- --coverage
```

### Debugging

```bash
# Enable debug logging
DEBUG=librechat:* npm run backend:dev

# Inspect with Chrome DevTools
node --inspect server/index.js
```

### Code Quality

```bash
npm run lint:api      # ESLint
npm run format        # Prettier
npm run typecheck     # TypeScript checks
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure secure secrets
- [ ] Enable HTTPS
- [ ] Set up MongoDB replica set
- [ ] Configure Redis for sessions
- [ ] Enable rate limiting
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review security headers

### PM2 Deployment

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker Deployment

```bash
docker build -t agentis-api .
docker run -d --name agentis-api -p 3080:3080 --env-file .env agentis-api
```

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Verify MongoDB is running: `systemctl status mongod`
- Check connection string format
- Ensure firewall allows MongoDB port

**Port Already in Use**
- Find process: `lsof -i :3080`
- Use different port: `PORT=3081 npm run backend:dev`

**File Upload Issues**
- Check directory permissions: `chmod 755 ./uploads`
- Verify storage configuration
- Check disk space: `df -h`

### Debug Endpoints

```bash
# Health check
curl http://localhost:3080/health

# Model availability
curl http://localhost:3080/api/models
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Follow ESLint/Prettier standards
4. Write tests for new features
5. Update documentation
6. Submit PR with clear description

### Adding a New AI Provider

1. Create client in `app/clients/YourProviderClient.js` extending `BaseClient`
2. Register in `app/clients/index.js`
3. Add configuration to `librechat.yaml`
4. Update model service
5. Add tests

## Performance & Security

### Performance Best Practices
- Use database indexes on frequently queried fields
- Implement caching for model configs
- Use `.lean()` for read-only MongoDB operations
- Enable response compression

### Security Best Practices
- Sanitize all user inputs
- Use parameterized database queries
- Keep dependencies updated
- Implement rate limiting
- Use environment variables for secrets
- Enable security headers (HSTS, CSP)

## Support

- Documentation: [docs.librechat.ai](https://docs.librechat.ai)
- Discord Community: [discord.librechat.ai](https://discord.librechat.ai)
- GitHub Issues: [github.com/danny-avila/LibreChat/issues](https://github.com/danny-avila/LibreChat/issues)

## License

MIT License - see LICENSE file in the root directory.