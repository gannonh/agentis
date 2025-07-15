# Technology Stack

## Build System & Package Management
- **Monorepo**: npm workspaces with packages in `api`, `client`, and `packages/*`
- **Package Manager**: npm (primary), bun (alternative runtime)
- **Build Tools**: Vite (frontend), native Node.js (backend)
- **TypeScript**: Separate configs for development and production type checking

## Backend Stack
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with middleware for auth, rate limiting, CORS
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Better Auth (v1.2.9) with JWT tokens
- **Caching**: Redis with Keyv abstraction layer
- **File Storage**: Support for local, S3, Azure Blob, Firebase
- **Testing**: Vitest for unit and integration tests

## Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with plugins for PWA, compression, polyfills
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Recoil + React Context
- **Routing**: React Router DOM
- **HTTP Client**: TanStack Query for server state
- **Testing**: Vitest + Testing Library

## Shared Packages
- **data-schemas**: Mongoose models and Zod schemas
- **data-provider**: API communication layer
- **mcp**: Model Context Protocol integration
- **arcade-client**: Code execution client SDK

## Development Commands

### Installation & Setup
```bash
cd LibreChat
npm ci
npm run build:all  # Build all shared packages
```

### Development Servers
```bash
# Backend (auto-restart on changes)
npm run backend:dev

# Frontend (auto-restart on changes) 
npm run frontend:dev

# Helper script with build management
../scripts/dev.sh --help
```

### Package Development
```bash
# Rebuild packages after changes
npm run build:data-schemas
npm run build:data-provider  
npm run build:mcp
npm run build:arcade-client

# Watch mode for active development
cd packages/[package-name] && npm run build:watch
```

### Testing
```bash
# Unit tests
npm run test:api        # Backend tests
npm run test:client     # Frontend tests
npm run test:packages   # Shared package tests

# Integration tests
npm run test:api:integration

# E2E tests
npm run e2e            # Headless
npm run e2e:headed     # With browser UI
```

### Code Quality
```bash
# Linting & formatting
npm run lint           # Check all code
npm run lint:fix       # Auto-fix issues
npm run format         # Prettier formatting

# Type checking (production code only)
npm run typecheck:all
npm run typecheck:client
npm run typecheck:packages

# Pre-flight checks
npm run check:all      # Lint + format + typecheck + test
```

### Docker Development
```bash
# Start supporting services only (MongoDB, Redis, RAG API)
docker-compose -f docker-compose.dev.yml up -d

# Helper script
../scripts/docker-cli.sh start
../scripts/docker-cli.sh status
```

## Key Dependencies
- **AI SDKs**: @anthropic-ai/sdk, openai, @google/generative-ai, cohere-ai
- **Database**: mongoose, mongodb
- **Auth**: better-auth, passport (legacy), jsonwebtoken
- **HTTP**: express, axios, cors, helmet
- **UI**: @radix-ui/*, framer-motion, react-markdown
- **Build**: vite, typescript, eslint, prettier
- **Testing**: vitest, @playwright/test, @testing-library/*