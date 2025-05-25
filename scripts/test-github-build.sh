#!/bin/bash

# Test GitHub Actions build locally using act
# This script helps test the GitHub Actions workflow without pushing to GitHub

set -e

echo "🧪 Testing GitHub Actions workflow locally..."
echo "==========================================="

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "❌ 'act' is not installed. Please install it first:"
    echo "   brew install act (macOS)"
    echo "   or visit: https://github.com/nektos/act"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Create a temporary .env file for act
cat > .env.act << EOF
PRODUCTION_HOST=192.168.1.100
PRODUCTION_USER=agentis
PRODUCTION_PASSWORD=test_password
GITHUB_TOKEN=test_token
EOF

echo "📦 Building images locally to test Dockerfile..."
echo "------------------------------------------------"

cd LibreChat

# Test API build
echo "Building API image..."
if docker build -f Dockerfile.multi --target api-build -t agentis-api-test:latest . ; then
    echo "✅ API image built successfully"
else
    echo "❌ API image build failed"
    exit 1
fi

# Test client build with memory limit
echo "Building Client image (this may take a while)..."
if docker build -f Dockerfile.multi --target client-build -t agentis-client-test:latest --build-arg NODE_OPTIONS="--max-old-space-size=4096" . ; then
    echo "✅ Client image built successfully"
else
    echo "❌ Client image build failed"
    exit 1
fi

cd ..

echo ""
echo "🎭 Running GitHub Actions workflow with act..."
echo "---------------------------------------------"
echo "Note: This will simulate the build job only (not deployment)"
echo ""

# Run act with the build job only
# Note: This simulates the build but won't actually push to ghcr.io
echo "Note: act will simulate the build but cannot push to ghcr.io without real credentials"
act push -j build-and-push --env-file .env.act --container-architecture linux/amd64 -P ubuntu-latest=catthehacker/ubuntu:act-latest

# Clean up
rm -f .env.act

echo ""
echo "==========================================="
echo "✅ Local testing complete!"
echo ""
echo "If the builds succeeded, you can:"
echo "1. Configure GitHub secrets as documented in docs/GITHUB_SECRETS.md"
echo "2. Push to the main branch to trigger the actual workflow"
echo "3. Monitor the Actions tab in GitHub for build progress"
echo ""
echo "Built test images:"
docker images | grep agentis-.*-test || true