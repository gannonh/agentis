---
url: "https://docs.arcade.dev/home/serve-tools/modal-worker"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Serve tools](https://docs.arcade.dev/home/serve-tools/arcade-deploy "Serve tools") Modal

# Deploy a custom worker on Modal

This guide shows you how to deploy a custom Arcade Worker using Modal. It takes you through setting up the environment, deploying the worker, and connecting it to the Arcade Engine.

### Requirements [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#requirements)

- Python 3.10+
- Modal CLI ( `pip install modal`)

### Deploy [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#deploy)

Navigate to the directory containing your worker script and deploy it using Modal:

```nextra-code
cd examples/serving-tools
modal deploy run-arcade-worker.py
```

### Changing the Toolkits [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#changing-the-toolkits)

To change the toolkits, edit the `toolkits` list in the `run-arcade-worker.py` file.

### Example `run-arcade-worker.py` [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#example-run-arcade-workerpy)

```nextra-code
import os
from modal import App, Image, asgi_app

# Define the FastAPI app
app = App("arcade-worker")

toolkits = ["arcade-google", "arcade-slack"]

image = (
    Image.debian_slim()
    .pip_install("arcade-ai")
    .pip_install(toolkits)
)

@app.function(image=image)
@asgi_app()
def fastapi_app():
    from fastapi import FastAPI
    from arcade.sdk import Toolkit
    from arcade.worker.fastapi.worker import FastAPIWorker

    web_app = FastAPI()

    # Initialize app and Arcade FastAPIWorker
    worker_secret = os.environ.get("ARCADE_WORKER_SECRET", "dev")
    worker = FastAPIWorker(web_app, secret=worker_secret)

    # Register toolkits we've installed
    installed_toolkits = Toolkit.find_all_arcade_toolkits()
    for toolkit in toolkits:
        if toolkit in installed_toolkits:
            worker.register_toolkit(toolkit)

    return web_app
```

### Connect to Arcade Engine [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#connect-to-arcade-engine)

To connect the Arcade Engine to your worker, configure the worker URL in the engine’s configuration file. Start the engine with the appropriate configuration.

For more details, refer to the [Arcade Engine configuration documentation](https://docs.arcade.dev/home/configure/engine).

* * *

## Next Steps [Permalink for this section](https://docs.arcade.dev/home/serve-tools/modal-worker\#next-steps)

- Ensure your environment variables (like `ARCADE_WORKER_SECRET`) are set securely for production use.
- Explore deploying your worker in different environments supported by Modal.

[Docker](https://docs.arcade.dev/home/serve-tools/docker-worker "Docker") [Using Arcade tools](https://docs.arcade.dev/home/langchain/use-arcade-tools "Using Arcade tools")