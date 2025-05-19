# Agentis Scripts

This folder contains utility scripts for managing Docker services and other development tools for the Agentis project.

## Documentation Tools

### generate-docs-index.js

A utility script that scans the project directories for markdown files and generates a comprehensive index in `Docs/index.md`. This helps developers find and navigate documentation files more easily.

```bash
# Run with default depth (3 levels)
node scripts/generate-docs-index.js

# Run with custom depth
node scripts/generate-docs-index.js 4
```

### md-symlinks.js

Creates symbolic links to all Markdown files in the project, placing them in the `Docs/sym-links` directory for easy reference.

### concat-md.js

Concatenates all markdown files in a specified directory into a single comprehensive file. The output file is named `_FULL-[directory_name].md` and includes a table of contents.

```bash
# Concatenate all markdown files in a directory
node scripts/concat-md.js /path/to/directory

# Example
node scripts/concat-md.js /Users/gannonhall/+DEV/agentis/Docs/arcade/arcade-docs
```

## Docker CLI Tool

The `docker-cli.sh` script provides a simple command-line interface for managing all the Docker services required for Agentis development.

### Usage

```bash
./docker-cli.sh [command] [service]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `start [service]` | Start all or specific service |
| `stop [service]` | Stop all or specific service |
| `restart [service]` | Restart all or specific service |
| `status [service]` | Check the status of all or specific service |
| `logs [service]` | Show logs for all or specific service |
| `shell <service>` | Open shell in a specific container |
| `mongo-shell` | Open MongoDB shell |
| `backup` | Create a backup of MongoDB data |
| `restore <file>` | Restore MongoDB from a backup file |
| `help` | Show help message |

### Available Services

The docker-compose.dev.yml file includes the following services:

1. **mongodb** - MongoDB database for storing user data, conversations, and other application data
2. **meilisearch** - Search engine for conversation search functionality 
3. **vectordb** - Vector database powered by PGVector for RAG capabilities
4. **rag_api** - Retrieval-Augmented Generation API for document processing
5. **sandpack** - Code execution environment for running code snippets in the chat

### Examples

Start all services:
```bash
./docker-cli.sh start
```

Start only the MongoDB service:
```bash
./docker-cli.sh start mongodb
```

Check status of all services:
```bash
./docker-cli.sh status
```

View logs for the RAG API:
```bash
./docker-cli.sh logs rag_api
```

Open a shell in the Meilisearch container:
```bash
./docker-cli.sh shell meilisearch
```

Create a MongoDB backup:
```bash
./docker-cli.sh backup
```

Restore from a backup:
```bash
./docker-cli.sh restore /path/to/backup/file.gz
```

### Service Connection Details

- **MongoDB**
  - Host: localhost:27017
  - Username: admin
  - Password: password
  - Database: Agentis
  - Connection String: `mongodb://admin:password@localhost:27017/Agentis?authSource=admin`
  - Auth Source: admin (required parameter)

- **Meilisearch**
  - URL: http://localhost:7700
  - Master Key: Set in `.env` as MEILI_MASTER_KEY

- **Vector Database (PGVector)**
  - Host: localhost:5432
  - Database: mydatabase
  - Username: myuser
  - Password: mypassword

- **RAG API**
  - URL: http://localhost:8000
  
- **Sandpack**
  - URL: http://localhost:8080

## Development Workflow

For local development:

1. Ensure your `.env.docker` file in the LibreChat directory contains the necessary API keys and database configuration:
   ```
   # OpenAI API Key for RAG functionality
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Database configuration (must match these exact values)
   DB_HOST=db
   DB_PORT=5432
   DB_USER=myuser
   DB_PASSWORD=mypassword
   DB_NAME=mydatabase
   ```

2. Start the required Docker services:
   ```bash
   ./docker-cli.sh start
   ```

3. Run the Agentis API and client applications in development mode.

4. The API will connect to the Docker services using the connection details in the `.env` file.

> **Note**: For production use, please change the default credentials in the Docker Compose file and environment variables.