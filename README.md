# Agentis

> **Enterprise-grade AI conversation platform** - Integrate multiple AI models with advanced features like MCP tool integration, multi-tenant organizations, and self-hosted infrastructure.

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Docker Services](#docker-services)
- [MCP Integration](#mcp-integration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Overview

Agentis is a production-ready AI conversation platform built as an enhanced fork of LibreChat. It provides seamless integration with multiple AI providers while offering enterprise features like organization management, advanced tool integration, and comprehensive self-hosted infrastructure.

**Built for teams and organizations** that need:
- Secure, self-hosted AI conversations
- Integration with productivity tools (Google Workspace, Notion, etc.)
- Multi-tenant organization management
- Advanced document processing and code execution capabilities

## Key Features

### 🤖 **Multi-AI Provider Support**
- Anthropic Claude, OpenAI, Google AI, Azure OpenAI, Mistral, OpenRouter
- Unified interface across all providers
- Custom endpoint configuration

### 🏢 **Enterprise Organization Management**
- Multi-tenant architecture with domain-based auto-assignment
- Slack-style organization joining and management  
- Role-based access control (Admin, Member, custom roles)
- Invitation system with email-based onboarding

### 🔧 **Model Context Protocol (MCP) Integration**
- Pre-configured integrations: Gmail, Google Drive, Sheets, Docs, Calendar, Notion
- Custom MCP server support
- Tool authentication with OAuth2 flows
- User-friendly tool display names and descriptions

### 🛡️ **Self-Hosted Infrastructure**
- Custom Docker images for all dependencies
- Complete control over data and processing
- Security-focused architecture

### 💻 **Advanced Capabilities**
- Document processing with RAG (Retrieval-Augmented Generation)
- Code execution environment (Sandpack integration)
- Full-text conversation search (MeiliSearch)
- Real-time message streaming
- File upload and management

## Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** (for supporting services)
- **Git** for cloning the repository

### 5-Minute Setup

1. **Clone and navigate to the project**
   ```bash
   git clone https://github.com/gannonh/agentis.git
   cd agentis/LibreChat
   ```

2. **Install dependencies and build packages**
   ```bash
   npm ci
   npm run build:all
   ```

3. **Start supporting services**
   ```bash
   # From project root directory
   cd .. && ./scripts/docker-cli.sh start
   cd LibreChat
   ```

4. **Create basic environment configuration**
   ```bash
   # Minimum required for development
   echo "MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin
   JWT_SECRET=your-secret-key-change-in-production
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENAI_API_KEY=your-openai-key" > .env
   ```

5. **Start the application**
   ```bash
   # Terminal 1: Backend
   npm run backend:dev
   
   # Terminal 2: Frontend  
   npm run frontend:dev
   ```

6. **Access Agentis**
   - Open http://localhost:3080
   - Create an account and start chatting!

### What You Can Do

Once running, you can:
- Chat with multiple AI models (Claude, GPT-4, etc.)
- Upload documents and images for analysis
- Execute code snippets in a sandboxed environment
- Connect Google Workspace tools (Gmail, Drive, Sheets, Docs)
- Manage conversations with full-text search
- Create organizations and invite team members

## Architecture

Agentis follows a modern microservices architecture optimized for AI workloads:

```
┌─────────────────────────────────────────────────────────────┐
│                    Agentis Platform                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│   React Client  │   Express API   │      Data Layer         │
│   (Port 3080)   │   (Port 3001)   │                         │
│                 │                 │  • MongoDB (Primary)    │
│ • Chat UI       │ • Auth Routes   │  • PostgreSQL+pgVector  │
│ • File Upload   │ • AI Clients    │  • MeiliSearch          │
│ • Admin Panel   │ • MCP Manager   │                         │
│ • Organization  │ • Middleware    │                         │
├─────────────────┼─────────────────┼─────────────────────────┤
│            Supporting Services (Docker)                     │
│                                                             │
│ • RAG API (8000)     • Sandpack (8080)                    │
│ • MailHog (8025)     • Vector DB (5432)                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | React 18 + TypeScript + Vite | Modern UI with real-time updates |
| **Backend** | Node.js + Express | RESTful API and WebSocket streaming |
| **Database** | MongoDB + Mongoose | User data, conversations, organizations |
| **Vector DB** | PostgreSQL + pgVector | Document embeddings for RAG |
| **Search** | MeiliSearch | Full-text conversation search |
| **Auth** | Better Auth | Multi-tenant authentication |
| **State** | Recoil + TanStack Query | Client-side state management |
| **Styling** | Tailwind CSS + Radix UI | Responsive, accessible design |
| **Testing** | Vitest + Playwright | Unit, integration, and E2E tests |

## Development

### Project Structure

```
agentis/
├── LibreChat/              # Main application (work here)
│   ├── api/               # Backend Express server
│   ├── client/            # React frontend  
│   ├── packages/          # Shared monorepo packages
│   │   ├── data-provider/ # API communication layer
│   │   ├── data-schemas/  # Database schemas
│   │   ├── mcp/          # MCP integration services
│   │   └── arcade-client/ # Arcade AI SDK
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
├── scripts/               # Development utilities
├── codesandbox-client/    # Self-hosted code execution
└── rag_api/              # Self-hosted document processing
```

### Environment Configuration

**Required Environment Variables**

Create `.env` in the `LibreChat/` directory:

```env
# Database (Required)
MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin

# Security (Required)
JWT_SECRET=your-secure-jwt-secret-change-in-production
SESSION_SECRET=your-secure-session-secret

# AI Providers (At least one required)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
GOOGLE_API_KEY=your-google-ai-key

# Search (Optional - uses defaults if not set)
MEILI_MASTER_KEY=your-meili-master-key
SEARCH_URL=http://localhost:7700

# RAG/Document Processing (Optional)
RAG_API_URL=http://localhost:8000

# MCP/Tool Integration (Optional)
COMPOSIO_API_KEY=your-composio-key
```

For Docker services, create `.env.docker`:

```env
# Required for RAG functionality
OPENAI_API_KEY=sk-your-openai-key
```

### Package Development Workflow

When working with shared packages (common during development):

```bash
# When you change data-schemas
npm run build:data-schemas

# When you change data-provider  
npm run build:data-provider

# When you change MCP services
npm run build:mcp

# Rebuild everything
npm run build:all

# For continuous development
cd packages/data-provider
npm run build:watch
```

**Development Helper Scripts**

```bash
# From project root - comprehensive development management
./scripts/dev.sh --help       # Show all options
./scripts/dev.sh --all        # Rebuild packages + restart servers
./scripts/dev.sh --clean      # Clean build + full restart
./scripts/dev.sh --frontend   # Restart frontend only
./scripts/dev.sh --backend    # Restart backend only
```

### Available Commands

```bash
# Development
npm run backend:dev          # Start backend with auto-reload
npm run frontend:dev         # Start frontend with hot reload

# Building
npm run build:all           # Build all shared packages
npm run build:client        # Build frontend for production
npm run frontend            # Build frontend (production)

# Testing
npm run test:all            # Run all test suites
npm run test:api            # Backend tests only
npm run test:client         # Frontend tests only
npm run e2e                 # End-to-end tests

# Code Quality
npm run lint                # Lint all code
npm run format              # Format with Prettier
npm run typecheck:all       # TypeScript type checking
npm run check:all           # Full quality check (pre-PR)
npm run preflight           # Complete CI/CD simulation
```

## Docker Services

Agentis uses Docker for supporting services while keeping the main app on the host for faster development.

### Service Management

```bash
# Start all services
./scripts/docker-cli.sh start

# Check service status  
./scripts/docker-cli.sh status

# View logs
./scripts/docker-cli.sh logs [service_name]

# Stop all services
./scripts/docker-cli.sh stop

# Access MongoDB shell
./scripts/docker-cli.sh mongo-shell
```

### Available Services

| Service | Port | Purpose | Docker Image |
|---------|------|---------|--------------|
| **MongoDB** | 27017 | Primary database | `mongodb/mongodb-community-server:latest` |
| **MeiliSearch** | 7700 | Full-text search | `getmeili/meilisearch:v1.12.3` |
| **PostgreSQL** | 5432 | Vector database | `ankane/pgvector:latest` |
| **RAG API** | 8000 | Document processing | `ghcr.io/gannonh/rag-api-lite:latest` |
| **Sandpack** | 8080 | Code execution | `ghcr.io/gannonh/codesandbox-client/bundler:latest` |
| **MailHog** | 8025 | Email testing | `mailhog/mailhog:latest` |

### Connection Details

**MongoDB**
```
Host: localhost:27017
Username: admin  
Password: password
Database: Agentis
Connection String: mongodb://admin:password@localhost:27017/Agentis?authSource=admin
```

**PostgreSQL (Vector DB)**
```
Host: localhost:5432
Database: mydatabase
Username: myuser
Password: mypassword
```

## MCP Integration

Model Context Protocol enables powerful tool integrations with external services.

### Pre-configured Integrations

| Service | Tools Available | Authentication |
|---------|-----------------|----------------|
| **Gmail** | Send/receive emails, manage labels, search | OAuth2 |
| **Google Drive** | File management, sharing, search | OAuth2 |
| **Google Sheets** | Create, edit, format spreadsheets | OAuth2 |
| **Google Docs** | Document creation and editing | OAuth2 |
| **Google Calendar** | Event management, scheduling | OAuth2 |
| **Notion** | Database and page management | OAuth2 |

### Configuration

MCP servers are configured in `librechat.yaml`. Example configuration:

```yaml
mcpServers:
  gmail:
    type: streamable-http
    url: https://mcp.composio.dev/composio/server/[UUID]/mcp?user_id={{LIBRECHAT_USER_ID}}
    displayName: "Gmail"
    iconPath: "/assets/tools/gmail.svg"
    description: "Email management and communication"
    headers:
      X-API-Key: "${COMPOSIO_API_KEY}"
    toolDisplayNames:
      GMAIL_SEND_EMAIL: "Send Email"
      GMAIL_FETCH_EMAILS: "Get Emails"
```

### Using MCP Tools

1. **Start a conversation** with any AI model
2. **Select tools** from the tools panel (if tools are configured)
3. **Authenticate** when prompted (OAuth flow will open)
4. **Use natural language** to interact with your tools:
   - "Check my recent emails"
   - "Create a Google Doc summarizing this conversation"
   - "Add an event to my calendar for tomorrow at 2 PM"

## Testing

### Test Structure

```bash
LibreChat/
├── api/__tests__/           # Backend unit/integration tests
├── client/src/**/*.test.*   # Frontend component tests  
├── packages/*/src/**/*.test.* # Package-specific tests
└── e2e/specs/              # End-to-end test scenarios
```

### Running Tests

```bash
# Unit Tests
npm run test:api            # Backend tests (Vitest)
npm run test:client         # Frontend tests (Vitest + RTL)
npm run test:packages       # Shared package tests

# Integration Tests  
npm run test:api:integration # Backend integration tests

# End-to-End Tests
npm run e2e                 # Headless browser tests
npm run e2e:headed          # Tests with visible browser
npm run e2e:ui              # Interactive test runner

# Coverage Reports
npm run test:coverage       # Generate coverage reports
```

### Test Categories

- **Unit Tests**: Individual function/component testing
- **Integration Tests**: Database, API, and service integration
- **E2E Tests**: Full user workflow testing with Playwright
- **Visual Tests**: Component rendering and styling validation

## Deployment

### Production Deployment

1. **Prepare environment**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export MONGO_URI=your-production-mongo-uri
   export JWT_SECRET=your-production-jwt-secret
   # ... other production variables
   ```

2. **Build the application**
   ```bash
   npm run build:all
   npm run frontend
   ```

3. **Deploy with Docker**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Health Monitoring

The application provides health check endpoints:

- `GET /api/health` - Overall application health
- `GET /api/health/database` - Database connectivity  
- `GET /api/health/mcp` - MCP server status
- `GET /api/health/services` - External service status

### Security Considerations

- Change all default passwords and secrets
- Use environment variables for sensitive configuration
- Enable HTTPS in production
- Configure proper CORS settings
- Set up rate limiting and monitoring
- Regular security updates and dependency scanning

## Contributing

### Getting Started

1. **Fork the repository** and clone your fork
2. **Create a feature branch**: `git checkout -b feat/your-feature-name`
3. **Set up development environment** (see Development section)
4. **Make your changes** following the coding standards
5. **Add tests** for new functionality
6. **Run quality checks**: `npm run check:all`
7. **Submit a pull request** with a clear description

### Development Standards

- **Code Style**: ESLint + Prettier configuration
- **TypeScript**: Strict mode enabled, avoid `any` types
- **Testing**: Unit tests required for new features
- **Documentation**: Update relevant docs with changes
- **Commits**: Use conventional commit format

### Branch Naming

- `feat/issue-123-description` - New features
- `fix/issue-456-description` - Bug fixes  
- `docs/update-readme` - Documentation updates
- `refactor/component-cleanup` - Code refactoring

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
./scripts/docker-cli.sh status mongodb

# Check connection string format
echo $MONGO_URI
# Should be: mongodb://admin:password@localhost:27017/Agentis?authSource=admin
```

**Frontend Won't Start**
```bash
# Rebuild packages first
npm run build:all

# Clear package cache
rm -rf node_modules package-lock.json
npm install
```

**MCP Tools Not Working**
- Verify `COMPOSIO_API_KEY` is set in environment
- Check MCP server configuration in `librechat.yaml`
- Review browser console for authentication errors

**Docker Services Won't Start**
```bash
# Reset Docker environment
./scripts/docker-cli.sh stop
docker system prune -f
./scripts/docker-cli.sh start
```

### Getting Help

- **Documentation**: Check the `docs/` directory for detailed guides
- **Issues**: Search existing GitHub issues or create a new one
- **Logs**: Check `logs/backend.log` and `logs/frontend.log` for errors

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built on the foundation of [LibreChat](https://github.com/danny-avila/LibreChat) with enhancements for enterprise use. Special thanks to:

- **LibreChat contributors** for the foundational platform
- **Better Auth team** for modern authentication solutions  
- **Composio** for MCP integration services
- **Radix UI** for accessible component primitives

---

**Ready to get started?** Follow the [Quick Start](#quick-start) guide and you'll be chatting with AI in minutes!