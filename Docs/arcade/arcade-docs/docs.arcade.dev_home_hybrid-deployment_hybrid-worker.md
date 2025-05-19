---
url: "https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Hybrid DeploymentHybrid Worker

# Hybrid Worker

A hybrid deployment allows you to execute tools in your own environment while still leveraging Arcade’s cloud Gateway infrastructure. This gives you the flexibility to access private resources, maintain data security, and customize your worker environment while leveraging Arcade’s gateway and management capabilities.

## How hybrid workers work [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#how-hybrid-workers-work)

The hybrid worker model uses a bidirectional connection between your local environment and Arcade’s cloud gateway:

1. You run the Arcade worker in your environment (on-premises, private cloud, etc.)
2. Your worker is exposed to Arcade’s cloud gateway using a public URL
3. The Arcade cloud gateway routes tool calls to your worker
4. Your worker processes the requests and returns responses to the gateway

## Benefits of hybrid workers [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#benefits-of-hybrid-workers)

- **Resource access**: Access private databases, APIs, or other resources not accessible from Arcade’s cloud
- **Data control**: Keep sensitive data within your environment while still using Arcade’s capabilities
- **Custom environments**: Use specific dependencies or configurations required by your tools
- **Compliance**: Meet regulatory requirements by keeping data processing within your infrastructure

## Setting up a hybrid worker [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#setting-up-a-hybrid-worker)

### Setup your toolkits [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#setup-your-toolkits)

Follow the [Creating a Toolkit](https://docs.arcade.dev/home/build-tools/create-a-toolkit) guide to create your toolkits.

Alternatively, you can install an Arcade Toolkit:

```nextra-code
pip install arcade-math
```

### Start your local worker [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#start-your-local-worker)

Run your Arcade worker locally with a secret that you generate in some secure way:

```nextra-code
export ARCADE_WORKER_SECRET=your-secret
arcade serve
```

Verify your worker is running by visiting [http://localhost:8002/worker/health](http://localhost:8002/worker/health).

### Create a public URL [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#create-a-public-url)

To allow the Arcade cloud gateway to connect to your locally running worker, you need a public URL. Here are a few options:

ngrokCloudflareTailscale

```nextra-code
ngrok http 8002
```

```nextra-code
cloudflared tunnel --url http://localhost:8002
```

```nextra-code
tailscale funnel 8002
```

### Register your worker in Arcade [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#register-your-worker-in-arcade)

1. Navigate to the [Workers](https://api.arcade.dev/dashboard/workers) page in your Arcade dashboard
2. Click **Add Worker**
3. Fill in the form:
   - **ID**: Choose a unique identifier (e.g., `my-hybrid-worker`)
   - **Worker Type**: Select `Arcade`
   - **URL**: Enter your public URL from Step 3
   - **Secret**: Enter the secret for your worker (or use `dev` for testing)
   - **Timeout** and **Retry**: Configure as needed for your use case
4. Click **Create**

### Test the connection to your worker [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#test-the-connection-to-your-worker)

You can now test your worker by making requests through the Arcade API or using the Playground:

1. Go to the [Playground](https://api.arcade.dev/playground/execute)
2. Select a tool from your toolkit and execute it
3. Verify that the response is correct and you see request logs in your worker

## Best practices [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#best-practices)

- **Persistent URLs**: For production use, set up a persistent public URL rather than ephemeral ones
- **TLS**: Use a TLS-enabled URL for production use
- **Security**: Use strong secrets for worker authentication
- **Monitoring**: Set up monitoring for your hybrid workers to ensure availability
- **Scaling**: For high-load scenarios, consider running multiple workers behind a load balancer

## Troubleshooting [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#troubleshooting)

- **Connection issues**: Ensure your public URL is accessible and that your local worker is running
- **Authentication failures**: Verify that the worker secret matches what’s configured in the Arcade dashboard
- **Timeout errors**: If your worker takes too long to respond, increase the timeout value in the worker configuration

## Next steps [Permalink for this section](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker\#next-steps)

- [Create custom tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit) for your hybrid worker
- [Set up authentication](https://docs.arcade.dev/home/build-tools/create-a-tool-with-auth) for secure access to resources
- [Configure secrets](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets) for your worker

[Overview](https://docs.arcade.dev/home/hosting-overview "Overview") [Overview](https://docs.arcade.dev/home/local-deployment/install/overview "Overview")