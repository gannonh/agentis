#!/usr/bin/env bash

# Database Utility Shell Wrapper
# Makes it easier to run the Node.js database utility CLI

set -e

# Define colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_UTIL_JS="$SCRIPT_DIR/db-util.js"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    exit 1
fi

# Check if the JavaScript file exists
if [ ! -f "$DB_UTIL_JS" ]; then
    echo -e "${RED}Error: Database utility script not found at $DB_UTIL_JS${NC}"
    exit 1
fi

# Help function
show_help() {
    echo -e "${CYAN}Database Utility CLI Wrapper${NC}"
    echo ""
    echo "Usage: ./db-util.sh [command]"
    echo ""
    echo "Commands:"
    echo "  delete-user      Interactive user deletion with optional organization cleanup"
    echo "  help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./db-util.sh delete-user"
    echo "  ./db-util.sh help"
    echo ""
}

# Main logic to handle commands
case "${1:-help}" in
    delete-user)
        echo -e "${YELLOW}🚀 Starting database utility...${NC}"
        node "$DB_UTIL_JS" delete-user
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