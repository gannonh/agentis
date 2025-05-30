# GitHub Secrets Configuration for Agentis Production Deployment

This document lists all the GitHub repository secrets that need to be configured for the CI/CD pipeline to work correctly.

## Required Secrets

### 1. `PRODUCTION_HOST`
- **Description**: IP address of the Digital Ocean droplet
- **Value**: The public IP address of your production server
- **Example**: `192.168.1.100`

### 2. `PRODUCTION_USER`
- **Description**: SSH username for deployment
- **Value**: `agentis`
- **Note**: This is the user created on the Digital Ocean droplet

### 3. `PRODUCTION_PASSWORD`
- **Description**: SSH password for the agentis user
- **Value**: `vIpKdgJGyk33Gu8` (as documented in README.devops.md)
- **Security Note**: Consider switching to SSH key authentication for better security

## How to Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the name and value specified above

## Optional: SSH Key Authentication (Recommended)

For improved security, consider using SSH key authentication instead of password:

1. Generate an SSH key pair on your local machine:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions@agentis"
   ```

2. Add the public key to the production server:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub agentis@<PRODUCTION_HOST>
   ```

3. Create a GitHub secret called `PRODUCTION_SSH_KEY` with the private key content

4. Update the GitHub Actions workflow to use SSH key instead of password:
   ```yaml
   - name: Deploy to Digital Ocean
     uses: appleboy/ssh-action@v1.0.0
     with:
       host: ${{ secrets.PRODUCTION_HOST }}
       username: ${{ secrets.PRODUCTION_USER }}
       key: ${{ secrets.PRODUCTION_SSH_KEY }}
       script: |
         # deployment commands
   ```

## Verifying Secrets

After configuring the secrets, you can verify they're set correctly by:
1. Running the GitHub Actions workflow manually
2. Checking the workflow logs for successful SSH connection
3. Ensuring the deployment steps execute without authentication errors