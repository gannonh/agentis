---
url: "https://docs.arcade.dev/home/build-tools/handle-tool-errors"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Build tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit "Build tools") Handle tool errors

# Tool errors in Arcade

When working with Arcade’s Tool SDK, you may encounter various types of errors. This guide will help you understand and handle these errors effectively.

## Handling errors in your tools [Permalink for this section](https://docs.arcade.dev/home/build-tools/handle-tool-errors\#handling-errors-in-your-tools)

In most cases, you don’t need to raise errors explicitly in your tools. The `@tool` decorator takes care of proper error propagation and handling. When an unexpected error occurs during tool execution, Arcade’s `ToolExecutor` and `@tool` decorator will raise a `ToolExecutionError` with the necessary context and traceback information.

However, if you want to retry the tool call with additional content to improve the tool call’s input parameters, you can raise a [RetryableToolError](https://docs.arcade.dev/home/build-tools/retry-tools-with-improved-prompt) within the tool.

## Common error scenarios [Permalink for this section](https://docs.arcade.dev/home/build-tools/handle-tool-errors\#common-error-scenarios)

Let’s explore some common error scenarios you might encounter:

### 1\. Output type mismatch [Permalink for this section](https://docs.arcade.dev/home/build-tools/handle-tool-errors\#1-output-type-mismatch)

This occurs when the expected output type of a tool does not match the actual output type when executed.

```nextra-code
{
  "name": "tool_call_error",
  "message": "tool call failed - Example.Hello failed: Failed to
  serialize tool output"
}
```

For example, the following tool will raise the above error because the tool’s definition specifies that the output should be a string, but the tool returns a list:

```nextra-code
from typing import Annotated
from arcade.sdk import tool

@tool
def hello(name: Annotated[str, "The name of the friend to greet"]) -> str:
  """
  Says hello to a friend
  """
  return ["hello", name]
```

### 2\. Input parameter type error [Permalink for this section](https://docs.arcade.dev/home/build-tools/handle-tool-errors\#2-input-parameter-type-error)

This occurs when the input parameter of a tool is of an unsupported type.

```nextra-code
Type error encountered while adding tool list_org_repositories from
arcade_github.tools.repositories. Reason: issubclass() arg 1 must be a class
```

For example, the following tool will raise the above error because the tool input parameter is of an unsupported type:

```nextra-code
from typing import Annotated
from arcade.sdk import tool

@tool
def hello(names: Annotated[tuple[str, str, str], "The names of the friends to greet"]) -> str:
  """
  Says hello to a list of friends
  """
  return f"Hello, {names[0]}, {names[1]}, and {names[2]}!"
```

### 3\. Unexpected HTTP error during tool execution [Permalink for this section](https://docs.arcade.dev/home/build-tools/handle-tool-errors\#3-unexpected-http-error-during-tool-execution)

This occurs when the tool makes an HTTP request and receives a non-2xx response. Specifically for the example below, the authenticated user did not have permission to access the private organization’s repositories.

```nextra-code
{
  "name": "tool_call_error",
  "message": "tool call failed - Github.ListOrgRepositories failed: Error accessing 'https://api.github.com/orgs/a-private-org/repos': Failed to process request. Status code: 401"
}
```

[Create a tool with secrets](https://docs.arcade.dev/home/build-tools/create-a-tool-with-secrets "Create a tool with secrets") [Retry tools with improved prompt](https://docs.arcade.dev/home/build-tools/retry-tools-with-improved-prompt "Retry tools with improved prompt")