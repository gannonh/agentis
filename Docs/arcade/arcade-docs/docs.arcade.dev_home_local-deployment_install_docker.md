---
url: "https://docs.arcade.dev/home/local-deployment/install/docker"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Local Deployment [Install](https://docs.arcade.dev/home/local-deployment/install/overview "Install") Docker

# Docker Installation

## Engine [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/docker\#engine)

### Pulling the Engine Image [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/docker\#pulling-the-engine-image)

The Arcade Engine is stateless and the docker image is designed to scale horizontally for production environments.

The docker image for the engine can be pulled with

```nextra-code
docker pull ghcr.io/arcadeai/engine:latest
```

### Running the Engine [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/docker\#running-the-engine)

The engine can be run with:

```nextra-code
docker run -d -p 9099:9099 -v ./engine.yaml:/bin/engine.yaml ghcr.io/arcadeai/engine:latest
```

where config.yaml is the path to the [configuration file](https://docs.arcade.dev/home/configure/templates).

## Worker [Permalink for this section](https://docs.arcade.dev/home/local-deployment/install/docker\#worker)

Arcade now provides a base Worker image that you can use to build your custom Worker image. Follow the [Build custom worker images with docker](https://docs.arcade.dev/home/serve-tools/docker-worker) guide to create your own Worker image using Arcade’s base Worker image.

[Local](https://docs.arcade.dev/home/local-deployment/install/local "Local") [Toolkits](https://docs.arcade.dev/home/local-deployment/install/toolkits "Toolkits")