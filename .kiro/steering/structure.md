# Project Structure

## Root Directory Organization
```
agentis/                    # Project root
├── LibreChat/             # Main application (work from here)
├── docs/                  # Project documentation
├── scripts/               # Project-level utility scripts
├── logs/                  # Development logs
├── codesandbox-client/    # Self-hosted code execution
├── rag_api/              # Self-hosted document processing
└── secrets/              # Local secrets management
```

## LibreChat Application Structure
```
LibreChat/                 # Main application directory
├── api/                   # Backend server (Node.js/Express)
│   ├── app/              # Core application logic
│   │   ├── clients/      # AI provider adapters
│   │   ├── controllers/  # Route handlers
│   │   └── middleware/   # Express middleware
│   ├── models/           # Mongoose data models
│   ├── server/           # Server configuration
│   ├── utils/            # Utility functions
│   └── __tests__/        # Backend tests
├── client/               # Frontend application (React/TypeScript)
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── store/        # Recoil state management
│   │   └── utils/        # Frontend utilities
│   └── test/             # Frontend tests
├── packages/             # Shared packages
│   ├── data-schemas/     # Mongoose schemas + Zod validation
│   ├── data-provider/    # API communication layer
│   ├── mcp/             # Model Context Protocol services
│   └── arcade-client/    # Code execution client SDK
├── config/               # User management scripts
├── e2e/                  # Playwright end-to-end tests
└── utils/                # DevOps utilities
```

## Key Architectural Patterns

### Backend Organization
- **Routes**: RESTful endpoints in `api/server/routes/` with `/api` prefix
- **Controllers**: PascalCase files with "Controller" suffix in `api/app/controllers/`
- **Services**: Business logic in PascalCase files with "Service" suffix
- **Models**: Singular PascalCase Mongoose models in `api/models/`
- **Clients**: AI provider adapters extending `BaseClient` in `api/app/clients/`
- **Middleware**: Express middleware in `api/app/middleware/`

### Frontend Organization
- **Components**: Feature-based organization in `client/src/components/`
- **Hooks**: Custom React hooks in `client/src/hooks/`
- **Store**: Recoil atoms and selectors in `client/src/store/`
- **Utils**: Helper functions in `client/src/utils/`
- **Types**: TypeScript definitions co-located with components

### Shared Packages
- **data-schemas**: Database models and validation schemas
- **data-provider**: API client and data fetching logic
- **mcp**: Model Context Protocol integration services
- **arcade-client**: Code execution environment SDK

## File Naming Conventions
- **Components**: PascalCase (e.g., `ChatMessage.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useConversation.ts`)
- **Utils**: camelCase (e.g., `formatMessage.ts`)
- **Controllers**: PascalCase with "Controller" suffix (e.g., `MessageController.js`)
- **Models**: Singular PascalCase (e.g., `User.js`, `Conversation.js`)
- **Routes**: kebab-case (e.g., `auth-routes.js`)

## Import Path Aliases
- **Backend**: Uses Node.js subpath imports (`#app/*`, `#models/*`, `#utils/*`)
- **Frontend**: Uses TypeScript path mapping (`~/components/*`, `librechat-data-provider/*`)

## Working Directory Context
**Important**: Most development commands should be run from the `LibreChat/` directory, not the project root. The application treats `LibreChat/` as its working directory.

## Package Dependencies
Shared packages have dependencies that require rebuild order:
1. `data-schemas` (base schemas)
2. `data-provider` (depends on schemas)
3. `mcp` (depends on data-provider)
4. `arcade-client` (independent)

Changes to a package require rebuilding it and any dependent packages.