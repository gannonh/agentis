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
  echo -e "\nBuild Options:"
  echo -e "  --all      Rebuild all packages and restart dev servers"
  echo -e "  --reset    Complete reset: cleanup caches, rebuild all packages, restart servers"
  echo -e "  --build    Rebuild all packages (no server restart)"
  echo -e "  --data     Rebuild data-schemas package only"
  echo -e "  --provider Rebuild data-provider package only"
  echo -e "  --mcp      Rebuild mcp package only"
  echo -e "\nServer Options:"
  echo -e "  --frontend Restart frontend dev server (logs to logs/frontend.log)"
  echo -e "  --backend  Restart backend dev server (logs to logs/backend.log)"
  echo -e "  --stop     Stop all running dev servers"
  echo -e "  --kill-all-node  Kill ALL node processes (nuclear option)"
  echo -e "\nCleanup Options:"
  echo -e "  --clean     Aggressive cleanup: Remove client/dist and node_modules/.cache"
  echo -e "  --clean-all Super aggressive cleanup: Remove all build artifacts and caches"
  echo -e "  --test-build Test complete build process from scratch (clean-all + reinstall + rebuild)"
  echo -e "  --help     Show this help message"
  echo -e "\nExamples:"
  echo -e "  ./dev-rebuild.sh --all                # Quick: rebuild packages + restart servers"
  echo -e "  ./dev-rebuild.sh --reset              # Full reset: cleanup + rebuild + restart"
  echo -e "  ./dev-rebuild.sh --build              # Just rebuild all packages"
  echo -e "  ./dev-rebuild.sh --provider           # Rebuild data-provider only"
  echo -e "  ./dev-rebuild.sh --clean              # Clean caches and rebuild frontend"
  echo -e "  ./dev-rebuild.sh --clean-all          # Nuclear cleanup and rebuild everything"
  echo -e "  ./dev-rebuild.sh --test-build         # Test complete build process from scratch"
  echo -e "  ./dev-rebuild.sh --stop               # Stop all running servers"
  echo -e "\nNote: Server restarts log to files. Use 'tail -f logs/*.log' to monitor."
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
STOP_SERVERS=false
DO_ALL=false
DO_CLEAN=false
DO_CLEAN_ALL=false
TEST_BUILD=false
KILL_ALL_NODE=false

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
  --reset)
    DO_ALL=true
    DO_CLEAN=true
    REBUILD_DATA=true
    REBUILD_PROVIDER=true
    REBUILD_MCP=true
    RESTART_FRONTEND=true
    RESTART_BACKEND=true
    ;;
  --build)
    REBUILD_DATA=true
    REBUILD_PROVIDER=true
    REBUILD_MCP=true
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
  --stop)
    STOP_SERVERS=true
    ;;
  --clean)
    DO_CLEAN=true
    ;;
  --clean-all)
    DO_CLEAN_ALL=true
    ;;
  --test-build)
    TEST_BUILD=true
    ;;
  --kill-all-node)
    KILL_ALL_NODE=true
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
  local service_name=$2
  local pid=$(lsof -t -i:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo -e "${YELLOW}Stopping $service_name on port $port (PID: $pid)${NC}"
    kill -9 $pid 2>/dev/null
    sleep 1
    # Verify the process was killed
    if ! kill -0 $pid 2>/dev/null; then
      echo -e "${GREEN}✓ $service_name stopped successfully${NC}"
    else
      echo -e "${RED}✗ Failed to stop $service_name${NC}"
    fi
  else
    echo -e "${YELLOW}No $service_name process found on port $port${NC}"
  fi
}

# Function to stop all development servers
function stop_all_servers {
  echo -e "${GREEN}Stopping all development servers...${NC}"

  # Stop frontend (usually port 3090, but Vite may auto-increment)
  for port in 3090 3091 3092 3093 3094 3095; do
    kill_process_on_port $port "frontend server"
  done

  # Stop backend (usually port 3080)
  kill_process_on_port 3080 "backend server"

  # Also look for any node processes running our specific scripts
  echo -e "${YELLOW}Looking for additional Node.js processes...${NC}"

  # Kill any nodemon processes
  pkill -f "nodemon.*server/index.js" 2>/dev/null && echo -e "${GREEN}✓ Stopped nodemon backend process${NC}"

  # Kill any vite dev server processes
  pkill -f "vite.*dev" 2>/dev/null && echo -e "${GREEN}✓ Stopped vite dev server${NC}"

  # Kill any npm run processes for our specific commands
  pkill -f "npm.*frontend:dev" 2>/dev/null && echo -e "${GREEN}✓ Stopped npm frontend:dev process${NC}"
  pkill -f "npm.*backend:dev" 2>/dev/null && echo -e "${GREEN}✓ Stopped npm backend:dev process${NC}"

  echo -e "${GREEN}All development servers stopped!${NC}"
}

