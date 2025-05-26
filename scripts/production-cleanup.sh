#!/bin/bash

# Production Server Cleanup Script
# This script migrates from source-based deployment to clean Docker-only deployment

set -e

echo "🧹 Agentis Production Cleanup Script"
echo "==================================="
echo ""
echo "This script will:"
echo "1. Stop current containers"
echo "2. Remove the source code directory"
echo "3. Preserve all your Docker data volumes"
echo ""
echo "The next deployment will create a clean setup in /home/agentis/agentis-deploy"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Stop current containers
echo "Stopping current containers..."
if [ -d "/home/agentis/agentis/LibreChat" ]; then
    cd /home/agentis/agentis/LibreChat
    docker compose -f docker-compose.prod.yml down
fi

# Backup source code (optional)
echo "Creating backup of source code..."
tar -czf /home/agentis/agentis-source-backup-$(date +%Y%m%d).tar.gz /home/agentis/agentis/

# Remove source code
echo "Removing source code directory..."
rm -rf /home/agentis/agentis/

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Add any missing API keys to GitHub Secrets:"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY"
echo "   - GOOGLE_API_KEY"
echo "   - AZURE_API_KEY"
echo "2. Push to main branch to trigger deployment"
echo ""
echo "Your data volumes are preserved and will be reused."
echo "Source backup saved to: /home/agentis/agentis-source-backup-*.tar.gz"
echo ""
echo "The deployment is now fully managed by GitHub Actions!"
echo "Configuration (librechat.yaml) is baked into the Docker images."