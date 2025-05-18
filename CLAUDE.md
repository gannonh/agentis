# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LibreChat is an all-in-one AI conversations platform that integrates multiple AI models into a single chat interface. It's a free and open-source alternative to proprietary chat platforms like ChatGPT Plus, allowing users to integrate various AI models including:
- Anthropic (Claude)
- OpenAI
- Azure OpenAI
- Google Vertex AI
- And more through custom endpoints

## Project Structure

- **api/**: Backend server (Node.js/Express)
  - API endpoints, controllers, middleware, models, services
  - Authentication, conversations, message processing, AI provider integrations
  
- **client/**: Frontend application (React, TypeScript)
  - UI components for chat functionality
  - Uses Tailwind CSS for styling
  
- **config/**: Utility scripts for user management, balance management, and configuration

## Development Commands

### Installation

```bash
# Install dependencies
npm ci

# Build shared packages
npm run build:data-provider
npm run build:mcp
npm run build:data-schemas
```

### Running the Application

```bash
# Start backend server in development mode
npm run backend:dev

# Start frontend development server
npm run frontend:dev

# Production mode
npm run backend      # Start backend server in production mode
npm run frontend     # Build frontend for production
```

### Testing

```bash
# Run backend unit tests
npm run test:api

# Run frontend unit tests  
npm run test:client

# End-to-end tests
npm run e2e          # Run E2E tests
npm run e2e:headed   # Run E2E tests with browser visible
npm run e2e:a11y     # Run accessibility tests
```

### Code Quality

```bash
# Linting
npm run lint         # Check for linting issues
npm run lint:fix     # Fix linting issues automatically
npm run format       # Format code with prettier
```

## Docker Deployment

```bash
# Start application with Docker
docker-compose up -d

# With custom configuration
docker-compose -f ./deploy-compose.yml up -d
```

## Key Architecture Components

### Backend Architecture

1. **Express.js Server**
   - RESTful API endpoints for auth, conversations, and messages
   - Integration with multiple AI providers through adapter pattern
   - MongoDB for data storage
   - WebSockets/SSE for streaming responses

2. **Client Adapters**
   - Each AI provider has its own client adapter (`api/app/clients/`)
   - `BaseClient.js` provides common functionality
   - Provider-specific clients (OpenAIClient, AnthropicClient, etc.) extend BaseClient

3. **Middleware**
   - Authentication middleware
   - Rate limiting and request validation
   - Role-based access control

### Frontend Architecture

1. **Component Structure**
   - React components with Tailwind CSS
   - Recoil and React Context for state management
   - React Router for navigation

2. **Context Providers**
   - Multiple context providers for various features
   - Chat, conversation, message management
   - Authentication and user session handling

3. **API Integration**
   - Data providers for backend communication
   - Real-time message streaming

## Commit Message Guidelines

Follow conventional commit format:
- `feat`: New feature
- `fix`: Bug fix
- `perf`: Performance improvement
- `test`: Adding/fixing tests
- `docs`: Documentation changes
- `refactor`: Code change (no new features)
- `chore`: Routine tasks

## Development Workflow

1. Create/update feature branch from main
2. Run tests and linting before committing
3. Follow conventional commit messages
4. Ensure test coverage meets requirements
5. Submit pull request with clear description
6. Address reviewer feedback
7. Squash and merge to main when approved

## Naming Conventions

Apply the following naming conventions to branches, labels, and other Git-related entities:

- **Branch names:** Descriptive and slash-based (e.g., `new/feature/x`).
- **Labels:** Descriptive and kebab case (e.g., `bug-fix`).
- **JS/TS:** Directories and file names: Descriptive and camelCase. First letter uppercased for React files (e.g., `helperFunction.ts, ReactComponent.tsx`).
- **Docs:** Directories and file names: Descriptive and snake_case (e.g., `config_files.md`).
