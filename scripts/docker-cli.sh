#!/usr/bin/env bash

set -e

# Define colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/LibreChat/docker-compose.dev.yml"

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi

# Help function
show_help() {
    echo -e "${GREEN}Docker CLI - Management script for Agentis Docker services${NC}"
    echo ""
    echo "Usage: ./docker-cli.sh [command] [service]"
    echo ""
    echo "Commands:"
    echo "  start       - Start all or specific service (mongodb, meilisearch, vectordb, rag_api, sandpack)"
    echo "  stop        - Stop all or specific service"
    echo "  restart     - Restart all or specific service"
    echo "  status      - Check status of all or specific service"
    echo "  logs        - Show logs for all or specific service"
    echo "  shell       - Open shell in a specific container"
    echo "  mongo-shell - Open MongoDB shell"
    echo "  backup      - Create a backup of MongoDB data"
    echo "  restore     - Restore MongoDB from a backup file"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./docker-cli.sh start            - Start all services"
    echo "  ./docker-cli.sh start mongodb    - Start only MongoDB service"
    echo "  ./docker-cli.sh logs rag_api     - Show logs for RAG API service"
    echo ""
}

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: Docker compose file not found at $COMPOSE_FILE${NC}"
    exit 1
fi

# Function to start container(s)
start_services() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Starting all services...${NC}"
        docker-compose -f "$COMPOSE_FILE" up -d
        echo -e "${GREEN}All services started successfully.${NC}"
    else
        echo -e "${YELLOW}Starting $1 service...${NC}"
        docker-compose -f "$COMPOSE_FILE" up -d "$1"
        echo -e "${GREEN}Service $1 started successfully.${NC}"
    fi
    
    # Print connection information
    if [ -z "$1" ] || [ "$1" = "mongodb" ]; then
        echo -e "MongoDB connection: ${YELLOW}mongodb://admin:password@localhost:27017/Agentis?authSource=admin${NC}"
    fi
    if [ -z "$1" ] || [ "$1" = "meilisearch" ]; then
        echo -e "Meilisearch URL: ${YELLOW}http://localhost:7700/${NC}"
    fi
    if [ -z "$1" ] || [ "$1" = "rag_api" ]; then
        echo -e "RAG API URL: ${YELLOW}http://localhost:8000/${NC}"
    fi
    if [ -z "$1" ] || [ "$1" = "sandpack" ]; then
        echo -e "Sandpack URL: ${YELLOW}http://localhost:8080/${NC}"
    fi
}

# Function to stop container(s)
stop_services() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Stopping all services...${NC}"
        docker-compose -f "$COMPOSE_FILE" down
        echo -e "${GREEN}All services stopped.${NC}"
    else
        echo -e "${YELLOW}Stopping $1 service...${NC}"
        docker-compose -f "$COMPOSE_FILE" stop "$1"
        echo -e "${GREEN}Service $1 stopped.${NC}"
    fi
}

# Function to restart container(s)
restart_services() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Restarting all services...${NC}"
        docker-compose -f "$COMPOSE_FILE" restart
        echo -e "${GREEN}All services restarted.${NC}"
    else
        echo -e "${YELLOW}Restarting $1 service...${NC}"
        docker-compose -f "$COMPOSE_FILE" restart "$1"
        echo -e "${GREEN}Service $1 restarted.${NC}"
    fi
}

# Function to check container(s) status
check_status() {
    echo -e "${YELLOW}Checking services status...${NC}"
    docker-compose -f "$COMPOSE_FILE" ps "$1"
}

# Function to show container logs
show_logs() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Showing logs for all services...${NC}"
        docker-compose -f "$COMPOSE_FILE" logs --tail=100 -f
    else
        echo -e "${YELLOW}Showing logs for $1 service...${NC}"
        docker-compose -f "$COMPOSE_FILE" logs --tail=100 -f "$1"
    fi
}

# Function to open shell in container
open_shell() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: No service specified for shell.${NC}"
        echo "Usage: ./docker-cli.sh shell <service>"
        exit 1
    fi
    
    echo -e "${YELLOW}Opening shell in $1 container...${NC}"
    docker-compose -f "$COMPOSE_FILE" exec "$1" sh
}

# Function to open MongoDB shell
open_mongo_shell() {
    echo -e "${YELLOW}Opening MongoDB shell...${NC}"
    docker-compose -f "$COMPOSE_FILE" exec mongodb mongosh --username admin --password password
}

# Function to backup MongoDB data
backup_db() {
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/mongodb_backup_$TIMESTAMP.gz"
    
    echo -e "${YELLOW}Creating backup of MongoDB data...${NC}"
    docker-compose -f "$COMPOSE_FILE" exec -T mongodb mongodump --username admin --password password --archive --gzip > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Backup created successfully at:${NC} $BACKUP_FILE"
    else
        echo -e "${RED}Backup failed.${NC}"
        exit 1
    fi
}

# Function to restore MongoDB data
restore_db() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: No backup file specified.${NC}"
        echo "Usage: ./docker-cli.sh restore <backup_file>"
        exit 1
    fi
    
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Restoring MongoDB data from backup...${NC}"
    cat "$BACKUP_FILE" | docker-compose -f "$COMPOSE_FILE" exec -T mongodb mongorestore --username admin --password password --archive --gzip
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Restore completed successfully.${NC}"
    else
        echo -e "${RED}Restore failed.${NC}"
        exit 1
    fi
}

# Main logic to handle commands
case "$1" in
    start)
        start_services "$2"
        ;;
    stop)
        stop_services "$2"
        ;;
    restart)
        restart_services "$2"
        ;;
    status)
        check_status "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    shell)
        open_shell "$2"
        ;;
    mongo-shell)
        open_mongo_shell
        ;;
    backup)
        backup_db
        ;;
    restore)
        restore_db "$2"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac

exit 0