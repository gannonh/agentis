# DevOps Documentation

## Production Setup

### Digital Ocean Deployment

- **Provider**: Digital Ocean
- **Domain**: agentis.ai
- **Droplet**: 1GB RAM, 2GB swap file added
- **OS**: Ubuntu with Docker 28.1.1, Docker Compose v2.35.1
- **Deployment Path**: `/home/agentis/agentis-deploy`

### Access Credentials

- **Email**: gannon@astro-labs.app
- **Email Password**: S3cr3t77!
- **Droplet Root Password**: vyZcix-ruczyh-3wygqo
- **Droplet Agentis Password**: vIpKdgJGyk33Gu8
- **Read Packages Access Token**: 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

### Production Architecture

The Agentis platform uses a Docker-only deployment strategy:
- All application code is packaged into Docker images
- No source code exists on the production server
- Configuration is injected via environment variables from GitHub Secrets
- Docker images are stored in GitHub Container Registry (ghcr.io)

### CI/CD Pipeline

The production deployment is fully automated through GitHub Actions:

1. **Trigger**: Push to `main` branch or manual workflow dispatch
2. **Build Phase**:
   - Builds API Docker image from `Dockerfile.multi` (target: `api-build`)
   - Builds Client Docker image from `Dockerfile.multi` (target: `client-deploy`)
   - Pushes both images to GitHub Container Registry
3. **Deploy Phase**:
   - SSHs into production server
   - Creates `docker-compose.prod.yml` with all environment variables
   - Pulls latest images using GitHub PAT for authentication
   - Restarts all containers with new images

### Environment Configuration

#### Production Environment Variables

All production configuration is managed through GitHub Secrets and injected during deployment:

**Required GitHub Secrets**:
- `PRODUCTION_HOST` - Digital Ocean droplet IP
- `PRODUCTION_USER` - SSH username (agentis)
- `PRODUCTION_PASSWORD` - SSH password
- `GHCR_PAT` - GitHub Personal Access Token for container registry
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `GOOGLE_KEY` - Google API key
- `ASSISTANTS_API_KEY` - OpenAI Assistants API key
- `IMAGE_GEN_OAI_API_KEY` - OpenAI image generation key
- `OCR_API_KEY` - OCR service API key
- `MISTRAL_API_KEY` - Mistral AI API key
- `OPENROUTER_KEY` - OpenRouter API key
- `ARCADE_API_KEY` - Arcade AI API key
- `COMPOSIO_API_KEY` - Composio API key
- `CREDS_KEY` - Encryption key for credentials
- `CREDS_IV` - Encryption IV for credentials
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `MEILI_MASTER_KEY` - Meilisearch master key

#### Local Development Environment

For local development, configuration is split across two files:

1. **`.env`** - Main application configuration (API and client)
2. **`.env.docker`** - Docker services configuration (RAG API needs OpenAI key)

Both files are required for local development but are NOT used in production.

### Production Services

The production deployment runs the following services:

1. **agentis-api** - Node.js/Express API server (port 3080)
2. **agentis-client** - Nginx serving React build (ports 80/443)
3. **agentis-mongodb** - MongoDB database
4. **agentis-meilisearch** - Search engine
5. **agentis-vectordb** - PostgreSQL with pgvector
6. **agentis-rag-api** - RAG (Retrieval-Augmented Generation) API

All services run in Docker containers managed by Docker Compose.

## Docker Configuration

### Development Environment

For local development, we use Docker to run supporting services while keeping the API and client on the host for hot reloading.

#### Docker Compose Setup

The `docker-compose.dev.yml` file defines:
1. **MongoDB** - Database for user data and conversations
2. **Meilisearch** - Search engine for conversation search
3. **VectorDB** - PostgreSQL with pgvector for embeddings
4. **RAG API** - Document processing and retrieval
5. **Sandpack** - Code execution environment

#### Managing Docker Services

Use the provided CLI script:
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

### Data Persistence

Docker volumes ensure data persists across container restarts:
- `mongodb_data` and `mongodb_config` - MongoDB data
- `meili_data` - Meilisearch index data  
- `pgdata` - PostgreSQL/pgvector data
- `agentis_uploads` - User uploaded files
- `agentis_logs` - Application logs
- `agentis_images` - Generated images

### Troubleshooting

#### MongoDB Authentication Issues
- Always include `authSource=admin` in connection strings
- Example: `mongodb://admin:password@localhost:27017/Agentis?authSource=admin`
- The admin user is created in the "admin" database

#### RAG API Issues
- Requires exact database credentials (hardcoded in container)
- Needs OpenAI API key from `.env.docker` (local) or GitHub Secrets (production)
- Check health: `curl http://localhost:8000/health`
- View docs: `http://localhost:8000/docs`

