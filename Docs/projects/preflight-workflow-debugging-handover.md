# Preflight Workflow Debugging - Team Handover

## Issue Summary

The GitHub Actions preflight workflow (`/.github/workflows/preflight-checks.yml`) is consistently failing during the "Initialize containers" phase. The workflow is designed to run comprehensive checks (linting, type checking, unit tests, E2E tests) before allowing merges to main or deployments to production.

**Current Status**: Still failing after multiple attempted fixes  
**Branch**: `feat/issue-37-proactive-mcp-auth`  
**Key Error**: `Failed to initialize container ghcr.io/gannonh/rag-api-lite:latest`

## Workflow Architecture

The preflight workflow runs the following services as GitHub Actions service containers:
- **MongoDB** (`mongo:7.0`) - Database
- **Meilisearch** (`getmeili/meilisearch:v1.12.3`) - Search engine  
- **PostgreSQL** (`ankane/pgvector:latest`) - Vector database
- **RAG API** (`ghcr.io/gannonh/rag-api-lite:latest`) - Custom RAG service
- **Sandpack** (`ghcr.io/gannonh/codesandbox-client/bundler:latest`) - Code execution

## Root Cause Analysis

The primary issue is that **service containers initialize before job steps run**, making authentication and health checks challenging.

### Key Findings:

1. **GHCR Authentication**: Even though packages are public, GitHub Actions requires explicit authentication
2. **Health Check Dependencies**: The RAG API container (`python:3.10-slim` base) doesn't have `curl` or `wget` installed
3. **Local vs CI Environment**: The workflow works locally with `act` but fails in GitHub Actions

## Attempted Solutions

### 1. Added GHCR Authentication (Commit: 577a9b4)
```yaml
permissions:
  contents: read
  packages: read

steps:
  - name: Log in to GitHub Container Registry
    uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
```
**Result**: Failed - authentication happens after service container initialization

### 2. Service Container Credentials (Commit: 74ab1c9)
```yaml
rag_api:
  image: ghcr.io/gannonh/rag-api-lite:latest
  credentials:
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```
**Result**: Failed - still couldn't initialize containers

### 3. Health Check Tool Changes (Commits: 329fa71, b97fd87)

**Attempted**: Replaced `curl` with `wget`
```yaml
options: --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:8000/health || exit 1"
```

**Final Attempt**: Used container-compatible commands
```yaml
# RAG API - Use Python (guaranteed to exist)
options: --health-cmd="python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()\" || exit 1"

# Sandpack - Use netcat
options: --health-cmd="nc -z localhost 80 || exit 1"
```
**Result**: Still testing at handover time

## Technical Context

### RAG API Container Details
- **Location**: `/Users/gannonhall/dev/agentis/rag_api/`
- **Dockerfile**: `Dockerfile.lite` 
- **Base Image**: `python:3.10-slim`
- **Health Endpoint**: `/health` (confirmed to exist)
- **Missing Tools**: No `curl`, `wget`, or `nc` installed

### Local Development Setup
```bash
# Works locally
cd LibreChat
docker-compose -f docker-compose.dev.yml up -d
```

### Testing with Act
```bash
# Local GitHub Actions simulation
act -W .github/workflows/preflight-checks.yml --container-architecture linux/amd64
```
**Issue**: Port conflicts with local MongoDB, but images pull successfully

## Remaining Investigation Areas

### 1. Container Image Issues
- Verify `ghcr.io/gannonh/rag-api-lite:latest` is properly built and published
- Check if image architecture matches GitHub Actions runners (linux/amd64)
- Validate health check endpoint functionality

### 2. Network Configuration
- Service containers may have network isolation issues
- Consider using service names instead of `localhost` in health checks
- Verify port mappings and internal Docker networking

### 3. Alternative Approaches

**Option A**: Remove health checks entirely
```yaml
# Simplest test - remove all health check options
rag_api:
  image: ghcr.io/gannonh/rag-api-lite:latest
  # Remove: options: --health-cmd=...
```

**Option B**: Build RAG API locally in workflow
```yaml
steps:
  - name: Build RAG API
    run: |
      cd rag_api
      docker build -f Dockerfile.lite -t local-rag-api .
  
services:
  rag_api:
    image: local-rag-api
```

**Option C**: Use Docker Compose in GitHub Actions
```yaml
- name: Start services
  run: |
    cd LibreChat
    docker-compose -f docker-compose.dev.yml up -d
```

## Files Modified

- `/.github/workflows/preflight-checks.yml` - Main workflow file
- Multiple commits on `feat/issue-37-proactive-mcp-auth` branch

## Next Steps Recommendations

1. **Immediate**: Test if removing health checks allows containers to start
2. **Short-term**: Consider building RAG API locally in workflow instead of pulling from GHCR
3. **Long-term**: Investigate if local `docker-compose.dev.yml` approach can replace service containers

## Related Documentation

- `/docs/projects/prod/PRODUCTION_SETUP_STATUS.md` - Production deployment info
- `/LibreChat/README.devops.md` - DevOps setup guide
- `/README.md` - Main project documentation

## Contact Context

This issue was being debugged in the context of implementing proactive MCP authentication features. The preflight workflow is critical for maintaining code quality before production deployments.

**Last Updated**: June 9, 2025  
**Debugged By**: Claude Code Assistant  
**Status**: Awaiting test results of container-compatible health checks