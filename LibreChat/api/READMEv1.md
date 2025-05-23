# LibreChat API

The backend API server for Agentis (a branded fork of LibreChat), providing a comprehensive REST API for AI-powered conversational experiences.

## Overview

This directory contains the Node.js/Express backend that powers LibreChat's multi-provider AI chat functionality. The API handles authentication, conversation management, message streaming, file processing, and integrations with various AI providers including OpenAI, Anthropic, Google, Azure, and more.

## Architecture

The API follows a modular architecture with clear separation of concerns:

- **Express.js** framework for HTTP server and routing
- **MongoDB** with Mongoose ODM for data persistence
- **Passport.js** for authentication strategies
- **Server-Sent Events (SSE)** for real-time message streaming
- **Redis** (optional) for caching and rate limiting
- **MCP (Model Context Protocol)** for advanced tool integrations

## Directory Structure

```
api/
├── app/                    # Core application logic
│   ├── clients/           # AI provider client adapters
│   │   ├── BaseClient.js  # Abstract base class for all AI clients
│   │   ├── OpenAIClient.js, AnthropicClient.js, etc. # Provider implementations
│   │   ├── agents/        # Agent-based conversation handlers
│   │   ├── chains/        # LangChain integration for conversation flows
│   │   ├── document/      # Document processing and chunking
│   │   ├── llm/           # LLM management and configuration
│   │   ├── memory/        # Conversation memory management
│   │   ├── prompts/       # Prompt templates and formatting
│   │   ├── tools/         # Function calling and tool implementations
│   │   └── output_parsers/# Response parsing utilities
│   └── index.js           # Express app configuration
│
├── cache/                 # Caching utilities
│   ├── keyvRedis.js      # Redis cache adapter
│   ├── keyvMongo.js      # MongoDB cache adapter
│   └── banViolation.js   # Rate limiting and ban management
│
├── config/               # Configuration management
│   ├── winston.js       # Logging configuration
│   ├── paths.js         # Path constants
│   └── parsers.js       # Config file parsers
│
├── lib/                  # Core libraries
│   ├── db/              # Database connection and indexing
│   └── utils/           # Utility functions
│
├── models/              # Mongoose models (MongoDB schemas)
│   ├── User.js         # User accounts and profiles
│   ├── Conversation.js # Conversation threads
│   ├── Message.js      # Individual messages
│   ├── File.js         # File metadata
│   ├── Agent.js        # AI agent configurations
│   ├── Assistant.js    # OpenAI Assistant integrations
│   └── ...             # Additional models
│
├── server/             # Server implementation
│   ├── index.js       # Server entry point
│   ├── controllers/   # Route controllers (business logic)
│   │   ├── AuthController.js       # Authentication
│   │   ├── AskController.js        # Message generation
│   │   ├── EndpointController.js   # AI provider management
│   │   └── ...
│   ├── middleware/    # Express middleware
│   │   ├── requireJwtAuth.js      # JWT authentication
│   │   ├── validateMessageReq.js  # Request validation
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── ...
│   ├── routes/        # API route definitions
│   │   ├── auth.js   # /api/auth/* endpoints
│   │   ├── ask.js    # /api/ask/* endpoints
│   │   ├── convos.js # /api/conversations/* endpoints
│   │   └── ...
│   ├── services/      # Business logic services
│   │   ├── AppService.js         # App initialization
│   │   ├── AuthService.js        # Authentication logic
│   │   ├── ModelService.js       # AI model management
│   │   ├── Files/               # File storage adapters
│   │   │   ├── Local/          # Local filesystem
│   │   │   ├── S3/             # AWS S3
│   │   │   ├── Azure/          # Azure Blob Storage
│   │   │   └── Firebase/       # Firebase Storage
│   │   └── Endpoints/          # AI provider services
│   └── utils/         # Server utilities
│
├── strategies/        # Passport.js authentication strategies
│   ├── jwtStrategy.js
│   ├── localStrategy.js
│   ├── googleStrategy.js
│   ├── ldapStrategy.js
│   └── ...
│
└── utils/            # Shared utilities
    ├── tokens.js    # Token counting utilities
    ├── logger.js    # Logging helpers
    └── ...
```

## Key Features

### Multi-Provider AI Support
- **OpenAI**: GPT-4, GPT-3.5, DALL-E, Assistants API
- **Anthropic**: Claude 3 family (Opus, Sonnet, Haiku)
- **Google**: PaLM, Gemini, Vertex AI
- **Azure**: Azure OpenAI Service
- **Open Source**: Ollama, vLLM, custom endpoints
- **Agents**: Custom agent implementations with tool use

### Authentication & Security
- JWT-based authentication
- OAuth2/OIDC support (Google, GitHub, Discord, etc.)
- LDAP/Active Directory integration
- Two-factor authentication (2FA)
- Role-based access control (RBAC)
- API key management

### File Handling
- Multiple storage backends (Local, S3, Azure Blob, Firebase)
- Image processing and optimization
- Document parsing (PDF, Word, etc.)
- Code file handling with syntax highlighting
- Audio transcription support

