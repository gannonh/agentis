# GitHub Packages Setup for Agentis

If you're getting a 403 Forbidden error when pushing to GitHub Container Registry, follow these steps:

## 1. Enable GitHub Packages for Your Repository

1. Go to your repository on GitHub
2. Click on **Settings** → **Actions** → **General**
3. Scroll down to **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

## 2. Verify Package Visibility

1. Go to your GitHub profile
2. Click on **Packages** tab
3. If you see any packages from previous attempts, click on them
4. Go to **Package settings**
5. Ensure visibility is set appropriately (usually "Public" for open source)
6. Link the package to your repository if not already linked

## 3. Personal Access Token (Alternative)

If the GITHUB_TOKEN still doesn't work, you can create a Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these scopes:
   - `write:packages` - Upload packages to GitHub Package Registry
   - `read:packages` - Download packages from GitHub Package Registry
   - `delete:packages` (optional) - Delete packages from GitHub Package Registry
   - `repo` - Full control of private repositories (if your repo is private)

3. Add the token as a repository secret named `PACKAGES_TOKEN`
4. Update the workflow to use `${{ secrets.PACKAGES_TOKEN }}` instead of `${{ secrets.GITHUB_TOKEN }}`

## 4. Test Locally First

Before pushing to GitHub, test the build locally:

```bash
# Build the images locally
cd LibreChat
docker build -f Dockerfile.multi --target api-build -t test-api .
docker build -f Dockerfile.multi --target client-build -t test-client .
```

## Common Issues

### "requested access to the resource is denied"
- The repository name must be lowercase in the image tag
- The workflow now handles this automatically with the lowercase conversion step

### "unauthorized to access repository"
- Ensure the workflow has `packages: write` permission
- Check that GitHub Packages is enabled for your repository

### Package already exists with different visibility
- Delete the existing package or change its visibility settings
- Go to your GitHub profile → Packages → Select package → Settings