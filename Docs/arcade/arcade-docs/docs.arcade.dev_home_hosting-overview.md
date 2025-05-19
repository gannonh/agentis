---
url: "https://docs.arcade.dev/home/hosting-overview"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Overview

# Hosting Options

The best way to use Arcade is to use our cloud service. However, if you need to run Arcade locally to either connect your tools to local-only resources (e.g. a local database or filesystem), or your policies require it, Arcade has you covered!

## Customizing Auth [Permalink for this section](https://docs.arcade.dev/home/hosting-overview\#customizing-auth)

You don’t have to host Arcade to customize your auth experiences. Arcade’s cloud service supports a number of auth providers out of the box, but you can always provide your own OAuth app credentials. We recommend doing this for any production use so that you can have isolated rate limits with the OAuth service provider and give your users a consistent experience when they go through an auth flow.

You can still use the same tools when you customize your auth, no code changes are required.

See [Customizing Auth](https://docs.arcade.dev/home/auth-providers) for more information.

## Hybrid Deployments [Permalink for this section](https://docs.arcade.dev/home/hosting-overview\#hybrid-deployments)

Hybrid deployments combine the benefits of running Arcade locally with the benefits of using our cloud service. You can use our cloud service to manage your users and authentication, but run your tools locally.

See [Hybrid Deployment](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker) for more information.

## Local Deployments [Permalink for this section](https://docs.arcade.dev/home/hosting-overview\#local-deployments)

Local deployments involve running all of the Arcade services locally. This is more complex than a hybrid deployment, but it does give you the flexibility to run Arcade anywhere.

See [Local Deployment](https://docs.arcade.dev/home/local-deployment/overview) for more information.

[Arcade Clients](https://docs.arcade.dev/home/arcade-clients "Arcade Clients") [Hybrid Worker](https://docs.arcade.dev/home/hybrid-deployment/hybrid-worker "Hybrid Worker")