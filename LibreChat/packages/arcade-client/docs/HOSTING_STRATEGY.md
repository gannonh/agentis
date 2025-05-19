# Arcade Hosting Strategy

This document outlines the available hosting options for Arcade integration with Agentis and provides recommendations for each use case.

## CLI Configuration

We've set up a properly configured environment with Arcade CLI that works with Python 3.12. The implementation details can be found in [AUTH_PROVIDERS.md](AUTH_PROVIDERS.md). This setup is essential for development and testing regardless of which hosting option is selected.

## Available Hosting Options

Arcade offers three main hosting options, each with different trade-offs in terms of simplicity, control, and data residency:

### 1. Cloud Hosting (Managed by Arcade)

**Description**: The simplest option where Arcade hosts the entire infrastructure. All tool executions run on Arcade's servers.

**Configuration**:
```yaml
# librechat.yaml
arcade:
  hosting: cloud
  api_key: ${ARCADE_API_KEY}
  callback_url: ${ARCADE_CALLBACK_URL}
```

**Pros**:
- Simplest setup and maintenance
- No infrastructure to manage
- Automatic updates to toolkits
- Reliable performance

**Cons**:
- Data passes through third-party servers
- Less control over execution environment
- May not meet strict compliance requirements

**Recommended For**:
- Initial integration and testing
- Small to medium deployments
- Non-sensitive workflows
- Teams without infrastructure resources

### 2. Hybrid Deployment

**Description**: Arcade controls the control plane, but you run workers in your own environment. This provides data residency benefits while keeping management simple.

**Configuration**:
```yaml
# librechat.yaml
arcade:
  hosting: hybrid
  api_key: ${ARCADE_API_KEY}
  callback_url: ${ARCADE_CALLBACK_URL}
  worker:
    enabled: true
    image: arcade/worker:latest
    host: ${ARCADE_WORKER_HOST:-localhost}
    port: ${ARCADE_WORKER_PORT:-8002}
```

**Pros**:
- Data processing happens on your infrastructure
- Good balance between control and simplicity
- Meets most compliance requirements
- Can be deployed within a private network

**Cons**:
- Requires Docker or Kubernetes to run workers
- Worker maintenance responsibility
- Still requires connection to Arcade's control plane

**Recommended For**:
- Organizations with data residency requirements
- Medium to large deployments
- Sensitive but not highly regulated workflows
- Teams with DevOps capabilities

### 3. Self-Hosting

**Description**: Run the entire Arcade stack within your infrastructure. Maximum control but higher maintenance overhead.

**Configuration**:
```yaml
# librechat.yaml
arcade:
  hosting: self_hosted
  engine:
    host: ${ARCADE_ENGINE_HOST:-localhost}
    port: ${ARCADE_ENGINE_PORT:-8000}
  worker:
    enabled: true
    host: ${ARCADE_WORKER_HOST:-localhost}
    port: ${ARCADE_WORKER_PORT:-8002}
```

**Pros**:
- Complete control over all components
- All data stays within your infrastructure
- Meets the strictest compliance requirements
- Can operate in air-gapped environments

**Cons**:
- Most complex setup and maintenance
- Requires significant infrastructure resources
- Manual updates for toolkits and engine
- Higher operational burden

**Recommended For**:
- Highly regulated industries
- Organizations with strict security requirements
- Large enterprise deployments
- Teams with strong infrastructure capabilities

## Current Status and Recommendation

We have successfully:
1. Created and patched a Python virtual environment for working with the Arcade CLI
2. Authenticated with Arcade Cloud using our API key
3. Listed available toolkits and verified they match our needs

Based on this current state and the requirements discussed, we recommend the following approach:

### 1. Initial Development (Now)

Use **Cloud Hosting** for the following reasons:
- We already have a working Arcade Cloud account and API key
- Cloud hosting simplifies initial integration efforts
- Allows us to focus on client-side implementation details
- Reduces development friction

### 2. Middle-term (Production-ready)

Plan for **Hybrid Deployment**:
- Once basic functionality is validated with Cloud hosting
- Provides better data residency characteristics
- Balances control and simplicity
- Meets most enterprise requirements

### 3. Long-term Option

Provide **Self-hosted** capability for organizations with strict requirements:
- Detailed documentation for self-hosted setup
- Support both hybrid and self-hosted models depending on customer needs

## Implementation Plan

### Phase 1 (Current): Cloud Hosting
- ✅ Set up Arcade Cloud account
- ✅ Configure API key in .env
- ✅ Set up local development environment
- Next: Implement client with Cloud hosting configuration
- Focus on toolkit integration and UI/UX

### Phase 2: Hybrid Deployment Support
- Add worker configuration to LibreChat
- Create Docker configuration for running workers
- Implement tooling to monitor worker health

### Phase 3: Self-Hosted Option
- Document self-hosted setup process
- Create deployment templates for various environments
- Implement configuration validation for self-hosted mode

## Required Configuration

We've already identified the configuration needed in `librechat.yaml` for each hosting option:

```yaml
# Cloud hosting example (current recommendation)
arcade:
  enabled: true
  hosting: cloud
  api_key: ${ARCADE_API_KEY}
  callback_url: ${ARCADE_CALLBACK_URL}
  
  # Only enabled toolkits will be available in the UI
  toolkits:
    - id: github
      name: GitHub
      category: Developer Tools
      description: Interact with GitHub repositories, issues, and pull requests
    
    - id: google
      name: Google Workspace
      category: Productivity & Docs
      description: Work with Google Docs, Sheets, and Drive
      
    - id: slack
      name: Slack
      category: Communication
      description: Send messages and manage Slack channels
```

Environment variables should be defined in `.env`:

```
# .env
ARCADE_API_KEY=your_api_key
ARCADE_CALLBACK_URL=https://your-agentis-instance.com/api/arcade/callback
ARCADE_HOSTING=cloud
```

We've confirmed that `ARCADE_API_KEY` is already set in the LibreChat/.env file.

## Conclusion

Based on our testing and configuration, we're recommending Cloud hosting for the initial integration of Arcade with Agentis. This approach simplifies the initial development while providing a clear path to hybrid or self-hosted deployments as needed.

The working Arcade CLI environment we've set up will enable efficient testing and exploration of the toolkits during the implementation phase.