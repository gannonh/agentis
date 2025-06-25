#!/bin/bash
# dev.sh - Development helper script for Agentis

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize all flags to false
REBUILD_DATA_SCHEMAS=false
REBUILD_DATA_PROVIDER=false
REBUILD_MCP=false
REBUILD_ARCADE=false
REBUILD_FRONTEND=false
RESTART_FRONTEND=false
RESTART_BACKEND=false
STOP_SERVERS=false
DO_CLEAN=false
DO_CLEAN_ALL=false
DO_PREFLIGHT=false
KILL_ALL_NODE=false
REINSTALL_DEPS=false

# Print usage information
function show_usage {
  echo -e "${GREEN}Agentis Development Helper Script${NC}"
  echo -e "Usage: ./dev.sh [options]"
  echo -e ""
  echo -e "${BLUE}Common Development Commands:${NC}"
  echo -e "  --dev          ${GREEN}[MOST COMMON]${NC} Full dev restart: stop servers, rebuild packages, start servers"
  echo -e "  --rebuild      Rebuild all packages AND frontend (no server changes)"
  echo -e "  --restart      Restart both dev servers only (no rebuilding)"
  echo -e "  --stop         Stop all running dev servers"
  echo -e ""
  echo -e "${BLUE}Package Building:${NC}"
  echo -e "  --data-schemas    Rebuild data-schemas package only"
  echo -e "  --data-provider   Rebuild data-provider package only"
  echo -e "  --mcp            Rebuild mcp package only"
  echo -e "  --arcade         Rebuild arcade-client package only"
  echo -e "  --frontend-build Build frontend for production only"
  echo -e "  --packages       Rebuild all packages only (excludes frontend)"
  echo -e ""
  echo -e "${BLUE}Server Management:${NC}"
  echo -e "  --frontend     Restart frontend dev server only"
  echo -e "  --backend      Restart backend dev server only"
  echo -e "  --logs         Show command to monitor server logs"
  echo -e ""
  echo -e "${BLUE}Cleanup Operations:${NC}"
  echo -e "  --clean        Remove caches only (client/dist, node_modules/.cache)"
  echo -e "  --clean-build  Clean caches, then rebuild everything"
  echo -e "  --reset        Nuclear reset: clean all, reinstall deps, rebuild all, restart"
  echo -e ""
  echo -e "${BLUE}Quality Assurance:${NC}"
  echo -e "  --preflight    Run full CI/CD pipeline locally (clean, build, lint, test, e2e)"
  echo -e "  --test-build   Test the build process from scratch (useful for CI debugging)"
  echo -e ""
  echo -e "${BLUE}Emergency Options:${NC}"
  echo -e "  --kill-node    Kill ALL Node.js processes on your system (use with caution!)"
  echo -e ""
  echo -e "  --help         Show this help message"
  echo -e ""
  echo -e "${YELLOW}Examples:${NC}"
  echo -e "  ./dev.sh --dev                # Full restart (most common for development)"
  echo -e "  ./dev.sh --data-provider      # Rebuild only data-provider package"
  echo -e "  ./dev.sh --restart            # Just restart servers (after manual changes)"
  echo -e "  ./dev.sh --clean-build        # Clean and rebuild when things get weird"
  echo -e "  ./dev.sh --preflight          # Check if code is ready for PR/deployment"
  echo -e ""
  echo -e "${YELLOW}Notes:${NC}"
  echo -e "  - Servers log to logs/frontend.log and logs/backend.log"
  echo -e "  - Package build order: data-provider → data-schemas → mcp → arcade-client"
  echo -e "  - Run from project root or scripts directory"
}

# Function to find LibreChat directory
function find_librechat_dir {
  local possible_paths=(
    "$(dirname "${BASH_SOURCE[0]}")/../LibreChat"
    "$(dirname "${BASH_SOURCE[0]}")/LibreChat"
    "./LibreChat"
    "../LibreChat"
    "/Users/gannonhall/dev/agentis/LibreChat"
  )

  for path in "${possible_paths[@]}"; do
    if [ -f "$path/package.json" ]; then
      echo "$(cd "$path" && pwd)"
      return 0
    fi
  done

  return 1
}

