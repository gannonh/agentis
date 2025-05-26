#!/bin/bash

# Agentis Production Deployment Verification Script
# This script checks that all services are running correctly after deployment

set -e

PRODUCTION_HOST="${1:-}"
PRODUCTION_USER="${2:-agentis}"

if [ -z "$PRODUCTION_HOST" ]; then
    echo "Usage: $0 <production_host> [production_user]"
    echo "Example: $0 192.168.1.100 agentis"
    exit 1
fi

echo "🔍 Verifying Agentis deployment on $PRODUCTION_HOST..."
echo "================================================="

# Function to check service health
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -n "Checking $service_name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "http://$PRODUCTION_HOST:$port$endpoint" | grep -q "200\|301\|302"; then
        echo "✅ OK"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Function to check docker container status
check_container() {
    local container_name=$1
    
    echo -n "Checking container $container_name... "
    
    if ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker ps --filter name=$container_name --filter status=running -q" | grep -q .; then
        echo "✅ Running"
        return 0
    else
        echo "❌ Not running"
        return 1
    fi
}

echo ""
echo "1. Checking Docker containers..."
echo "--------------------------------"
check_container "agentis-api"
check_container "agentis-client"
check_container "agentis-mongodb"
check_container "agentis-meilisearch"
check_container "agentis-vectordb"
check_container "agentis-rag-api"

echo ""
echo "2. Checking service endpoints..."
echo "--------------------------------"
check_service "API" 3080 "/health"
check_service "Client" 80 "/"
check_service "Meilisearch" 7700 "/health"
check_service "RAG API" 8000 "/health"

echo ""
echo "3. Checking API functionality..."
echo "--------------------------------"
echo -n "Testing API config endpoint... "
if curl -s "http://$PRODUCTION_HOST:3080/api/config" | grep -q "registration"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo ""
echo "4. Getting container logs (last 10 lines)..."
echo "--------------------------------------------"
ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "docker logs --tail 10 agentis-api 2>&1" | sed 's/^/[API] /'

echo ""
echo "5. Checking disk usage..."
echo "------------------------"
ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "df -h | grep -E '(Filesystem|/$)'"

echo ""
echo "6. Checking memory usage..."
echo "--------------------------"
ssh "$PRODUCTION_USER@$PRODUCTION_HOST" "free -h"

echo ""
echo "================================================="
echo "Deployment verification complete!"
echo ""
echo "Next steps:"
echo "1. Access the application at http://$PRODUCTION_HOST"
echo "2. Test user registration and login"
echo "3. Test chat functionality with different AI models"
echo "4. Configure SSL/TLS for HTTPS access"
echo "5. Set up domain name and update DNS records"