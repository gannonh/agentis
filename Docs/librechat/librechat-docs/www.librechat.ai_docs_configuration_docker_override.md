---
url: "https://www.librechat.ai/docs/configuration/docker_override"
title: "GitHub"
---

Docs

⚙️ Configuration

Docker Override

# How to Use the Docker Compose Override File

In Docker Compose, an override file is a powerful feature that allows you to modify the default configuration provided by the main `docker-compose.yml` without the need to directly edit or duplicate the whole file. The primary use of the override file is for local development customizations, and Docker Compose merges the configurations of the `docker-compose.yml` and the `docker-compose.override.yml` files when you run `docker compose up`.

Here’s a quick guide on how to use the `docker-compose.override.yml`:

> Note: Please consult the `docker-compose.override.yml.example` for more examples

See the official docker documentation for more info:

- **[docker docs - understanding-multiple-compose-files](https://docs.docker.com/compose/multiple-compose-files/extends/#understanding-multiple-compose-files)**
- **[docker docs - merge-compose-files](https://docs.docker.com/compose/multiple-compose-files/merge/#merge-compose-files)**
- **[docker docs - specifying-multiple-compose-files](https://docs.docker.com/compose/reference/#specifying-multiple-compose-files)**

## Step 1: Create a `docker-compose.override.yml` file [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#step-1-create-a-docker-composeoverrideyml-file)

If you don’t already have a `docker-compose.override.yml` file, you can create one by copying the example override content:

Copying the example override file

```nextra-code
cp docker-compose.override.yml.example docker-compose.override.yml
```

This file will be picked up by Docker Compose automatically when you run docker-compose commands.

## Step 2: Edit the override file [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#step-2-edit-the-override-file)

Open your `docker-compose.override.yml` file with vscode or any text editor.

Make your desired changes by uncommenting the relevant sections and customizing them as needed.

> Warning: You can only specify every service name once (api, mongodb, meilisearch, …) If you want to override multiple settings in one service you will have to edit accordingly.

### Examples [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#examples)

If you want to make sure Docker can use your `librechat.yaml` file for [Custom Endpoints & Configuration](https://www.librechat.ai/docs/configuration/librechat_yaml), it would look like this:

docker-compose.override.yml

```nextra-code
version: '3.4'

services:
  api:
    volumes:
      - ./librechat.yaml:/app/librechat.yaml
```

Or, if you want to locally build the image for the `api` service, use the LibreChat config file, and use the older Mongo that doesn’t requires AVX support, your `docker-compose.override.yml` might look like this:

docker-compose.override.yml

```nextra-code
version: '3.4'

services:
  api:
    volumes:
      - ./librechat.yaml:/app/librechat.yaml
    image: librechat
    build:
      context: .
      target: node

  mongodb:
    image: mongo:4.4.18
```

> Note: Be cautious if you expose ports for MongoDB or Meilisearch to the public, as it can make your data vulnerable.

## Step 3: Apply the changes [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#step-3-apply-the-changes)

To apply your configuration changes, simply run Docker Compose as usual. Docker Compose automatically takes into account both the `docker-compose.yml` and the `docker-compose.override.yml` files:

Apply the changes

```nextra-code
docker compose up -d
```

## Step 4: Verify the changes [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#step-4-verify-the-changes)

After starting your services with the modified configuration, you can verify that the changes have been applied using the `docker ps` command to list the running containers and their properties, such as ports.

## Important Considerations [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#important-considerations)

- **Order of Precedence**: Values defined in the override file take precedence over those specified in the original `docker-compose.yml` file.
- **Security**: When customizing ports and publicly exposing services, always be conscious of the security implications. Avoid using defaults for production or sensitive environments.

By following these steps and considerations, you can easily and safely modify your Docker Compose configuration without altering the original `docker-compose.yml` file, making it simpler to manage and maintain different environments or local customizations.

## `deploy-compose.yml` [Permalink for this section](https://www.librechat.ai/docs/configuration/docker_override\#deploy-composeyml)

To use an override file with a non-default Docker Compose file, such as `deploy-compose.yml`, you will have to explicitly specify both files when running Docker Compose commands.

Docker Compose allows you to specify multiple `-f` or `--file` options to include multiple compose files, where settings in later files override or add to those in the first.

If you use `deploy-compose.yml` as your main Docker Compose configuration and you have an override file named `docker-compose.override.yml` (you can name the override file whatever you want, but you may have this specific file already), you would run Docker Compose commands like so:

```nextra-code
docker compose -f deploy-compose.yml -f docker-compose.override.yml pull
docker compose -f deploy-compose.yml -f docker-compose.override.yml up
```

Last updated on April 27, 2025

[Azure OpenAI](https://www.librechat.ai/docs/configuration/azure "Azure OpenAI") [Automated Moderation](https://www.librechat.ai/docs/configuration/mod_system "Automated Moderation")