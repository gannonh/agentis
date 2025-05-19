---
url: "https://docs.arcade.dev/home/serve-tools/docker-worker"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Serve tools](https://docs.arcade.dev/home/serve-tools/arcade-deploy "Serve tools") Docker

# Build custom worker images with docker

This guide shows you how to build a custom Worker image using Arcade’s base Worker image. It takes you through creating a Dockerfile, installing toolkits, and running the resulting container.

### Requirements [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#requirements)

- Docker installed on your machine

### Create your Dockerfile [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#create-your-dockerfile)

Create a Dockerfile in your project directory:

```nextra-code
ARG VERSION=latest

FROM ghcr.io/arcadeai/worker-base:${VERSION}

# Copy the file that lists all your desired toolkits
COPY toolkits.txt ./

# Install these toolkits
RUN pip install -r toolkits.txt
```

With this Dockerfile, we start from the Arcade worker base image, copy in a file named toolkits.txt, and install each toolkit listed there.

* * *

## List Your Toolkits [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#list-your-toolkits)

Create a file named toolkits.txt in the same directory. Add the toolkits you want installed:

```nextra-code
arcade-google
arcade-web
arcade-zoom
```

Adjust this file as needed. Each line in toolkits.txt should specify a Python package name and version.

* * *

## 3\. Build the Image [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#3-build-the-image)

From the directory containing the Dockerfile and toolkits.txt, run:

```nextra-code
docker build -t custom-worker:0.1.0 .
```

This command creates a Docker image named custom-worker with the tag 0.1.0 using the instructions in your Dockerfile.

* * *

## Run the Worker [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#run-the-worker)

To start the worker container:

```nextra-code
docker run -p 8002:8002 \
  -e ARCADE_WORKER_SECRET="your_secret_here" \
  custom-worker:0.1.0
```

Replace “your\_secret\_here” with a secret of your choice. Your engine will need access to this secret to call your worker. The worker will be accessible on port 8002 of your local machine.

* * *

## Next Steps [Permalink for this section](https://docs.arcade.dev/home/serve-tools/docker-worker\#next-steps)

- Set environment variables (like ARCADE\_WORKER\_SECRET) securely for production use.
- Deploy your container to a suitable environment (Docker Swarm, Kubernetes, or another container orchestration platform).

Happy coding with Arcade!

[Arcade Deploy](https://docs.arcade.dev/home/serve-tools/arcade-deploy "Arcade Deploy") [Modal](https://docs.arcade.dev/home/serve-tools/modal-worker "Modal")