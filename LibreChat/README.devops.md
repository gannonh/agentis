# DevOps Notes

## Production Notes

### Digital Ocean

gannonW@astro-labs.app
S3cr3t77!
droplet 
root pw: vyZcix-ruczyh-3wygqo
agentis pw: vIpKdgJGyk33Gu8

### Production Setup Progress (May 24, 2025)

#### Initial Server Setup
- ✅ Digital Ocean droplet provisioned
- ✅ Docker and Docker Compose installed (Docker 28.1.1, Compose v2.35.1)
- ✅ Agentis repository cloned to `/home/agentis/agentis`
- ✅ Created `.env.prod` from development `.env` configuration

#### Architecture Notes
- Building custom Agentis platform (not using upstream LibreChat images)
- LibreChat directory will be renamed to `platform/` in future
- Need to create custom `docker-compose.prod.yml` for our production deployment

#### Current Status
- ✅ Node.js upgraded to 20.19.2
- ✅ Created 2GB swap file (server only has 1GB RAM)
- Dependencies installation in progress
- No Docker containers running

#### Memory Issue Resolved
- Digital Ocean droplet only has 1GB RAM
- Created 2GB swap file at `/swapfile` to prevent OOM kills during npm install
- Swap made permanent in `/etc/fstab`

#### Immediate Tasks
1. **Upgrade Node.js to 20.x**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Install dependencies and build packages**
   ```bash
   npm ci
   npm run build:data-provider
   npm run build:mcp
   npm run build:data-schemas
   ```

3. **Configure production environment**
   - Edit `.env.prod` with production values
   - Create `docker-compose.prod.yml` for Agentis platform

#### Future Steps
1. Build Agentis Docker images (API and client)
2. Configure nginx for SSL/TLS termination
3. Set up CI/CD pipeline with GitHub Actions
4. Configure domain and DNS settings
5. Set up monitoring and logging

## Development Setup

1. Use Node.JS 20.x.
2. Install typescript globally: `npm i -g typescript`.
3. Run `npm ci` to install dependencies.
4. Build the data provider: `npm run build:data-provider`.
5. Build MCP: `npm run build:mcp`.
6. Build data schemas: `npm run build:data-schemas`.
7. Setup and run unit tests:
    - Copy `.env.test`: `cp api/test/.env.test.example api/test/.env.test`.
    - Run backend unit tests: `npm run test:api`.
    - Run frontend unit tests: `npm run test:client`.
8. Setup and run integration tests:
    - Build client: `cd client && npm run build`.
    - Create `.env`: `cp .env.example .env`.
    - Install [MongoDB Community Edition](https://www.mongodb.com/docs/manual/administration/install-community/), ensure that `mongosh` connects to your local instance.
    - Run: `npx install playwright`, then `npx playwright install`.
    - Copy `config.local`: `cp e2e/config.local.example.ts e2e/config.local.ts`.
    - Copy `librechat.yaml`: `cp librechat.example.yaml librechat.yaml`.
    - Run: `npm run e2e`.

## Development Notes

1. Before starting work, make sure your main branch has the latest commits with `npm run update`.
3. Run linting command to find errors: `npm run lint`. Alternatively, ensure husky pre-commit checks are functioning.
3. After your changes, reinstall packages in your current branch using `npm run reinstall` and ensure everything still works. 
    - Restart the ESLint server ("ESLint: Restart ESLint Server" in VS Code command bar) and your IDE after reinstalling or updating.
4. Clear web app localStorage and cookies before and after changes.
5. For frontend changes, compile typescript before and after changes to check for introduced errors: `cd client && npm run build`.
6. When updating the app version (in `packages/data-provider/src/config.ts`), you must rebuild the data provider:
- Run `npm run build:data-provider` to rebuild the package
- Then restart the frontend with `npm run frontend:dev` or rebuild with `npm run frontend`
- The version in the main `package.json` and `packages/data-provider/package.json` should also be updated for consistency
7. Run backend unit tests: `npm run test:api`.
8. Run frontend unit tests: `npm run test:client`.
9. Run integration tests: `npm run e2e`.
