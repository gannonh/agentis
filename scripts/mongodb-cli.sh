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
COMPOSE_FILE="$PROJECT_ROOT/mongodb-compose.yml"

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed.${NC}"
    exit 1
fi

# Help function
show_help() {
    echo -e "${GREEN}MongoDB CLI - Management script for MongoDB Docker container${NC}"
    echo ""
    echo "Usage: ./mongodb-cli.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       - Start MongoDB container"
    echo "  stop        - Stop MongoDB container"
    echo "  restart     - Restart MongoDB container"
    echo "  status      - Check MongoDB container status"
    echo "  logs        - Show container logs"
    echo "  shell       - Open MongoDB shell"
    echo "  backup      - Create a backup of MongoDB data"
    echo "  restore     - Restore from a backup file"
    echo "  help        - Show this help message"
    echo ""
}

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: MongoDB compose file not found at $COMPOSE_FILE${NC}"
    exit 1
fi

# Function to start the container
start_container() {
    echo -e "${YELLOW}Starting MongoDB container...${NC}"
    docker-compose -f "$COMPOSE_FILE" up -d
    echo -e "${GREEN}MongoDB container started successfully.${NC}"
    echo -e "Connect using: ${YELLOW}mongodb://admin:password@localhost:27017/${NC}"
}

# Function to stop the container
stop_container() {
    echo -e "${YELLOW}Stopping MongoDB container...${NC}"
    docker-compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}MongoDB container stopped.${NC}"
}

# Function to restart the container
restart_container() {
    echo -e "${YELLOW}Restarting MongoDB container...${NC}"
    docker-compose -f "$COMPOSE_FILE" restart
    echo -e "${GREEN}MongoDB container restarted.${NC}"
}

# Function to check container status
check_status() {
    echo -e "${YELLOW}Checking MongoDB container status...${NC}"
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "mongodb"; then
        echo -e "${GREEN}MongoDB container is running.${NC}"
        docker-compose -f "$COMPOSE_FILE" ps
    else
        echo -e "${RED}MongoDB container is not running.${NC}"
    fi
}

# Function to show container logs
show_logs() {
    echo -e "${YELLOW}Showing MongoDB container logs...${NC}"
    docker-compose -f "$COMPOSE_FILE" logs --tail=100 -f mongodb
}

# Function to open MongoDB shell
open_shell() {
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
        echo "Usage: ./mongodb-cli.sh restore <backup_file>"
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
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs
        ;;
    shell)
        open_shell
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