#!/bin/bash

# Google Workspace MCP Server Startup Script
# This script loads environment variables and starts the MCP server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${GREEN}🚀 Starting Google Workspace MCP Server${NC}"

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${RED}❌ Error: .env file not found in project root${NC}"
    exit 1
fi

# Load environment variables from .env
echo -e "${YELLOW}📋 Loading environment variables...${NC}"
set -a
source "$PROJECT_ROOT/.env"
set +a

# Check if MCP server directory exists
MCP_DIR="$PROJECT_ROOT/mcp-servers/google_workspace_mcp"
if [ ! -d "$MCP_DIR" ]; then
    echo -e "${RED}❌ Error: MCP server directory not found at $MCP_DIR${NC}"
    exit 1
fi

# Check if client_secret.json exists
if [ ! -f "$MCP_DIR/client_secret.json" ]; then
    echo -e "${RED}❌ Error: client_secret.json not found in $MCP_DIR${NC}"
    echo -e "${YELLOW}ℹ️  Please download OAuth credentials from Google Cloud Console${NC}"
    exit 1
fi

# Navigate to MCP server directory
cd "$MCP_DIR"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}📦 Virtual environment not found. Creating...${NC}"
    uv venv
fi

# Install dependencies if needed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
uv pip install -e . --quiet

# Display configuration
echo -e "${GREEN}✅ Configuration:${NC}"
echo -e "   Base URI: ${WORKSPACE_MCP_BASE_URI:-http://localhost}"
echo -e "   Port: ${WORKSPACE_MCP_PORT:-8000}"
echo -e "   OAuth Transport: ${OAUTHLIB_INSECURE_TRANSPORT:-Not set (HTTPS required)}"

# Start the MCP server
echo -e "${GREEN}🌐 Starting MCP server on port ${WORKSPACE_MCP_PORT:-8000}...${NC}"
echo -e "${YELLOW}ℹ️  OAuth callback URL: ${WORKSPACE_MCP_BASE_URI:-http://localhost}:${WORKSPACE_MCP_PORT:-8000}/oauth2callback${NC}"
echo ""

# Run the server
uv run main.py "$@"