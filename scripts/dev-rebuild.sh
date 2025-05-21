#!/bin/bash
# dev-rebuild.sh - Helper script for rebuilding packages during development

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print usage
function show_usage {
  echo -e "${GREEN}Agentis Development Helper Script${NC}"
  echo -e "Usage: ./dev-rebuild.sh [options]"
  echo -e "\nOptions:"
  echo -e "  --all      Rebuild all packages and restart dev servers"
  echo -e "  --data     Rebuild data-schemas package only"
  echo -e "  --provider Rebuild data-provider package only"
  echo -e "  --mcp      Rebuild mcp package only"
  echo -e "  --frontend Restart frontend dev server"
  echo -e "  --backend  Restart backend dev server"
  echo -e "  --help     Show this help message"
  echo -e "\nExample: ./dev-rebuild.sh --provider --frontend"
}

# Check if no arguments provided
if [ $# -eq 0 ]; then
  show_usage
  exit 1
fi

# Parse arguments
REBUILD_DATA=false
REBUILD_PROVIDER=false
REBUILD_MCP=false
RESTART_FRONTEND=false
RESTART_BACKEND=false
DO_ALL=false

for arg in "$@"; do
  case $arg in
    --all)
      DO_ALL=true
      REBUILD_DATA=true
      REBUILD_PROVIDER=true
      REBUILD_MCP=true
      RESTART_FRONTEND=true
      RESTART_BACKEND=true
      ;;
    --data)
      REBUILD_DATA=true
      ;;
    --provider)
      REBUILD_PROVIDER=true
      ;;
    --mcp)
      REBUILD_MCP=true
      ;;
    --frontend)
      RESTART_FRONTEND=true
      ;;
    --backend)
      RESTART_BACKEND=true
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      show_usage
      exit 1
      ;;
  esac
done

# Find the actual LibreChat directory
if [ -d "$(dirname "${BASH_SOURCE[0]}")/../LibreChat" ]; then
  # If running from scripts directory in parent folder
  LIBRECHAT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../LibreChat" && pwd)"
else
  # Try to find LibreChat directory
  for possible_path in \
    "$(dirname "${BASH_SOURCE[0]}")/../LibreChat" \
    "$(dirname "${BASH_SOURCE[0]}")/LibreChat" \
    "$(dirname "${BASH_SOURCE[0]}")" \
    "/Users/gannonhall/+DEV/agentis/LibreChat"; do
    if [ -f "$possible_path/package.json" ]; then
      LIBRECHAT_DIR="$(cd "$possible_path" && pwd)"
      break
    fi
  done
fi

# Verify LibreChat directory exists
if [ -z "$LIBRECHAT_DIR" ] || [ ! -f "$LIBRECHAT_DIR/package.json" ]; then
  echo -e "${RED}Error: Could not find LibreChat directory with package.json${NC}"
  echo -e "${YELLOW}Please run this script from within the LibreChat project or its parent directory${NC}"
  exit 1
fi

echo -e "${GREEN}Found LibreChat at: $LIBRECHAT_DIR${NC}"
cd "$LIBRECHAT_DIR"

# Function to find and kill process running on specific port
function kill_process_on_port {
  local port=$1
  local pid=$(lsof -t -i:$port)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
    kill -9 $pid
  fi
}

# Rebuild data-schemas if needed
if $REBUILD_DATA; then
  echo -e "${GREEN}Rebuilding data-schemas...${NC}"
  npm run build:data-schemas
fi

# Rebuild data-provider if needed
if $REBUILD_PROVIDER; then
  echo -e "${GREEN}Rebuilding data-provider...${NC}"
  npm run build:data-provider
fi

# Rebuild mcp if needed
if $REBUILD_MCP; then
  echo -e "${GREEN}Rebuilding mcp...${NC}"
  npm run build:mcp
fi

# Restart frontend dev server if needed
if $RESTART_FRONTEND; then
  echo -e "${GREEN}Restarting frontend dev server...${NC}"
  # Kill existing frontend server (typically runs on port 3000)
  kill_process_on_port 3000
  # Start frontend in the background
  npm run frontend:dev > frontend.log 2>&1 &
  echo -e "${GREEN}Frontend server restarted (PID: $!)${NC}"
fi

# Restart backend dev server if needed
if $RESTART_BACKEND; then
  echo -e "${GREEN}Restarting backend dev server...${NC}"
  # Kill existing backend server (typically runs on port 3080)
  kill_process_on_port 3080
  # Start backend in the background
  npm run backend:dev > backend.log 2>&1 &
  echo -e "${GREEN}Backend server restarted (PID: $!)${NC}"
fi

if $DO_ALL; then
  echo -e "${GREEN}All packages rebuilt and servers restarted!${NC}"
  echo -e "${YELLOW}Frontend running on: http://localhost:3000${NC}"
  echo -e "${YELLOW}Backend running on: http://localhost:3080${NC}"
fi

echo -e "${GREEN}Done!${NC}"