---
url: "https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Evaluate tools](https://docs.arcade.dev/home/evaluate-tools/why-evaluate-tools "Evaluate tools") Create an evaluation suite

# Evaluate tools

In this guide, you’ll learn how to evaluate your custom tools to ensure they function correctly with the AI assistant, including defining evaluation cases and using different critics.

We’ll create evaluation cases to test our `hello` tool and measure its performance.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#prerequisites)

- [Build a custom tool](https://docs.arcade.dev/home/build-tools/create-a-toolkit)
- Install the evaluation dependencies:

```nextra-code
pip install arcade-ai[evals]
```

### Create an evaluation suite [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#create-an-evaluation-suite)

Navigate to your toolkit’s `evals` directory:

```nextra-code
cd arcade_my_new_toolkit/evals
```

Create a new Python file for your evaluations, e.g., `eval_hello.py`.

### Define your evaluation cases [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#define-your-evaluation-cases)

Open `eval_hello.py` and add the following code:

```nextra-code
from arcade.sdk.eval import (
    EvalSuite,
    EvalRubric,
    ExpectedToolCall,
    BinaryCritic,
    tool_eval,
)
from arcade.sdk import ToolCatalog
from arcade_my_new_toolkit.tools.hello import hello

# Create a catalog of tools to include in the evaluation
catalog = ToolCatalog()
catalog.add_tool(hello)

# Define the evaluation rubric
rubric = EvalRubric(
    fail_threshold=0.8,
    warn_threshold=0.9,
)

@tool_eval()
def hello_eval_suite() -> EvalSuite:
    """Create an evaluation suite for the hello tool."""
    suite = EvalSuite(
        name="Hello Tool Evaluation",
        system_message="You are a helpful assistant.",
        catalog=catalog,
        rubric=rubric,
    )

    # Example evaluation case
    suite.add_case(
        name="Simple Greeting",
        user_message="Say hello to Alice",
        expected_tool_calls=[\
            ExpectedToolCall(\
                func=hello,\
                args={\
                    "name": "Alice",\
                },\
            )\
        ],
        critics=[\
            BinaryCritic(critic_field="name", weight=1.0),\
        ],
    )

    return suite
```

### Run the evaluation [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#run-the-evaluation)

From the `evals` directory, run:

```nextra-code
arcade evals .
```

This command executes your evaluation suite and provides a report.

### How it works [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#how-it-works)

The evaluation framework in Arcade allows you to define test cases ( `EvalCase`) with expected tool calls and use critics to assess the AI’s performance.

By running the evaluation suite, you can measure how well the AI assistant is using your tools.

### Next steps [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#next-steps)

Explore different types of critics and evaluation criteria to thoroughly test your tools.

[Learn more about Critic classes](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite#critic-classes)

## Critic classes [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#critic-classes)

Arcade provides several critic classes to evaluate different aspects of tool usage.

### BinaryCritic [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#binarycritic)

Checks if a parameter value matches exactly.

```nextra-code
BinaryCritic(critic_field="name", weight=1.0)
```

### SimilarityCritic [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#similaritycritic)

Evaluates the similarity between expected and actual values.

```nextra-code
from arcade.sdk.eval import SimilarityCritic

SimilarityCritic(critic_field="message", weight=1.0)
```

### NumericCritic [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#numericcritic)

Assesses numeric values within a specified tolerance.

```nextra-code
from arcade.sdk.eval import NumericCritic

NumericCritic(critic_field="score", tolerance=0.1, weight=1.0)
```

### DatetimeCritic [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#datetimecritic)

Evaluates the closeness of datetime values within a specified tolerance.

```nextra-code
from datetime import timedelta
from arcade.sdk.eval import DatetimeCritic

DatetimeCritic(critic_field="start_time", tolerance=timedelta(seconds=10), weight=1.0)
```

## Advanced evaluation cases [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#advanced-evaluation-cases)

You can add more evaluation cases to test different scenarios.

### Example: Greeting with emotion [Permalink for this section](https://docs.arcade.dev/home/evaluate-tools/create-an-evaluation-suite\#example-greeting-with-emotion)

Modify your `hello` tool to accept an `emotion` parameter:

```nextra-code
from arcade.sdk import tool
from typing import Annotated

class Emotion(str, Enum):
    HAPPY = "happy"
    SLIGHTLY_HAPPY = "slightly happy"
    SAD = "sad"
    SLIGHTLY_SAD = "slightly sad"

@tool
def hello(
    name: Annotated[str, "The name of the person to greet"] = "there",
    emotion: Annotated[Emotion, "The emotion to convey"] = Emotion.HAPPY
) -> Annotated[str, "A greeting to the user"]:
    """
    Say hello to the user with a specific emotion.
    """
    return f"Hello {name}! I'm feeling {emotion.value} today."
```

Add an evaluation case for this new parameter:

```nextra-code
suite.add_case(
    name="Greeting with Emotion",
    user_message="Say hello to Bob sadly",
    expected_tool_calls=[\
        ExpectedToolCall(\
            func=hello,\
            args={\
                "name": "Bob",\
                "emotion": Emotion.SAD,\
            },\
        )\
    ],
    critics=[\
        BinaryCritic(critic_field="name", weight=0.5),\
        SimilarityCritic(critic_field="emotion", weight=0.5),\
    ],
)
```

Add an evaluation case with additional conversation context:

```nextra-code
suite.add_case(
    name="Greeting with Emotion",
    user_message="Say hello to Bob based on my current mood.",
    expected_tool_calls=[\
        ExpectedToolCall(\
            func=hello,\
            args={\
                "name": "Bob",\
                "emotion": Emotion.HAPPY,\
            },\
        )\
    ],
    critics=[\
        BinaryCritic(critic_field="name", weight=0.5),\
        SimilarityCritic(critic_field="emotion", weight=0.5),\
    ],
    # Add some context to the evaluation case
    additional_messages= [\
        {"role": "user", "content": "Hi, I'm so happy!"},\
        {\
            "role": "assistant",\
            "content": "That’s awesome! What’s got you feeling so happy today?",\
        },\
    ]
)
```

Add an evalutation case with multiple expected tool calls:

```nextra-code
suite.add_case(
    name="Greeting with Emotion",
    user_message="Say hello to Bob based on my current mood. And then say hello to Alice with slightly less of that emotion.",
    expected_tool_calls=[\
        ExpectedToolCall(\
            func=hello,\
            args={\
                "name": "Bob",\
                "emotion": Emotion.HAPPY,\
            },\
        ),\
        ExpectedToolCall(\
            func=hello,\
            args={\
                "name": "Alice",\
                "emotion": Emotion.SLIGHTLY_HAPPY,\
            },\
        )\
    ],
    critics=[\
        BinaryCritic(critic_field="name", weight=0.5),\
        SimilarityCritic(critic_field="emotion", weight=0.5),\
    ],
    # Add some context to the evaluation case
    additional_messages= [\
        {"role": "user", "content": "Hi, I'm so happy!"},\
        {\
            "role": "assistant",\
            "content": "That’s awesome! What’s got you feeling so happy today?",\
        },\
    ]
)
```

* * *

Ensure that your `hello` tool and evaluation cases are updated accordingly and
that you rerun `arcade evals .` to test your changes.

[Why evaluate tools?](https://docs.arcade.dev/home/evaluate-tools/why-evaluate-tools "Why evaluate tools?") [Run evaluations](https://docs.arcade.dev/home/evaluate-tools/run-evaluations "Run evaluations")