# Function to kill process on specific port
function kill_process_on_port {
  local port=$1
  local service_name=$2
  local pid=$(lsof -t -i:$port 2>/dev/null)

  if [ -n "$pid" ]; then
    echo -e "${YELLOW}Stopping $service_name on port $port (PID: $pid)${NC}"
    kill -9 $pid 2>/dev/null
    sleep 0.5

    if ! kill -0 $pid 2>/dev/null; then
      echo -e "${GREEN}✓ $service_name stopped${NC}"
    else
      echo -e "${RED}✗ Failed to stop $service_name${NC}"
    fi
  fi
}

# Function to stop all dev servers
function stop_all_servers {
  echo -e "${BLUE}Stopping all development servers...${NC}"

  # Stop frontend servers (Vite auto-increments ports)
  local frontend_stopped=false
  for port in 3090 3091 3092 3093 3094 3095; do
    if lsof -t -i:$port >/dev/null 2>&1; then
      kill_process_on_port $port "frontend"
      frontend_stopped=true
    fi
  done

  # Stop backend server
  kill_process_on_port 3080 "backend"

  # Kill any lingering processes
  pkill -f "nodemon.*server/index.js" 2>/dev/null
  pkill -f "vite.*dev" 2>/dev/null
  pkill -f "npm.*frontend:dev" 2>/dev/null
  pkill -f "npm.*backend:dev" 2>/dev/null

  echo -e "${GREEN}✓ All servers stopped${NC}"
}

# Function to clean caches only
function clean_caches {
  echo -e "${BLUE}Cleaning caches...${NC}"

  if [ -d "client/dist" ]; then
    rm -rf client/dist
    echo -e "${GREEN}✓ Removed client/dist${NC}"
  fi

  if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo -e "${GREEN}✓ Removed node_modules/.cache${NC}"
  fi

  # Clean package caches too
  rm -rf packages/*/node_modules/.cache 2>/dev/null
}

# Function to clean all build artifacts
function clean_all_artifacts {
  echo -e "${BLUE}Removing all build artifacts...${NC}"

  # First clean caches
  clean_caches

  # Remove package builds
  rm -rf packages/data-provider/dist
  rm -rf packages/data-schemas/dist
  rm -rf packages/mcp/dist
  rm -rf packages/arcade-client/dist

  # Remove TypeScript build info
  find . -name "*.tsbuildinfo" -delete

  # Remove all node_modules (this is the nuclear option)
  rm -rf node_modules
  rm -rf api/node_modules
  rm -rf client/node_modules
  rm -rf packages/*/node_modules

  echo -e "${GREEN}✓ All build artifacts removed${NC}"
}

