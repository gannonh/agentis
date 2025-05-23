---
url: "https://www.librechat.ai/docs/configuration/cdn/azure"
title: "GitHub"
---

Docs

⚙️ Configuration

CDN

Azure Blob Storage

# Azure Blob Storage CDN Setup

## On this page

- [Production Setup](https://www.librechat.ai/docs/configuration/cdn/azure#production-setup)
- [Local Development with Azurite](https://www.librechat.ai/docs/configuration/cdn/azure#local-development-with-azurite)

## Production Setup [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#production-setup)

Azure Blob Storage offers scalable, secure object storage that can be used as a CDN for your static assets such as images, CSS, and JavaScript. Follow these steps to configure your Azure Blob Storage for LibreChat.

## 1\. Create an Azure Storage Account [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#1-create-an-azure-storage-account)

1. **Sign in to Azure:**
   - Open the [Azure Portal](https://portal.azure.com/) and sign in with your Microsoft account.
2. **Create a Storage Account:**
   - Click on **“Create a resource”** and search for **“Storage account”**.
   - Click **“Create”** and fill in the required details:
     - **Subscription & Resource Group:** Choose your subscription and either select an existing resource group or create a new one.
     - **Storage Account Name:** Enter a unique name (e.g., `mylibrechatstorage`).
     - **Region:** Select the region closest to your users.
     - **Performance & Redundancy:** Choose the performance tier and redundancy level that best suit your needs.
   - Click **“Review + Create”** and then **“Create”**. Wait until the deployment completes.

## 2\. Set Up Authentication [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#2-set-up-authentication)

You have two options for authenticating with your Azure Storage Account:

### Option A: Using a Connection String [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#option-a-using-a-connection-string)

1. **Navigate to Access Keys:**
   - In your newly created storage account, go to **“Access keys”** in the sidebar.
2. **Copy Connection String:**
   - Copy one of the connection strings provided. This string includes the credentials required to connect to your Blob Storage account.

### Option B: Using Managed Identity [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#option-b-using-managed-identity)

If your LibreChat application is running on an Azure service that supports Managed Identity (such as an Azure VM, App Service, or AKS), you can use that instead of a connection string.

1. **Assign Managed Identity:**
   - Ensure your Azure resource (VM, App Service, or AKS) has a system-assigned or user-assigned Managed Identity enabled.
2. **Grant Storage Permissions:**
   - In your storage account, assign the **Storage Blob Data Contributor** (or a similarly scoped role) to your Managed Identity. This allows your application to access Blob Storage without a connection string.

## 3\. Update Your Environment Variables [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#3-update-your-environment-variables)

Create or update your `.env` file in your project’s root with the following configuration:

.env

```nextra-code
# Option A: Using a Connection String
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=yourAccountName;AccountKey=yourAccountKey;EndpointSuffix=core.windows.net

# Option B: Using Managed Identity (do not set the connection string if using Managed Identity)
AZURE_STORAGE_ACCOUNT_NAME=yourAccountName

AZURE_STORAGE_PUBLIC_ACCESS=false
AZURE_CONTAINER_NAME=files
```

- **AZURE\_STORAGE\_CONNECTION\_STRING:** Set this if you are using Option A.
- **AZURE\_STORAGE\_ACCOUNT\_NAME:** Set this if you are using Option B (Managed Identity). Do not set both.
- **AZURE\_STORAGE\_PUBLIC\_ACCESS:** Set to `false` if you do not want your blobs to be publicly accessible by default. Set to `true` if you need public access (for example, for publicly viewable images).
- **AZURE\_CONTAINER\_NAME:** This is the container name your application will use (e.g., `files`). The application will automatically create this container if it doesn’t exist.

## 4\. Configure LibreChat to Use Azure Blob Storage [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#4-configure-librechat-to-use-azure-blob-storage)

Update your LibreChat configuration file ( `librechat.yaml`) to specify that the application should use Azure Blob Storage for file handling:

librechat.yaml

```nextra-code
version: 1.0.8
cache: true
fileStrategy: "azure_blob"
```

This setting tells LibreChat to use the Azure Blob Storage implementation provided in your code.

* * *

## Summary [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#summary)

1. **Create a Storage Account:**

Sign in to the Azure Portal, create a storage account, and wait for deployment to finish.

2. **Set Up Authentication:**


- **Option A:** Retrieve the connection string from **“Access keys”** in your storage account.
- **Option B:** Use Managed Identity by enabling it on your Azure resource and granting it appropriate storage permissions.

3. **Update Environment Variables:**

In your `.env` file, set either:

- `AZURE_STORAGE_CONNECTION_STRING` (for Option A), or
- `AZURE_STORAGE_ACCOUNT_NAME` (for Option B), along with:
- `AZURE_STORAGE_PUBLIC_ACCESS` and
- `AZURE_CONTAINER_NAME`.

4. **Configure LibreChat:**

Set `fileStrategy` to `"azure_blob"` in your `librechat.yaml` configuration file.

With these steps, your LibreChat application will automatically create the container (if it doesn’t exist) and manage file uploads, downloads, and deletions using Azure Blob Storage as your CDN. Managed Identity provides a secure alternative by eliminating the need for long-term credentials.

## Local Development with Azurite [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#local-development-with-azurite)

For local development and testing, you can use [Azurite](https://github.com/Azure/Azurite), an Azure Storage emulator that provides a local environment for testing your Azure Blob Storage integration without needing an actual Azure account.

### 1\. Set Up Azurite [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#1-set-up-azurite)

You can run Azurite in several ways:

#### Option A: Using VS Code Extension (Recommended for Development) [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#option-a-using-vs-code-extension-recommended-for-development)

1. Install the [Azurite extension](https://marketplace.visualstudio.com/items?itemName=Azurite.azurite) for VS Code
2. Open the command palette (Ctrl+Shift+P or Cmd+Shift+P)
3. Search for and select “Azurite: Start”

This will start Azurite in the background with default settings.

#### Option B: Using Docker [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#option-b-using-docker)

```nextra-code
docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite
```

#### Option C: Using npm [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#option-c-using-npm)

```nextra-code
npm install -g azurite
azurite --silent --location /path/to/azurite/workspace --debug /path/to/debug/log
```

### 2\. Configure Environment Variables for Local Development [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#2-configure-environment-variables-for-local-development)

Add the following environment variables to your `.env` file:

.env

```nextra-code
# Azurite connection string for local development
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
AZURE_STORAGE_PUBLIC_ACCESS=true
AZURE_CONTAINER_NAME=files
```

Notes:

- The `AccountKey` value is the default development key used by Azurite
- The connection uses `http` protocol instead of `https` for local development
- The `BlobEndpoint` points to the local Azurite instance running on port 10000

### 3\. Verify the Connection [Permalink for this section](https://www.librechat.ai/docs/configuration/cdn/azure\#3-verify-the-connection)

To verify that your application can connect to the local Azurite instance:

1. Start your LibreChat application
2. Attempt to upload a file through the interface
3. Check the Azurite logs to confirm the connection and operations

If you’re using the VS Code extension, you can view the Azurite logs in the Output panel by selecting “Azurite Blob” from the dropdown.

ℹ️

Note

The default Azurite account key is a fixed value used for development purposes only. Never use this key in production environments. Always ensure that your connection string remains secure and never commit it to a public repository.

Last updated on April 27, 2025

[Amazon S3](https://www.librechat.ai/docs/configuration/cdn/s3 "Amazon S3") [Firebase](https://www.librechat.ai/docs/configuration/cdn/firebase "Firebase")