#### General Debugging
- Check logs: `docker logs [container_name]`
- Enter container: `docker exec -it [container_name] bash`
- Reset volumes: `docker-compose down -v` (WARNING: deletes all data)

## Development Setup

### Prerequisites
- Node.js 20.x
- npm 10.x or higher
- Docker and Docker Compose
- MongoDB (for running tests)
- TypeScript installed globally: `npm i -g typescript`

### Initial Setup

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/gannonh/agentis.git
   cd agentis
   npm ci
   ```

2. **Build shared packages**:
   ```bash
   npm run build:data-provider
   npm run build:mcp
   npm run build:data-schemas
   ```

3. **Configure environment**:
   ```bash
   # Copy example files
   cp .env.example .env
   cp LibreChat/.env.docker.example LibreChat/.env.docker
   cp librechat.example.yaml librechat.yaml
   
   # Edit .env and .env.docker with your API keys
   ```

4. **Start Docker services**:
   ```bash
   cd LibreChat
   docker-compose -f docker-compose.dev.yml up -d
   cd ..
   ```

### Running the Application

```bash
# Backend API (with hot reload)
npm run backend:dev

# Frontend (with hot reload) - in a new terminal
npm run frontend:dev
```

### Testing

```bash
# Unit tests
npm run test:api      # Backend tests
npm run test:client   # Frontend tests

# E2E tests setup
cp api/test/.env.test.example api/test/.env.test
cp e2e/config.local.example.ts e2e/config.local.ts
npx playwright install

# Run E2E tests
npm run e2e           # Headless
npm run e2e:headed    # With browser
npm run e2e:a11y      # Accessibility tests
```

## Development Workflow

1. **Before starting work**:
   - Update main branch: `git pull origin main`
   - Install latest dependencies: `npm ci`
   - Start Docker services: `npm run docker:dev`

2. **After making changes**:
   - Run linting: `npm run lint`
   - Run tests: `npm run test:api` and `npm run test:client`
   - Build TypeScript: `cd client && npm run build`
   - Clear browser localStorage and cookies

3. **Package updates**:
   - If you modify `packages/data-provider`, `packages/mcp`, or `packages/data-schemas`:
   - Rebuild the package: `npm run build:[package-name]`
   - Restart the application

4. **Version updates**:
   - Update version in `packages/data-provider/src/config.ts`
   - Update version in main `package.json`
   - Rebuild data-provider: `npm run build:data-provider`

## Deployment Process

### Automated Deployment (CI/CD)

1. **Create pull request** to `main` branch
2. **Ensure all checks pass** (tests, linting, build)
3. **Merge to main** - this triggers automatic deployment
4. **Monitor deployment** in GitHub Actions tab
5. **Verify deployment** at https://agentis.ai

### Manual Deployment

If needed, trigger deployment manually:
1. Go to GitHub Actions tab
2. Select "Deploy to Production" workflow
3. Click "Run workflow"
4. Select `main` branch
5. Click "Run workflow" button

### Rollback Procedure

If deployment fails:
1. SSH into production server
2. Revert to previous images:
   ```bash
   cd /home/agentis/agentis-deploy
   docker-compose -f docker-compose.prod.yml down
   # Edit docker-compose.prod.yml to use previous image tags
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Security Notes

### Production Security
- All sensitive values stored in GitHub Secrets
- No `.env` files on production server
- Docker images are private in GitHub Container Registry
- MongoDB runs with authentication enabled
- All inter-service communication happens within Docker network

### Local Development Security
- `.env` and `.env.docker` files are gitignored
- Use example files as templates
- Never commit API keys or secrets
- Rotate credentials regularly

## Memory Management

The Digital Ocean droplet has limited RAM (1GB). A 2GB swap file was added:
```bash
# Swap file location: /swapfile
# Configured in: /etc/fstab
# Check swap usage: free -h
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check all services
docker ps

# Check specific service logs
docker logs agentis-api
docker logs agentis-client

# Check disk space
df -h

# Check memory usage
free -h
```

### Regular Maintenance
1. **Weekly**: Clean up old Docker images: `docker image prune -f`
2. **Monthly**: Review and rotate API keys
3. **Quarterly**: Update base Docker images and dependencies

## Future Improvements

1. **SSL/TLS Configuration** - Add Let's Encrypt certificates via nginx
2. **Monitoring** - Add Prometheus/Grafana for metrics
3. **Backup Strategy** - Automated MongoDB and volume backups
4. **Multi-node Deployment** - Scale horizontally with Docker Swarm/K8s
5. **Rename LibreChat** - Transition to `platform/` directory structure