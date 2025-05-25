# Docker Setup for Agentis

This document describes the Docker configuration for Agentis, a fork of LibreChat.

## Development Environment

For local development, we use Docker to run the supporting services (MongoDB, Meilisearch, Vector Database, RAG API) while running the API and client applications directly on the host machine for hot reloading and better debugging experience.

### Docker Compose Setup

The `docker-compose.dev.yml` file in the LibreChat directory defines the following services:

1. **MongoDB** - Database for storing user data, conversations, and application data
2. **Meilisearch** - Search engine for conversation search functionality
3. **VectorDB** - PostgreSQL with pgvector extension for vector embeddings
4. **RAG API** - Retrieval-Augmented Generation API for document processing
5. **Sandpack** - Code execution environment for running code snippets in the chat

### Managing Docker Services

We provide a utility script at `../scripts/docker-cli.sh` to manage these services. Common operations include:

```bash
# Start all services
../scripts/docker-cli.sh start

# Check service status
../scripts/docker-cli.sh status

# View logs
../scripts/docker-cli.sh logs [service]

# Stop all services
../scripts/docker-cli.sh stop
```

Run `../scripts/docker-cli.sh help` for more options.

### Environment Configuration

There are two important environment files:

1. **`.env`** - Used by the Agentis API and client applications:

```
# MongoDB
MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin

# Meilisearch
MEILI_HOST=http://0.0.0.0:7700
MEILI_MASTER_KEY=DrhYf7zENyR6AlUCKmnz0eYASOQdl6zxH7s7MKFSfFCt

# RAG API
RAG_API_URL=http://localhost:8000

# Sandpack (Code Execution)
SANDPACK_BUNDLER_URL=http://localhost:8080
```

2. **`.env.docker`** - Used by Docker services, particularly the RAG API which needs the OpenAI API key for embeddings:

```
# OpenAI API Key for RAG service
OPENAI_API_KEY=your_openai_api_key_here

# Database configuration
DB_HOST=db
DB_PORT=5432
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=mydatabase
```

The `.env.docker` file is added to `.gitignore` to prevent API keys from being committed to the repository.

## Production Environment (Agentis Platform)

**Note**: We are building the Agentis platform as a custom fork of LibreChat. The LibreChat directory will eventually be renamed to `platform/`. We are NOT using the upstream LibreChat Docker images.

### Production Setup (Digital Ocean)

As of May 24, 2025, we're setting up production on a Digital Ocean droplet for the Agentis platform:

1. **Environment Configuration**:
   - Production config is stored in `.env.prod` (copy of development `.env` with production values)
   - Need to create custom `docker-compose.prod.yml` for Agentis deployment

2. **Services to Deploy**:
   - **Agentis API**: Custom build from our codebase (port 3080)
   - **Agentis Client**: Custom React build served by nginx (ports 80/443)
   - **MongoDB**: Official mongo image with authentication enabled
   - **Meilisearch**: v1.12.3 for search functionality
   - **VectorDB**: pgvector for RAG functionality
   - **RAG API**: May need custom build or use upstream image

3. **Production Deployment Steps** (To Be Implemented):
   ```bash
   # 1. Configure production environment
   cp .env .env.prod
   # Edit .env.prod with production values
   
   # 2. Build Agentis images
   docker build -t agentis/api:latest -f Dockerfile.multi --target api-build .
   docker build -t agentis/client:latest -f Dockerfile.multi --target client-build .
   
   # 3. Start services with production compose file
   docker compose -f docker-compose.prod.yml up -d
   
   # 4. Check service health
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs
   ```

### CD Pipeline (To Be Implemented)

The continuous deployment pipeline for Agentis will:
1. Trigger on pushes to main branch
2. Build and push Agentis Docker images to our registry
3. SSH into the production server
4. Pull latest Agentis images and restart services
5. Run health checks

## Data Persistence

The Docker Compose configuration uses named volumes to persist data:

- `mongodb_data` and `mongodb_config` - For MongoDB data
- `meili_data` - For Meilisearch data
- `pgdata` - For PostgreSQL/pgvector data

These volumes ensure that your data persists across container restarts and updates.

## Network Configuration

All services are configured within the same Docker network (`agentis_network`) for inter-container communication.

## Security Considerations

The development environment uses default credentials for simplicity. For production use:

1. Change all default passwords
2. Use environment variables for sensitive information
3. Consider using Docker secrets for credential management
4. Enable TLS/SSL for all services

## Troubleshooting

If you encounter issues with the Docker services:

1. Check container logs: `../scripts/docker-cli.sh logs [service]`
2. Verify network connectivity between containers
3. Ensure proper port mapping
4. Check volume permissions
5. Restart problematic services: `../scripts/docker-cli.sh restart [service]`

### RAG API and Vector Database Issues

The RAG API requires specific database credentials to function correctly. If you're experiencing connection issues:

1. The RAG API container expects these exact database settings:
   ```
   DB_HOST=db
   DB_PORT=5432
   DB_USER=myuser
   DB_PASSWORD=mypassword
   DB_NAME=mydatabase
   ```

2. These settings are hard-coded in the RAG API container. If you need to use different credentials, you may need to rebuild the RAG API container.

3. If you've changed the configuration and are still having issues, try removing the volumes and restarting:
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. The RAG API requires an OpenAI API key for generating embeddings. Make sure this is set in your `.env.docker` file.

### MongoDB Configuration

When connecting to MongoDB, make sure to:

1. Use the correct database name in your connection string:
   ```
   MONGO_URI=mongodb://admin:password@localhost:27017/Agentis?authSource=admin
   ```

2. Include the `authSource=admin` parameter in your connection string. This is **required** because:
   - The admin user is created in the "admin" database
   - Without this parameter, authentication will fail even with correct credentials
   - This ensures the application authenticates against the proper database

3. If experiencing authentication issues:
   ```bash
   # Restart the MongoDB container
   docker restart agentis-mongodb
   
   # Then restart your API application
   npm run backend:dev
   ```

### Verifying RAG API Functionality

To verify that the RAG API is working correctly:

1. Check if the service is running:
   ```bash
   docker ps | grep rag_api
   ```

2. Check the health endpoint:
   ```bash
   curl -s http://localhost:8000/health | jq
   ```
   Expected output: `{ "status": "UP" }`

3. You can access the API documentation at:
   ```
   http://localhost:8000/docs
   ```

4. Once the RAG API is properly configured, you should be able to upload and search documents in the LibreChat interface.

For more detailed help, consult the LibreChat documentation or Agentis development team.