# Function to reinstall dependencies
function reinstall_dependencies {
  echo -e "${BLUE}Installing dependencies...${NC}"
  npm ci --legacy-peer-deps
  echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Function to rebuild a specific package
function rebuild_package {
  local package_name=$1
  local npm_script=$2

  echo -e "${BLUE}Building ${package_name}...${NC}"
  npm run "$npm_script"
  echo -e "${GREEN}✓ ${package_name} built${NC}"
}

# Function to rebuild frontend
function rebuild_frontend {
  echo -e "${BLUE}Building frontend for production...${NC}"
  npm run frontend
  echo -e "${GREEN}✓ Frontend built${NC}"
}

# Function to rebuild all packages in correct order
function rebuild_all_packages {
  echo -e "${BLUE}Rebuilding all packages in dependency order...${NC}"

  # Build order matters due to dependencies
  rebuild_package "data-provider" "build:data-provider"
  rebuild_package "data-schemas" "build:data-schemas"
  rebuild_package "mcp" "build:mcp"

  # Arcade client is independent
  if [ -d "packages/arcade-client" ]; then
    rebuild_package "arcade-client" "build:arcade-client"
  fi
}

# Function to start dev servers
function start_dev_servers {
  local start_frontend=$1
  local start_backend=$2

  # Ensure logs directory exists
  mkdir -p "../logs"

  if [ "$start_frontend" = true ]; then
    echo -e "${BLUE}Starting frontend dev server...${NC}"
    # Kill any existing frontend servers first
    for port in 3090 3091 3092 3093 3094 3095; do
      kill_process_on_port $port "frontend" >/dev/null 2>&1
    done

    npm run frontend:dev >"../logs/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo -e "${GREEN}✓ Frontend server started (PID: $frontend_pid)${NC}"
  fi

  if [ "$start_backend" = true ]; then
    echo -e "${BLUE}Starting backend dev server...${NC}"
    kill_process_on_port 3080 "backend" >/dev/null 2>&1

    npm run backend:dev >"../logs/backend.log" 2>&1 &
    local backend_pid=$!
    echo -e "${GREEN}✓ Backend server started (PID: $backend_pid)${NC}"
  fi
}

# Function to run preflight checks
function run_preflight {
  echo -e "${GREEN}=== RUNNING PREFLIGHT CHECKS ===${NC}"
  echo -e "${YELLOW}This replicates the CI/CD pipeline locally${NC}"
  echo -e ""

  # Stop servers
  stop_all_servers

  # Clean everything
  echo -e "${BLUE}Step 1: Clean environment${NC}"
  clean_all_artifacts

  # Install
  echo -e "${BLUE}Step 2: Install dependencies${NC}"
  npm ci --legacy-peer-deps

  # Build
  echo -e "${BLUE}Step 3: Build all packages${NC}"
  npm run build:all

  echo -e "${BLUE}Step 4: Build frontend for E2E${NC}"
  npm run frontend

  # Quality checks
  echo -e "${BLUE}Step 5: Lint check${NC}"
  npm run lint

  echo -e "${BLUE}Step 6: Format check${NC}"
  npm run format

  echo -e "${BLUE}Step 7: Type check${NC}"
  npm run typecheck:all

  # Tests
  echo -e "${BLUE}Step 8: Unit tests${NC}"
  npm run test:all

  echo -e "${BLUE}Step 9: E2E tests${NC}"
  npm run e2e:ci

  echo -e ""
  echo -e "${GREEN}=== PREFLIGHT COMPLETE ===${NC}"
  echo -e "${GREEN}✓ Your code is ready for deployment!${NC}"
}

# Function to show log monitoring command
function show_logs_command {
  echo -e "${YELLOW}Monitor server logs with:${NC}"
  echo -e "  tail -f logs/frontend.log logs/backend.log"
  echo -e ""
  echo -e "${YELLOW}Or individually:${NC}"
  echo -e "  Frontend: tail -f logs/frontend.log"
  echo -e "  Backend:  tail -f logs/backend.log"
}

# Main script execution starts here

# Show usage if no arguments
if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
  # Common commands
  --dev)
    STOP_SERVERS=true
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    RESTART_FRONTEND=true
    RESTART_BACKEND=true
    ;;
  --rebuild)
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    REBUILD_FRONTEND=true
    ;;
  --packages)
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    ;;
  --restart)
    RESTART_FRONTEND=true
    RESTART_BACKEND=true
    ;;
  --stop)
    STOP_SERVERS=true
    ;;

  # Package-specific builds
  --data-schemas)
    REBUILD_DATA_SCHEMAS=true
    ;;
  --data-provider)
    REBUILD_DATA_PROVIDER=true
    ;;
  --mcp)
    REBUILD_MCP=true
    ;;
  --arcade)
    REBUILD_ARCADE=true
    ;;
  --frontend-build)
    REBUILD_FRONTEND=true
    ;;

  # Server-specific
  --frontend)
    RESTART_FRONTEND=true
    ;;
  --backend)
    RESTART_BACKEND=true
    ;;
  --logs)
    show_logs_command
    exit 0
    ;;

  # Cleanup operations
  --clean)
    DO_CLEAN=true
    ;;
  --clean-build)
    DO_CLEAN=true
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    REBUILD_FRONTEND=true
    ;;
  --reset)
    DO_CLEAN_ALL=true
    REINSTALL_DEPS=true
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    REBUILD_FRONTEND=true
    RESTART_FRONTEND=true
    RESTART_BACKEND=true
    ;;

  # QA operations
  --preflight)
    DO_PREFLIGHT=true
    ;;
  --test-build)
    DO_CLEAN_ALL=true
    REINSTALL_DEPS=true
    REBUILD_DATA_PROVIDER=true
    REBUILD_DATA_SCHEMAS=true
    REBUILD_MCP=true
    REBUILD_ARCADE=true
    REBUILD_FRONTEND=true
    # Don't restart servers for test build
    ;;

  # Emergency
  --kill-node)
    KILL_ALL_NODE=true
    ;;

  # Help
  --help | -h)
    show_usage
    exit 0
    ;;

  # Unknown option
  *)
    echo -e "${RED}Unknown option: $1${NC}"
    echo -e "Use --help to see available options"
    exit 1
    ;;
  esac
  shift