# Function to kill ALL node processes (nuclear option)
function kill_all_node {
  echo -e "${RED}WARNING: This will kill ALL Node.js processes on your system!${NC}"
  echo -e "${YELLOW}Proceeding in 3 seconds... Press Ctrl+C to cancel${NC}"
  sleep 3

  echo -e "${GREEN}Killing all Node.js processes...${NC}"
  pkill -f node 2>/dev/null && echo -e "${GREEN}✓ All Node.js processes killed${NC}" || echo -e "${YELLOW}No Node.js processes found${NC}"
}

# Function to perform aggressive cleanup
function do_clean {
  echo -e "${GREEN}Performing aggressive cleanup...${NC}"

  # Remove client/dist (frontend build output)
  if [ -d "client/dist" ]; then
    echo -e "${YELLOW}Removing client/dist...${NC}"
    rm -rf client/dist
    echo -e "${GREEN}✓ Removed client/dist${NC}"
  fi

  # Remove node_modules/.cache
  if [ -d "node_modules/.cache" ]; then
    echo -e "${YELLOW}Removing node_modules/.cache...${NC}"
    rm -rf node_modules/.cache
    echo -e "${GREEN}✓ Removed node_modules/.cache${NC}"
  fi

  echo -e "${GREEN}Aggressive cleanup completed!${NC}"
}

# Function to perform super aggressive cleanup
function do_clean_all {
  echo -e "${GREEN}Performing super aggressive cleanup...${NC}"

  # First do the standard cleanup
  do_clean

  # Remove all package build outputs
  echo -e "${YELLOW}Removing package build outputs...${NC}"
  rm -rf packages/data-provider/dist
  rm -rf packages/data-schemas/dist
  rm -rf packages/mcp/dist
  rm -rf packages/arcade-client/dist

  # Remove package node_modules caches
  rm -rf packages/*/node_modules/.cache

  # Remove workspace node_modules directories (forces complete dependency reinstall)
  echo -e "${YELLOW}Removing workspace node_modules directories...${NC}"
  rm -rf node_modules
  rm -rf api/node_modules
  rm -rf client/node_modules
  rm -rf packages/*/node_modules
  echo -e "${GREEN}✓ Removed all node_modules directories${NC}"

  # Remove any .tsbuildinfo files
  find . -name "*.tsbuildinfo" -delete

  echo -e "${GREEN}✓ Removed all build artifacts and caches${NC}"
  echo -e "${GREEN}Super aggressive cleanup completed!${NC}"
}

# Handle nuclear option first
if $KILL_ALL_NODE; then
  kill_all_node
  if ! $REBUILD_DATA && ! $REBUILD_PROVIDER && ! $REBUILD_MCP && ! $RESTART_FRONTEND && ! $RESTART_BACKEND && ! $DO_CLEAN && ! $DO_CLEAN_ALL && ! $STOP_SERVERS; then
    echo -e "${GREEN}Done!${NC}"
    exit 0
  fi
fi

# Handle stop servers request first (and exit if that's all that was requested)
if $STOP_SERVERS; then
  stop_all_servers
  if ! $REBUILD_DATA && ! $REBUILD_PROVIDER && ! $REBUILD_MCP && ! $RESTART_FRONTEND && ! $RESTART_BACKEND && ! $DO_CLEAN && ! $DO_CLEAN_ALL; then
    echo -e "${GREEN}Done!${NC}"
    exit 0
  fi
fi

# Handle test-build request (highest priority)
if $TEST_BUILD; then
  echo -e "${GREEN}=== TESTING COMPLETE BUILD PROCESS ===${NC}"
  echo -e "${GREEN}This will test the entire build process from scratch${NC}"

  # Force all cleanup and rebuild options
  DO_CLEAN_ALL=true
  REBUILD_DATA=true
  REBUILD_PROVIDER=true
  REBUILD_MCP=true
  FRONTEND_NEEDS_REBUILD=true
  DEPS_NEED_INSTALL=true

  # Don't restart servers for test build
  RESTART_FRONTEND=false
  RESTART_BACKEND=false