### Conversation Management
- Thread-based conversations
- Message editing and regeneration
- Conversation forking/branching
- Search across conversations
- Import/Export functionality
- Shared conversations

### Advanced Features
- **MCP (Model Context Protocol)**: Extensible tool system
- **Function Calling**: Native and custom tool support
- **Streaming**: Real-time response streaming via SSE
- **Rate Limiting**: Configurable limits per user/endpoint
- **Caching**: Response caching for efficiency
- **Plugins**: Extensible plugin architecture
- **Artifacts**: Code execution via Sandpack integration

## Running the API

### Prerequisites
- Node.js 18+ or Bun runtime
- MongoDB 4.4+
- Redis (optional, for caching)
- Environment variables configured

### Development
```bash
# Install dependencies from root
npm ci

# Run in development mode (with hot reload)
npm run backend:dev

# Or using the dev CLI
./scripts/dev.sh --backend
```

### Production
```bash
# Build and start
npm run backend

# Or with PM2
pm2 start api/server/index.js --name agentis-api
```

### Testing
```bash
# Run all API tests
npm run test:api

# Run specific test file
npm run test:api -- server/routes/__tests__/auth.test.js

# With coverage
npm run test:api -- --coverage
```

## Environment Configuration

Create a `.env` file in the root directory. Key variables:

```bash
# Server
PORT=3080
HOST=localhost

# Database
MONGO_URI=mongodb://localhost:27017/agentis

# Authentication
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AI Providers (add as needed)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
AZURE_OPENAI_API_KEY=...

# File Storage
CDN_PROVIDER=local # or 's3', 'azure', 'firebase'
UPLOAD_DIR=./uploads

# Optional Services
REDIS_URI=redis://localhost:6379
MEILISEARCH_URL=http://localhost:7700
```

See `.env.example` for a complete list of supported variables.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Messages
- `POST /api/ask/:endpoint` - Send message to AI
- `POST /api/edit` - Edit and regenerate message
- `GET /api/messages/:conversationId` - Get messages
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

### Models & Endpoints
- `GET /api/models` - List available models
- `GET /api/endpoints` - Get endpoint configurations
- `POST /api/models/query` - Query model capabilities

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id` - Download file
- `DELETE /api/files/:id` - Delete file
- `GET /api/files` - List user files

### Tools & Plugins
- `GET /api/tools` - List available tools
- `POST /api/tools/execute` - Execute tool
- `GET /api/plugins` - List plugins
- `POST /api/plugins/install` - Install plugin

### User Management
- `GET /api/user` - Get user profile
- `PUT /api/user` - Update user profile
- `GET /api/user/balance` - Check usage balance
- `POST /api/user/2fa/enable` - Enable 2FA

## Configuration Files

### librechat.yaml
The main configuration file for customizing:
- Available AI endpoints and models
- Feature flags
- Rate limits
- File handling settings
- Authentication providers
- MCP server configurations

Example:
```yaml
version: 1.0.0
endpoints:
  openAI:
    models:
      - gpt-4-turbo
      - gpt-3.5-turbo
  anthropic:
    models:
      - claude-3-opus
      - claude-3-sonnet
```

### Custom Endpoints
Configure custom AI providers:
```yaml
endpoints:
  custom:
    - name: "Local LLM"
      apiKey: "${LOCAL_LLM_KEY}"
      baseURL: "http://localhost:8080/v1"
      models:
        - llama-2-70b
```

## Development Guidelines

### Code Style
- Use CommonJS modules (`require`/`module.exports`)
- Follow Airbnb JavaScript style guide
- Add JSDoc comments for functions
- Handle errors with try-catch blocks

### Best Practices
1. **Controllers**: Keep thin, delegate to services
2. **Services**: Contain business logic
3. **Models**: Handle data persistence
4. **Middleware**: Reusable request processing
5. **Error Handling**: Consistent error responses
6. **Logging**: Use Winston logger
7. **Testing**: Write unit and integration tests

### Adding a New AI Provider
1. Create client in `app/clients/YourClient.js`
2. Extend `BaseClient` class
3. Implement required methods
4. Add to `app/clients/index.js`
5. Configure in `librechat.yaml`
6. Add environment variables

### Security Considerations
- Always validate and sanitize input
- Use parameterized database queries
- Implement proper authentication checks
- Follow OWASP security guidelines
- Keep dependencies updated
- Use environment variables for secrets

## Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MongoDB is running and accessible
2. **Port Conflicts**: Check if port 3080 is available
3. **Missing Dependencies**: Run `npm ci` from root
4. **Environment Variables**: Verify all required vars are set

### Debugging
- Enable debug logs: `DEBUG=librechat:* npm run backend:dev`
- Check logs in `api/logs/`
- Use MongoDB Compass for database inspection
- Monitor with `pm2 monit` in production

## Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update documentation
4. Submit pull requests to `main` branch

## License

This project is licensed under the MIT License. See the LICENSE file for details.