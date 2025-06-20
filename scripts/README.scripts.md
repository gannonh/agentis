# Agentis Scripts

This folder contains utility scripts for managing Docker services and other development tools for the Agentis project.

## Development Scripts

### db-util.js / db-util.sh

An interactive database utility CLI for managing users and organizations during development. Provides safe cleanup operations with confirmation prompts.

```bash
# Show help message
./db-util.sh help

# Interactive user deletion with optional organization cleanup
./db-util.sh delete-user

# Or use the Node.js script directly
node scripts/db-util.js delete-user
```

**Features:**
- **Interactive email-based user lookup** - Find users by email address
- **Comprehensive user information display** - Shows user details before deletion
- **Organization membership detection** - Automatically detects if user belongs to an organization
- **Smart organization cleanup** - Option to delete organization if user is the only member
- **Member count warnings** - Warns when deleting organizations with multiple members
- **Simple confirmation prompts** - Just requires y/n to confirm destructive actions
- **COMPLETE data cleanup** - Removes user from ALL 17+ collections:
  - LibreChat: user, conversations, messages, files, presets, assistants, agents, actions, shared links, tags, balances, API keys, connected accounts, projects, transactions
  - Better Auth: provider accounts, sessions, organization memberships, invitations

**Safety Features:**
- Multiple confirmation steps
- Clear warnings about permanent data loss
- Shows affected organization members
- Simple y/n confirmation for final deletion step
- Shows total number of records deleted

⚠️ **Warning: This tool permanently deletes data. Use only in development environments!**

### dev-rebuild.sh

A utility script for rebuilding npm packages and restarting development servers. This simplifies the development workflow when working with shared packages in the monorepo structure.

```bash
# Show script usage
./dev-rebuild.sh --help

# Rebuild all packages and restart all servers
./dev-rebuild.sh --all

# Rebuild specific packages
./dev-rebuild.sh --data --provider --mcp

# Restart specific servers
./dev-rebuild.sh --frontend --backend 

# Rebuild a specific package and restart frontend
./dev-rebuild.sh --provider --frontend
```

**Available Options:**
- `--all`: Rebuild all packages and restart all servers
- `--data`: Rebuild data-schemas package only
- `--provider`: Rebuild data-provider package only  
- `--mcp`: Rebuild mcp package only
- `--frontend`: Restart frontend dev server
- `--backend`: Restart backend dev server
- `--help`: Show the help message

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
node scripts/concat-md.js /Users/gannonhall/dev/agentis/Docs/arcade/arcade-docs
```

## Docker CLI Tool

The `docker-cli.sh` script provides a simple command-line interface for managing all the Docker services required for Agentis development.

### Usage

```bash
./docker-cli.sh [command] [service]
```

### Available Commands

| Command             | Description                                 |
| ------------------- | ------------------------------------------- |
| `start [service]`   | Start all or specific service               |
| `stop [service]`    | Stop all or specific service                |
| `restart [service]` | Restart all or specific service             |
| `status [service]`  | Check the status of all or specific service |
| `logs [service]`    | Show logs for all or specific service       |
| `shell <service>`   | Open shell in a specific container          |
| `mongo-shell`       | Open MongoDB shell                          |
| `backup`            | Create a backup of MongoDB data             |
| `restore <file>`    | Restore MongoDB from a backup file          |
| `help`              | Show help message                           |

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