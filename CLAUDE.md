# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentis is an all-in-one AI conversations platform that integrates multiple AI models into a single chat interface. It's a branded fork of LibreChat with custom capabilities, allowing users to integrate various AI models including:
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

## Docker Configuration

### Development Setup

For local development, use the dev configuration that runs only supporting services while keeping the API and client running on the host:

```bash
# Start supporting services for development
docker-compose -f docker-compose.dev.yml up -d

# Or use our CLI helper
../scripts/docker-cli.sh start
```

### Full Deployment

For full application deployment with Docker:

```bash
# Start application with Docker
docker-compose up -d

# With custom configuration
docker-compose -f ./deploy-compose.yml up -d
```

### Docker Best Practices

1. **MongoDB Connection**:
   - Always use `authSource=admin` in MongoDB connection strings when using Docker containers
   - Specify the database name explicitly (e.g., `/Agentis`) to avoid using the default "test" database
   - Example: `mongodb://admin:password@localhost:27017/Agentis?authSource=admin`

2. **Environment Handling**:
   - Use `.env.docker` for Docker-specific environment variables
   - Add `.env.docker` to `.gitignore` to prevent committing API keys
   - Use environment variables in docker-compose.yml with defaults for non-sensitive information

3. **Volume Management**:
   - When configuration changes cause issues, use `docker-compose down -v` to reset volumes
   - Volumes are stored in Docker's managed area at `/var/lib/docker/volumes/[volume_name]/_data`

4. **Debugging Docker Services**:
   - Check logs with `docker logs [container_name]` 
   - Use `docker exec -it [container_name] [command]` to run commands inside containers
   - Use container names that include the project name for clarity (`agentis-mongodb` instead of just `mongodb`)

## Key Architecture Components

### Backend Architecture

1. **Express.js Server**
   - RESTful API endpoints for auth, conversations, and messages
   - Integration with multiple AI providers through adapter pattern
   - MongoDB for data storage
   - WebSockets/SSE for streaming responses
   - Integration with Sandpack code execution environment

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

## Coding Conventions

### Node.js API Server

#### General Guidelines
- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use "clean code" principles with small functions and modules
- Prioritize readability and maintainability over brevity
- Use CommonJS modules (require/exports) for Node.js modules
- Apply proper modularization with separate files for different concerns

#### API Design
- Follow RESTful principles with appropriate HTTP methods
- Use proper status codes (2xx success, 4xx client error, 5xx server error)
- Implement consistent error handling with try-catch blocks
- Use the logging system in `utils` directory for important events and errors
- Use JWT-based, stateless authentication with `requireJWTAuth` middleware

#### File Structure
- **Routes**: Separate files for each resource using Express Router, prefixed with /api
- **Controllers**: PascalCase files with "Controller" suffix (e.g., UserController.js)
- **Services**: PascalCase files with "Service" suffix for business logic
- **Models**: Singular PascalCase names for Mongoose models (e.g., User.js)

#### Best Practices
- Keep controllers thin by delegating complex operations to services
- Encapsulate database queries within model methods or service functions
- Add JSDoc-style comments to functions, classes, and modules
- Write unit tests for endpoints, controllers, and services

### React Client

#### TypeScript Practices
- Always use proper types for component props and state
- Avoid using `any` type unless absolutely necessary
- Define interfaces or types for data structures
- Use TypeScript's utility types (Partial, Pick, Omit) when appropriate

#### Component Structure
- Use functional components with hooks instead of class components
- Follow a component-based architecture
- Keep components focused on a single responsibility
- Minimize rendering logic by extracting complex logic into functions/hooks
- Use lazy loading for code splitting to improve performance

#### File Organization
- Organize components by feature or domain
- Group related files together in a single directory
- Use PascalCase for component names and camelCase for functions/variables
- Use index.ts files to export components to simplify imports

#### State Management
- Use React Context API and Recoil for state management
- Keep state as close to where it's needed as possible
- Use local component state for UI-specific state
- Avoid prop drilling by using Context or Recoil for shared state
- Use the useReducer hook for complex state logic


