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
  echo -e "  --build    Rebuild all packages (no server restart)"
  echo -e "  --data     Rebuild data-schemas package only"
  echo -e "  --provider Rebuild data-provider package only"
  echo -e "  --mcp      Rebuild mcp package only"
  echo -e "\nServer Options:"
  echo -e "  --frontend Restart frontend dev server (logs to logs/frontend.log)"
  echo -e "  --backend  Restart backend dev server (logs to logs/backend.log)"
  echo -e "  --stop     Stop all running dev servers"
  echo -e "  --kill-all-node  Kill ALL node processes (nuclear option)"
  echo -e "  --help     Show this help message"
  echo -e "\nExamples:"
  echo -e "  ./dev-rebuild.sh --build              # Just rebuild all packages"
  echo -e "  ./dev-rebuild.sh --provider           # Rebuild data-provider only"
  echo -e "  ./dev-rebuild.sh --provider --frontend # Rebuild and restart frontend"
  echo -e "  ./dev-rebuild.sh --stop               # Stop all running servers"
  echo -e "  ./dev-rebuild.sh --kill-all-node     # Kill ALL node processes"
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

# Handle stop servers request first (and exit if that's all that was requested)
if $STOP_SERVERS; then
  stop_all_servers
  if ! $REBUILD_DATA && ! $REBUILD_PROVIDER && ! $REBUILD_MCP && ! $RESTART_FRONTEND && ! $RESTART_BACKEND; then
    echo -e "${GREEN}Done!${NC}"
    exit 0
  fi
fi

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
  npm run frontend:dev > "$LOGS_DIR/frontend.log" 2>&1 &
  echo -e "${GREEN}Frontend server restarted (PID: $!)${NC}"
fi

# Restart backend dev server if needed
if $RESTART_BACKEND; then
  echo -e "${GREEN}Restarting backend dev server...${NC}"
  # Kill existing backend server (typically runs on port 3080)
  kill_process_on_port 3080 "backend server"
  # Start backend in the background
  npm run backend:dev > "$LOGS_DIR/backend.log" 2>&1 &
  echo -e "${GREEN}Backend server restarted (PID: $!)${NC}"
fi

if $DO_ALL; then
  echo -e "${GREEN}All packages rebuilt and servers restarted!${NC}"
  echo -e "${YELLOW}Frontend running on: http://localhost:3090+ (Vite auto-increments ports)${NC}"
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