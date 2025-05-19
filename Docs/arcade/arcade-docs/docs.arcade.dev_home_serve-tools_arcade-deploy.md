---
url: "https://docs.arcade.dev/home/serve-tools/arcade-deploy"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") Serve toolsArcade Deploy

# Deploying to the cloud with Arcade Deploy

This guide shows you how to deploy a worker with a local toolkit with Arcade Deploy.

## Requirements [Permalink for this section](https://docs.arcade.dev/home/serve-tools/arcade-deploy\#requirements)

- **Python 3.10** or higher

Verify your Python version by running `python --version` or `python3 --version` in your terminal.
- **Arcade Account**: Sign up for an [Arcade account](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=custom-tools) if you haven’t already.
- **Arcade CLI**: Install the Arcade CLI with `pip install arcade-ai`.

## Create your deployment config [Permalink for this section](https://docs.arcade.dev/home/serve-tools/arcade-deploy\#create-your-deployment-config)

Create a `worker.toml` file in your project directory:

```nextra-code
### Worker 1
[[worker]]

[worker.config]
id = "my-worker"
secret = <your secret> # Replace with your own secret

[worker.local_source]
packages = ["./<your-toolkit-directory>"] # Replace with the path to your toolkit directory
```

For more information on the `worker.toml` file, see the [Arcade Deploy documentation](https://docs.arcade.dev/home/configure/arcade-deploy).

* * *

## Deploy your worker [Permalink for this section](https://docs.arcade.dev/home/serve-tools/arcade-deploy\#deploy-your-worker)

Run the deploy command in the directory containing your `worker.toml` file:

```nextra-code
arcade deploy
```

You should see output like the following:

```nextra-code
Deploying 'my-worker...'                                                                                                                                                                                                                                                                                                                 main.py:589
⠏ Deploying 1 workers
┏━━━━━━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━┓
┃         Added   ┃ Removed ┃ Updated ┃ No Changes ┃
┡━━━━━━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━┩
│  custom-toolkit │         │         │            │
└─────────────────┴─────────┴─────────┴────────────┘
✅ Worker 'my-worker' deployed successfully.
```

* * *

## List your workers [Permalink for this section](https://docs.arcade.dev/home/serve-tools/arcade-deploy\#list-your-workers)

Run the following command to list your workers:

```nextra-code
arcade worker list
```

You should see output like the following:

```nextra-code
                                                     Workers
┏━━━━━━━━━━━┳━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┓
┃ ID        ┃ Cloud Deployed ┃ Engine Registered ┃ Enabled ┃ Host                                                ┃ Toolkits      ┃
┡━━━━━━━━━━━╇━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━┩
│ my-worker │ True           │ True              │ True    │ https://4bdfrgfdgftlu0ahyko56gdsr.server.arcade.dev │ CustomToolkit │
└───────────┴────────────────┴───────────────────┴─────────┴─────────────────────────────────────────────────────┴───────────────┘
```

Your worker and toolkits are now deployed and registered with the engine and ready to use!

You can go to the [dashboard](https://api.arcade.dev/dashboard/workers) to see your worker and its details.

[Run evaluations](https://docs.arcade.dev/home/evaluate-tools/run-evaluations "Run evaluations") [Docker](https://docs.arcade.dev/home/serve-tools/docker-worker "Docker")