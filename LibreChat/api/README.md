# LibreChat API

Backend API server for Agentis (LibreChat fork), providing a REST API for multi-provider AI conversations with streaming, file handling, and extensible tool support.

## Overview

The LibreChat API is a Node.js/Express server that orchestrates conversations across multiple AI providers while managing authentication, file storage, rate limiting, and real-time streaming. Built for scalability and extensibility, it supports enterprise features like LDAP authentication, role-based access control, and comprehensive audit logging.

### Key Features
- **Multi-Provider Support**: OpenAI, Anthropic, Google, Azure, and local models
- **Real-time Streaming**: Server-Sent Events for live AI responses
- **Agent System**: Custom agents with tool use and function calling
- **Model Context Protocol**: Extensible tool integration framework
- **Flexible Storage**: Local, S3, Azure Blob, or Firebase backends
- **Token Management**: Credit system with usage tracking
- **Enterprise Ready**: LDAP, RBAC, audit logs, and compliance tools

## Quick Start

```bash
# Prerequisites: Node.js 18+, MongoDB 4.4+

# From project root
npm ci                    # Install dependencies
npm run build:packages    # Build shared packages

# Configure environment
cp .env.example .env      # Copy example config
# Edit .env with your API keys

# Run development server
npm run backend:dev       # Starts on http://localhost:3080
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              API Routes Layer                   │
├─────────────────────────────────────────────────┤
│            Controllers Layer                    │
├─────────────────────────────────────────────────┤
│             Services Layer                      │
├─────────────────────────────────────────────────┤
│           Data Access Layer                     │
├─────────────────────────────────────────────────┤
│            Infrastructure                       │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
api/
├── app/                  # Core application
│   ├── clients/         # AI provider adapters
│   ├── agents/          # Agent system
│   ├── tools/           # Function calling
│   └── index.js         # App initialization
├── cache/               # Caching utilities
├── config/              # Configuration
├── models/              # MongoDB schemas
├── server/              # Express server
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Request processing
│   ├── routes/          # API endpoints
│   └── services/        # Business logic
├── strategies/          # Authentication
└── utils/              # Shared utilities
```

## API Reference

### Authentication

| Method | Endpoint             | Description       |
| ------ | -------------------- | ----------------- |
| POST   | `/api/auth/login`    | Authenticate user |
| POST   | `/api/auth/register` | Create account    |
| POST   | `/api/auth/logout`   | End session       |
| POST   | `/api/auth/refresh`  | Refresh token     |

### Conversations

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| GET    | `/api/conversations`     | List conversations  |
| POST   | `/api/conversations`     | Create conversation |
| GET    | `/api/conversations/:id` | Get conversation    |
| PUT    | `/api/conversations/:id` | Update conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Messages

| Method | Endpoint                        | Description  |
| ------ | ------------------------------- | ------------ |
| POST   | `/api/ask/:endpoint`            | Send message |
| POST   | `/api/edit`                     | Edit message |
| GET    | `/api/messages/:conversationId` | Get messages |

### Files

| Method | Endpoint            | Description   |
| ------ | ------------------- | ------------- |
| POST   | `/api/files/upload` | Upload file   |
| GET    | `/api/files`        | List files    |
| GET    | `/api/files/:id`    | Download file |
| DELETE | `/api/files/:id`    | Delete file   |

### Configuration

| Method | Endpoint         | Description      |
| ------ | ---------------- | ---------------- |
| GET    | `/api/models`    | Available models |
| GET    | `/api/endpoints` | Endpoint config  |
| GET    | `/api/config`    | App settings     |

## Configuration

### Environment Variables

Create `.env` in project root:

```bash
# Core
NODE_ENV=production
PORT=3080
MONGO_URI=mongodb://localhost:27017/librechat

# Security
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Storage
CDN_PROVIDER=local
UPLOAD_DIR=./uploads
```

### Advanced Configuration

Configure via `librechat.yaml`:

```yaml
version: 1.1.0

endpoints:
  openAI:
    models:
      gpt-4-turbo:
        max_tokens: 4096
      gpt-3.5-turbo:
        max_tokens: 4096

rateLimits:
  conversationsDaily: 100
  messagesPerHour: 50

mcpServers:
  - name: filesystem
    enabled: true
    config:
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem"]
```

## Development

### Testing

```bash
npm run test:api              # Run all tests
npm run test:api -- --watch   # Watch mode
npm run test:api -- --coverage # Coverage report
```

### Debugging

```bash
# Debug logging
DEBUG=librechat:* npm run backend:dev

# Chrome DevTools
node --inspect server/index.js
```

### Code Quality

```bash
npm run lint:api      # ESLint
npm run format        # Prettier
```
## Testing

- See [README.testing.md](./README.testing.md)

## Deployment

### Production Setup

1. Set environment variables
2. Configure MongoDB replica set
3. Enable Redis for caching
4. Set up reverse proxy (nginx)
5. Configure SSL certificates
6. Enable monitoring

### PM2 Example

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker Example

```bash
docker build -t librechat-api .
docker run -d \
  --name api \
  -p 3080:3080 \
  --env-file .env \
  librechat-api
```

## Extending the API

### Adding AI Providers

1. Create client extending `BaseClient`:

```javascript
// app/clients/YourClient.js
const BaseClient = require('./BaseClient');

class YourClient extends BaseClient {
  async getCompletion(input) {
    // Implementation
  }
}

module.exports = YourClient;
```

2. Register in `app/clients/index.js`
3. Configure in `librechat.yaml`

### Adding Tools

1. Create tool definition:

```javascript
// server/services/Tools/yourTool.js
module.exports = {
  name: 'your_tool',
  description: 'Tool description',
  parameters: { /* JSON Schema */ },
  function: async (params) => {
    // Implementation
  }
};
```

2. Register in tool service
3. Enable for endpoints

## Troubleshooting

### Common Issues

**MongoDB Connection**
```bash
# Verify MongoDB
mongosh mongodb://localhost:27017/librechat

# Check logs
tail -f api/logs/error-*.log
```

**Port Conflicts**
```bash
# Check port usage
lsof -i :3080

# Use different port
PORT=3081 npm run backend:dev
```

**File Uploads**
```bash
# Check permissions
ls -la uploads/

# Verify storage config
echo $CDN_PROVIDER
```

## Support

- Documentation: [docs.librechat.ai](https://docs.librechat.ai)
- Discord: [discord.librechat.ai](https://discord.librechat.ai)
- Issues: [GitHub Issues](https://github.com/danny-avila/LibreChat/issues)

## License

MIT License - see LICENSE file in root directory.