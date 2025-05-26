# Agentis Production Setup - Status & Handoff Document

## Date: May 24, 2025

## Overview
This document summarizes the progress made on setting up the Agentis platform (LibreChat fork) on the Digital Ocean production droplet and outlines the remaining work to be completed.

## Completed Tasks

### 1. ✅ Server Environment Setup
- **Node.js**: Upgraded from 18.x to 20.19.2
- **npm**: Version 10.8.2
- **Memory Issue Resolved**: 
  - Server only has 1GB RAM
  - Created 2GB swap file at `/swapfile` to prevent OOM kills
  - Swap made permanent in `/etc/fstab`

### 2. ✅ Dependencies Installation
- Successfully installed all npm dependencies using `npm install --legacy-peer-deps`
- Resolved ESLint version conflicts between packages

### 3. ✅ Shared Packages Built
- **data-provider**: Built successfully
- **data-schemas**: Built successfully  
- **mcp**: Built successfully after fixing rollup configuration
  - Fixed by adding `@rollup/plugin-json` to handle JSON imports in `packages/mcp/rollup.config.js`

### 4. ✅ Production Configuration
- Created `.env.prod` from development `.env`
- Updated key configurations for Docker networking:
  ```
  HOST=0.0.0.0
  MONGO_URI=mongodb://admin:password@mongodb:27017/Agentis?authSource=admin
  MEILI_HOST=http://meilisearch:7700
  RAG_API_URL=http://rag_api:8000
  ```

### 5. ✅ Docker Setup
- Created `docker-compose.prod.yml` for Agentis platform
- Updated `Dockerfile.multi` to use `--legacy-peer-deps` flag
- Created simplified `Dockerfile.api` for API-only builds

### 6. ✅ CI/CD Pipeline Started
- Created GitHub Actions workflow at `.github/workflows/deploy-production.yml`
- Configured to build images on GitHub's infrastructure (more memory)
- Set up deployment via SSH to Digital Ocean

## Current Challenges

### Memory Constraints
- Digital Ocean droplet has only 1GB RAM (+ 2GB swap)
- Client build fails during Docker build due to memory exhaustion
- Vite build process requires more memory than available

### Solution: GitHub Actions
- Move Docker builds to GitHub Actions (7GB RAM available)
- Use GitHub Container Registry for image storage
- Deploy pre-built images to production server

## Files Modified/Created

1. **Configuration Files**:
   - `.env.prod` - Production environment variables
   - `docker-compose.prod.yml` - Production Docker Compose setup
   - `Dockerfile.api` - Simplified API-only Dockerfile

2. **Fixed Files**:
   - `packages/mcp/rollup.config.js` - Added JSON plugin
   - `Dockerfile.multi` - Added --legacy-peer-deps flag

3. **CI/CD**:
   - `.github/workflows/deploy-production.yml` - GitHub Actions workflow (updated with correct registry paths)

4. **Documentation**:
   - `README.devops.md` - Updated with production setup progress
   - `README.docker.md` - Updated with Agentis platform notes
   - `docs/GITHUB_SECRETS.md` - GitHub secrets configuration guide

5. **Scripts**:
   - `scripts/test-github-build.sh` - Test GitHub Actions build locally
   - `scripts/verify-deployment.sh` - Verify production deployment health

## Remaining Tasks

### High Priority
1. **Complete Docker builds via GitHub Actions** ✅ READY
   - GitHub Actions workflow updated with correct registry paths
   - Test script created at `scripts/test-github-build.sh`
   - Workflow configured to use ghcr.io/gannonh/agentis images

2. **Configure GitHub Secrets** ✅ DOCUMENTED
   - Documentation created at `docs/GITHUB_SECRETS.md`
   - Required secrets:
     - `PRODUCTION_HOST`: Digital Ocean droplet IP
     - `PRODUCTION_USER`: agentis
     - `PRODUCTION_PASSWORD`: vIpKdgJGyk33Gu8

3. **Update docker-compose.prod.yml** ✅ COMPLETED
   - Updated to use environment variables for images
   - Default images: ghcr.io/gannonh/agentis/api:latest and client:latest
   - Images can be overridden with API_IMAGE and CLIENT_IMAGE env vars

4. **Run smoke tests** ✅ SCRIPT CREATED
   - Deployment verification script at `scripts/verify-deployment.sh`
   - Tests all containers, endpoints, and basic functionality

### Medium Priority
1. **SSL/TLS Configuration**
   - Set up Let's Encrypt certificates
   - Configure nginx for HTTPS

2. **Domain Configuration**
   - Point domain to Digital Ocean droplet
   - Update DOMAIN_CLIENT and DOMAIN_SERVER in .env.prod

3. **Monitoring & Logging**
   - Set up health checks
   - Configure log aggregation

## Architecture Decision
- Building custom Agentis platform (NOT using upstream LibreChat images)
- LibreChat directory will eventually be renamed to `platform/`
- All custom branding and modifications preserved

## Immediate Next Steps

1. **Test the Build Locally** ✅ COMPLETED
   ```bash
   ./scripts/test-github-build.sh
   ```
   This ensures the Dockerfiles work correctly before pushing to GitHub
   - API build: ✅ Success
   - Client build: ✅ Success
   - Push to ghcr.io: ❌ Expected failure (no real credentials locally)

2. **Enable GitHub Actions Write Permissions**
   - Go to your repository → Settings → Actions → General
   - Scroll to "Workflow permissions"
   - Select "Read and write permissions"
   - Click "Save"
   - This allows GitHub Actions to push images to GitHub Container Registry (ghcr.io)

3. **Configure GitHub Repository Secrets**
   - Go to GitHub repository → Settings → Secrets and variables → Actions
   - Add the three required secrets as documented in `docs/GITHUB_SECRETS.md`

4. **Trigger the GitHub Actions Workflow**
   - Push to main branch or manually trigger the workflow
   - Monitor the Actions tab for build progress

5. **Verify Deployment**
   ```bash
   ./scripts/verify-deployment.sh <PRODUCTION_HOST>
   ```

6. **Complete Production Setup**
   - Configure SSL/TLS with Let's Encrypt
   - Set up domain name and DNS
   - Update environment variables with production values
   - Change default database passwords

## Important Notes

- All API keys and sensitive data are in `.env.prod` (not committed)
- The production database password needs to be changed from default
- Consider upgrading the Digital Ocean droplet for better performance