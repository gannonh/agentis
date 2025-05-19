---
url: "https://docs.arcade.dev/home/auth/call-third-party-apis-directly"
title: "Arcade Docs"
---

[Home](https://docs.arcade.dev/home "Home") [Authorization](https://docs.arcade.dev/home/auth/how-arcade-helps "Authorization") Direct Third-Party API Call

# Direct Third-Party API Call

In this guide, you’ll learn how to use Arcade to obtain user authorization and interact with third-party services by calling their API endpoints directly, without using Arcade for tool execution or definition. We’ll use Google’s Gmail API as an example to demonstrate how to:

- Get authorization tokens through Arcade
- Handle user authentication flows
- Use tokens with external services

This can be useful when you need to manage authorization flows in your application.

### Prerequisites [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#prerequisites)

- Sign up for an [Arcade account](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=call-third-party-apis-directly) if you haven’t already
- Generate an [Arcade API key](https://docs.arcade.dev/home/api-keys) and take note of it

### Install required libraries [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#install-required-libraries)

PythonJavaScript

```nextra-code
pip install arcadepy google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

```nextra-code
npm install @arcadeai/arcadejs googleapis
```

### Start coding [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#start-coding)

PythonJavaScript

Create a new file `direct_api_call.py` and import all libraries we’re going to use:

```nextra-code
from arcadepy import Arcade
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
```

Create a new file `direct_api_call.js` and import all libraries we’re going to use:

```nextra-code
import { Arcade } from "@arcadeai/arcadejs";
import { google } from "googleapis";
```

### Initialize the Arcade client [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#initialize-the-arcade-client)

Create an instance of the Arcade client:

PythonJavaScript

```nextra-code
client = Arcade()  # Automatically finds the `ARCADE_API_KEY` env variable
```

```nextra-code
const client = new Arcade(); // Automatically finds the `ARCADE_API_KEY` env variable
```

### Initiate an authorization request [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#initiate-an-authorization-request)

Use `client.auth.start` to initiate the authorization process:

PythonJavaScript

```nextra-code
# This would be your app's internal ID for the user (an email, UUID, etc.)
user_id = "user@example.com"

# Start the authorization process
auth_response = client.auth.start(
    user_id=user_id,
    provider="google",
    scopes=["https://www.googleapis.com/auth/gmail.readonly"],
)
```

```nextra-code
// Your app's internal ID for the user (an email, UUID, etc). It's used internally to identify your user in Arcade, not to identify with the Gmail service.
const user_id = "user@example.com";

// Start the authorization process
let auth_response = await client.auth.start(user_id, "google", {
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
});
```

### Guide the user through authorization [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#guide-the-user-through-authorization)

If authorization is not completed, prompt the user to visit the authorization URL:

PythonJavaScript

```nextra-code
if auth_response.status != "completed":
    print("Please complete the authorization challenge in your browser:")
    print(auth_response.url)
```

```nextra-code
if (auth_response.status !== "completed") {
  console.log("Please complete the authorization challenge in your browser:");
  console.log(auth_response.url);
}
```

### Wait for the user to authorize the request [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#wait-for-the-user-to-authorize-the-request)

PythonJavaScript

```nextra-code
auth_response = client.auth.wait_for_completion(auth_response)
```

```nextra-code
auth_response = await client.auth.waitForCompletion(auth_response);
```

### Use the obtained token [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#use-the-obtained-token)

Once authorization is complete, you can use the obtained token to access the third-party service:

PythonJavaScript

```nextra-code
credentials = Credentials(auth_response.context.token)
gmail = build("gmail", "v1", credentials=credentials)

email_messages = (
    gmail.users().messages().list(userId="me").execute().get("messages", [])
)

print(email_messages)
```

```nextra-code
// Set up Google API client with the token
const auth = new google.auth.OAuth2();
auth.setCredentials({ access_token: auth_response.context.token });
const gmail = google.gmail({ version: "v1", auth });

// List email messages
const response = await gmail.users.messages.list({
  userId: "me",
});

const email_messages = response.data.messages || [];
console.log(email_messages);
```

### Execute the code [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#execute-the-code)

PythonJavaScript

```nextra-code
python3 direct_api_call.py
```

```nextra-code
node direct_api_call.js
```

You should see an output similar to this:, which is a list of the email messages returned by the Gmail API:

```nextra-code
[{'id': '195f77a8ce90f2c1', 'threadId': '195f77a8ce90f2c1'}, {'id': '195ed467a90e8538', 'threadId': '195ed467a90e8538'}, ...]
```

For each item in the list/array, you could use the [`users.messages.get`](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) endpoint to get the full message details.

Consider using the [Arcade Google toolkit](https://docs.arcade.dev/toolkits/productivity/google/gmail), which simplifies the process for retrieving email messages even further! The pattern described here is useful if you need to directly get a token to use with Google in other parts of your codebase.

### How it works [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#how-it-works)

By using `client.auth.start` and `client.auth.wait_for_completion`, you leverage Arcade to manage the OAuth flow for user authorization.

Arcade handles the authorization challenges and tokens, simplifying the process for you.

### Next steps [Permalink for this section](https://docs.arcade.dev/home/auth/call-third-party-apis-directly\#next-steps)

Integrate this authorization flow into your application, and explore how you can manage different [auth providers](https://docs.arcade.dev/home/auth-providers) and scopes.

[Authorized Tool Calling](https://docs.arcade.dev/home/auth/auth-tool-calling "Authorized Tool Calling") [Arcade CLI](https://docs.arcade.dev/home/arcade-cli "Arcade CLI")