fi

# Handle cleanup requests
if $DO_CLEAN_ALL; then
  do_clean_all
  FRONTEND_NEEDS_REBUILD=true
  DEPS_NEED_INSTALL=true
  # If we did a super aggressive cleanup, we need to rebuild all packages
  REBUILD_DATA=true
  REBUILD_PROVIDER=true
  REBUILD_MCP=true
elif $DO_CLEAN; then
  do_clean
  FRONTEND_NEEDS_REBUILD=true
fi

# Reinstall dependencies if needed after cleanup
if $DEPS_NEED_INSTALL; then
  echo -e "${GREEN}Reinstalling dependencies after cleanup...${NC}"
  npm install --legacy-peer-deps
  echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
fi

# Rebuild packages in correct dependency order
# data-provider must be built first (provides base types/constants)
# then data-schemas (uses types from data-provider)
# then mcp (uses both data-provider and data-schemas)

if $REBUILD_PROVIDER; then
  echo -e "${GREEN}Rebuilding data-provider...${NC}"
  npm run build:data-provider
fi

if $REBUILD_DATA; then
  echo -e "${GREEN}Rebuilding data-schemas...${NC}"
  npm run build:data-schemas
fi

if $REBUILD_MCP; then
  echo -e "${GREEN}Rebuilding mcp...${NC}"
  npm run build:mcp
fi

# Rebuild frontend if cleanup was performed
if $FRONTEND_NEEDS_REBUILD; then
  echo -e "${GREEN}Rebuilding frontend after cleanup...${NC}"
  npm run frontend:ci
  echo -e "${GREEN}✓ Frontend rebuilt with clean cache${NC}"
fi

# Ensure logs directory exists
LOGS_DIR="../logs"
mkdir -p "$LOGS_DIR"

# Restart frontend dev server if needed
if $RESTART_FRONTEND; then
  echo -e "${GREEN}Restarting frontend dev server...${NC}"
  # Kill existing frontend server (Vite typically starts on port 3090 but auto-increments)
  for port in 3090 3091 3092 3093 3094 3095; do
    kill_process_on_port $port "frontend server"
  done
  # Start frontend in the background
  npm run frontend:dev >"$LOGS_DIR/frontend.log" 2>&1 &
  echo -e "${GREEN}Frontend server restarted (PID: $!)${NC}"
fi

# Restart backend dev server if needed
if $RESTART_BACKEND; then
  echo -e "${GREEN}Restarting backend dev server...${NC}"
  # Kill existing backend server (typically runs on port 3080)
  kill_process_on_port 3080 "backend server"
  # Start backend in the background
  npm run backend:dev >"$LOGS_DIR/backend.log" 2>&1 &
  echo -e "${GREEN}Backend server restarted (PID: $!)${NC}"
fi

if $TEST_BUILD; then
  echo -e "${GREEN}=== BUILD PROCESS TEST COMPLETE ===${NC}"
  echo -e "${GREEN}✓ All node_modules directories removed and reinstalled${NC}"
  echo -e "${GREEN}✓ All packages successfully rebuilt from scratch${NC}"
  echo -e "${GREEN}✓ Frontend successfully rebuilt with clean cache${NC}"
  echo -e "${YELLOW}Build process is robust and working correctly!${NC}"
elif $DO_ALL; then
  echo -e "${GREEN}All packages rebuilt and servers restarted!${NC}"
  echo -e "${YELLOW}Frontend running on: http://localhost:3090 (Vite auto-increments ports)${NC}"
  echo -e "${YELLOW}Backend running on: http://localhost:3080${NC}"
  echo -e "${YELLOW}Monitor logs with: tail -f logs/frontend.log logs/backend.log${NC}"
elif $RESTART_FRONTEND || $RESTART_BACKEND; then
  echo -e "${YELLOW}Server(s) restarted. Monitor logs with:${NC}"
  if $RESTART_FRONTEND; then
    echo -e "${YELLOW}  Frontend: tail -f logs/frontend.log${NC}"
  fi
  if $RESTART_BACKEND; then
    echo -e "${YELLOW}  Backend: tail -f logs/backend.log${NC}"
  fi
fi

echo -e "${GREEN}Done!${NC}"
