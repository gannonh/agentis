#!/bin/bash

# Simple Agentis Production Deployment Verification Script
# This version uses a single SSH command to avoid multiple password prompts

set -e

# Parse arguments
DOWN_FLAG=false
PRODUCTION_HOST=""
PRODUCTION_USER="agentis"

while [[ $# -gt 0 ]]; do
    case $1 in
        --down)
            DOWN_FLAG=true
            shift
            ;;
        *)
            if [ -z "$PRODUCTION_HOST" ]; then
                PRODUCTION_HOST="$1"
            else
                PRODUCTION_USER="$1"
            fi
            shift
            ;;
    esac
done

if [ -z "$PRODUCTION_HOST" ]; then
    echo "Usage: $0 [--down] <production_host> [production_user]"
    echo "Example: $0 143.110.229.209 agentis"
    echo "         $0 --down 143.110.229.209 agentis  # Bring down services"
    exit 1
fi

if [ "$DOWN_FLAG" = true ]; then
    echo "🛑 Bringing down Agentis services on $PRODUCTION_HOST..."
    echo "================================================="
    echo ""
    echo "You'll be prompted for the SSH password once."
    echo ""
    
    # Bring down services
    ssh "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
echo "Stopping all Agentis services..."
cd /home/agentis/agentis-deploy
docker compose -f docker-compose.prod.yml down

echo ""
echo "Checking that all containers are stopped..."
docker ps --filter name=agentis

echo ""
echo "================================================="
echo "All Agentis services have been stopped!"
echo "To restart: deploy via GitHub Actions or manually run:"
echo "  cd /home/agentis/agentis-deploy"
echo "  docker compose -f docker-compose.prod.yml up -d"
EOF
    exit 0
fi

echo "🔍 Verifying Agentis deployment on $PRODUCTION_HOST..."
echo "================================================="
echo ""
echo "You'll be prompted for the SSH password once."
echo ""

# Run all checks in a single SSH session
ssh "$PRODUCTION_USER@$PRODUCTION_HOST" << 'EOF'
echo "1. Checking Docker containers..."
echo "--------------------------------"

# Check each container
for container in agentis-api agentis-client agentis-mongodb agentis-meilisearch agentis-vectordb agentis-rag-api; do
    if docker ps --filter name=$container --filter status=running -q | grep -q .; then
        echo "✅ $container is running"
    else
        echo "❌ $container is not running"
    fi
done

echo ""
echo "2. Docker container details..."
echo "------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "3. Recent API logs (last 20 lines)..."
echo "-------------------------------------"
docker logs --tail 20 agentis-api 2>&1 || echo "Could not get API logs"

echo ""
echo "4. Disk usage..."
echo "----------------"
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "5. Memory usage..."
echo "------------------"
free -h

echo ""
echo "6. Docker compose status..."
echo "---------------------------"
cd /home/agentis/agentis-deploy
docker compose -f docker-compose.prod.yml ps

EOF

echo ""
echo "================================================="
echo "Deployment verification complete!"
echo ""
echo "To test the services:"
echo "1. Web interface: http://$PRODUCTION_HOST"
echo "2. API endpoint: http://$PRODUCTION_HOST:3080/health"
echo ""
echo "If containers are not running, SSH in and check logs:"
echo "  ssh $PRODUCTION_USER@$PRODUCTION_HOST"
echo "  cd /home/agentis/agentis-deploy"
echo "  docker compose -f docker-compose.prod.yml logs"