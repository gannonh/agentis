---
url: "https://docs.arcade.dev/home/local-deployment/configure/overview"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Local Deployment](https://docs.arcade.dev/home/local-deployment/install "Local Deployment") ConfigureOverview

# Configuration Overview

Arcade uses configuration files to manage engine settings and default values. When you install the Arcade Engine, two files are created:

- The `engine.yaml` file for engine configuration.
- The `engine.env` file for environment variables.

Let’s explore each file to understand their purpose and how to locate them.

## Engine configuration file [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/overview\#engine-configuration-file)

The `engine.yaml` file controls Arcade Engine settings. It supports variable expansion so you can integrate secrets and environment values seamlessly. You can customize this file to suit your setup. For more details, check the [Engine Configuration](https://docs.arcade.dev/home/configure/engine) page.

Choose your installation method to view the default location of `engine.yaml`:

macOS (Homebrew)Ubuntu/Debian (APT)Manual Download

```nextra-code
$HOMEBREW_REPOSITORY/etc/arcade-engine/engine.yaml
```

```nextra-code
/etc/arcade-ai/engine.yaml
```

```nextra-code
$HOME/.arcade/engine.yaml
```

To manually download the engine.yaml, you can get an example from the [Configuration Templates](https://docs.arcade.dev/home/configure/templates#engineyaml) and add it to `$HOME/.arcade/engine.yaml`.

## Engine environment file [Permalink for this section](https://docs.arcade.dev/home/local-deployment/configure/overview\#engine-environment-file)

The `engine.env` file contains default environment variables that power Arcade Engine. You can override these defaults by exporting your own variables or by editing the file directly.

Select your installation method below to see the default path for `engine.env`:

macOS (Homebrew)Ubuntu/Debian (APT)Manual Download

```nextra-code
$HOMEBREW_REPOSITORY/etc/arcade-engine/engine.env
```

```nextra-code
/etc/arcade-ai/engine.env
```

```nextra-code
$HOME/.arcade/engine.env
```

To manually download the `engine.env`, refer to the [Configuration Templates](https://docs.arcade.dev/home/configure/templates#engineenv).

[Toolkits](https://docs.arcade.dev/home/local-deployment/install/toolkits "Toolkits") [Engine](https://docs.arcade.dev/home/local-deployment/configure/engine "Engine")