done

# Find and change to LibreChat directory
LIBRECHAT_DIR=$(find_librechat_dir)
if [ -z "$LIBRECHAT_DIR" ]; then
  echo -e "${RED}Error: Could not find LibreChat directory${NC}"
  echo -e "${YELLOW}Please run this script from the Agentis project root or scripts directory${NC}"
  exit 1
fi

echo -e "${GREEN}Working in: $LIBRECHAT_DIR${NC}"
cd "$LIBRECHAT_DIR"

# Execute operations in logical order

# 1. Emergency operations (these exit immediately)
if [ "$KILL_ALL_NODE" = true ]; then
  echo -e "${RED}WARNING: Killing ALL Node.js processes!${NC}"
  echo -e "${YELLOW}Waiting 3 seconds... Press Ctrl+C to cancel${NC}"
  sleep 3
  pkill -f node 2>/dev/null && echo -e "${GREEN}✓ All Node.js processes killed${NC}"
  exit 0
fi

# 2. Preflight (this is a complete workflow that exits)
if [ "$DO_PREFLIGHT" = true ]; then
  run_preflight
  exit 0
fi

# 3. Stop servers if requested
if [ "$STOP_SERVERS" = true ]; then
  stop_all_servers
fi

# 4. Clean operations
if [ "$DO_CLEAN_ALL" = true ]; then
  clean_all_artifacts
elif [ "$DO_CLEAN" = true ]; then
  clean_caches
fi

# 5. Reinstall dependencies if needed
if [ "$REINSTALL_DEPS" = true ]; then
  reinstall_dependencies
fi

# 6. Build packages as needed
packages_built=false

# Build in dependency order
if [ "$REBUILD_DATA_PROVIDER" = true ]; then
  rebuild_package "data-provider" "build:data-provider"
  packages_built=true
fi

if [ "$REBUILD_DATA_SCHEMAS" = true ]; then
  rebuild_package "data-schemas" "build:data-schemas"
  packages_built=true
fi

if [ "$REBUILD_MCP" = true ]; then
  rebuild_package "mcp" "build:mcp"
  packages_built=true
fi

if [ "$REBUILD_ARCADE" = true ] && [ -d "packages/arcade-client" ]; then
  rebuild_package "arcade-client" "build:arcade-client"
  packages_built=true
fi

# Build frontend if requested
if [ "$REBUILD_FRONTEND" = true ]; then
  rebuild_frontend
  packages_built=true
fi

# 7. Restart servers if requested
if [ "$RESTART_FRONTEND" = true ] || [ "$RESTART_BACKEND" = true ]; then
  start_dev_servers "$RESTART_FRONTEND" "$RESTART_BACKEND"
  echo -e ""
  echo -e "${GREEN}Development servers started!${NC}"
  echo -e "${YELLOW}Frontend: http://localhost:3090${NC}"
  echo -e "${YELLOW}Backend:  http://localhost:3080${NC}"
  echo -e ""
  show_logs_command
fi

# 8. Final summary
echo -e ""
echo -e "${GREEN}✓ Done!${NC}"

# Show what was accomplished
if [ "$packages_built" = true ]; then
  echo -e "${BLUE}Packages rebuilt successfully${NC}"
fi

if [ "$RESTART_FRONTEND" = true ] || [ "$RESTART_BACKEND" = true ]; then
  echo -e "${BLUE}Servers are running in the background${NC}"
fi
