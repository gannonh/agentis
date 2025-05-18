# Agentis Docker Setup Recommendations

This document outlines the recommended approach for dockerizing Agentis, your fork of LibreChat.

## 1. Development Environment

### Current Setup
Currently, you're running MongoDB in Docker while building the client and API locally in development mode to leverage hot reloading.

### Recommended Development Setup

```
Development Environment
├── Docker
│   ├── MongoDB
│   ├── Meilisearch (for search functionality)
│   ├── PGVector (for vector embeddings)
│   └── RAG API (for retrieval-augmented generation)
└── Local Node.js (with hot reloading)
    ├── Client (React frontend)
    └── API (Node.js backend)
```

#### Docker Compose for Development

Create a `docker-compose.dev.yml` file:

```yaml
version: '3'
services:
  mongodb:
    container_name: agentis-mongodb
    image: mongo
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - ./data-node:/data/db
    command: mongod --noauth
    
  meilisearch:
    container_name: agentis-meilisearch
    image: getmeili/meilisearch:v1.12.3
    restart: always
    ports:
      - "7700:7700"
    environment:
      - MEILI_NO_ANALYTICS=true
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY:-masterKey}
    volumes:
      - ./meili_data:/meili_data
      
  vectordb:
    container_name: agentis-vectordb
    image: ankane/pgvector:latest
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: agentis
      POSTGRES_USER: agentis
      POSTGRES_PASSWORD: agentispassword
    volumes:
      - pgdata:/var/lib/postgresql/data
      
  rag_api:
    container_name: agentis-rag-api
    image: ghcr.io/danny-avila/librechat-rag-api-dev-lite:latest
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=vectordb
      - RAG_PORT=8000
    depends_on:
      - vectordb

volumes:
  pgdata:
```

Run with:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This allows you to:
1. Run all supporting services in Docker
2. Keep API and client running locally for fast development
3. Connect local API to Docker services via localhost ports

## 2. Production Environment

For production, you should containerize everything to ensure consistency between environments.

### Recommended Production Setup

```
Production Environment (All Dockerized)
├── API Container (Node.js)
├── Client/Nginx Container
├── MongoDB Container
├── Meilisearch Container
├── PGVector Container
└── RAG API Container
```

#### Docker Compose for Production

Create a `docker-compose.prod.yml` file:

```yaml
version: '3'
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: agentis-api
    restart: always
    ports:
      - "3080:3080"
    depends_on:
      - mongodb
      - rag_api
    environment:
      - HOST=0.0.0.0
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongodb:27017/Agentis
      - MEILI_HOST=http://meilisearch:7700
      - RAG_API_URL=http://rag_api:8000
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/api/logs
      - ./images:/app/client/public/images
      
  client:
    build:
      context: .
      dockerfile: Dockerfile.client
    container_name: agentis-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"  # For HTTPS
    depends_on:
      - api
      
  # Same supporting services as in development
  mongodb:
    container_name: agentis-mongodb
    # ... (same as dev setup)

  meilisearch:
    container_name: agentis-meilisearch
    # ... (same as dev setup)
    
  vectordb:
    container_name: agentis-vectordb
    # ... (same as dev setup)
    
  rag_api:
    container_name: agentis-rag-api
    # ... (same as dev setup)
```

## 3. Docker Files

### API Dockerfile (Dockerfile.api)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY packages/data-provider/package*.json ./packages/data-provider/
COPY packages/mcp/package*.json ./packages/mcp/
COPY packages/data-schemas/package*.json ./packages/data-schemas/
COPY api/package*.json ./api/

# Install dependencies
RUN npm ci

# Build shared packages
COPY packages/data-provider ./packages/data-provider/
COPY packages/mcp ./packages/mcp/
COPY packages/data-schemas ./packages/data-schemas/
RUN npm run build:data-provider
RUN npm run build:mcp
RUN npm run build:data-schemas

# Copy API code
COPY api ./api
COPY config ./config
COPY ./librechat.yaml ./librechat.yaml

# Final image with only production dependencies
FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/api ./api
COPY --from=base /app/config ./config
COPY --from=base /app/librechat.yaml ./librechat.yaml

# Create necessary directories
RUN mkdir -p uploads logs

EXPOSE 3080
ENV HOST=0.0.0.0
CMD ["node", "api/server/index.js"]
```

### Client Dockerfile (Dockerfile.client)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY packages/data-provider/package*.json ./packages/data-provider/
COPY packages/mcp/package*.json ./packages/mcp/ 
COPY packages/data-schemas/package*.json ./packages/data-schemas/
COPY client/package*.json ./client/

# Install dependencies
RUN npm ci

# Build shared packages
COPY packages/data-provider ./packages/data-provider/
COPY packages/mcp ./packages/mcp/
COPY packages/data-schemas ./packages/data-schemas/
RUN npm run build:data-provider
RUN npm run build:mcp
RUN npm run build:data-schemas

# Build client
COPY client ./client
WORKDIR /app/client
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Nginx stage
FROM nginx:1.27.0-alpine
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 4. Understanding Nginx for Client Deployment

Nginx is a high-performance web server that's commonly used to serve static files and as a reverse proxy. In the LibreChat/Agentis setup, Nginx serves several important purposes:

1. **Static File Serving**: Efficiently serves the compiled React application files (HTML, CSS, JS)
2. **API Proxying**: Routes API requests to the backend Node.js service
3. **SSL Termination**: Handles HTTPS certificates and encryption (when configured)
4. **Performance Optimization**: Provides compression, caching, and other performance optimizations

The included `nginx.conf` file configures Nginx to:
- Serve requests on port 80 (HTTP)
- Proxy API requests starting with `/api/` to the API container
- Proxy all other requests to the API container (which serves the React app)
- Support SSL/HTTPS when properly configured (currently commented out)

### Why Use Nginx in Production?

1. **Performance**: Nginx is optimized for serving static content
2. **Security**: Provides an additional layer between users and your application code
3. **Scalability**: Can handle many concurrent connections efficiently
4. **Flexibility**: Easy to configure for various deployment scenarios

## 5. Implementation Steps

1. **Start with Development Setup**:
   - Implement the `docker-compose.dev.yml` file
   - Configure your local development to connect to these services

2. **Create Dockerfiles for Production**:
   - Implement the API and client Dockerfiles
   - Test building the containers locally

3. **Implement Production Compose**:
   - Create the full production Docker Compose file
   - Test the complete stack deployment locally

4. **Configure CI/CD**:
   - Set up automated builds for your Docker images
   - Deploy to staging/production environments

5. **Optimize for Your Needs**:
   - Adjust resource limits, restart policies, and other settings
   - Add health checks and monitoring

## 6. Additional Considerations

- **Environment Variables**: Use `.env` files for local development and secrets management
- **Persistent Volumes**: Ensure data is persisted correctly for databases
- **Backup Strategy**: Plan for database backups in production
- **Scaling**: Consider using Docker Swarm or Kubernetes for production scaling
- **Monitoring**: Add logging and monitoring solutions