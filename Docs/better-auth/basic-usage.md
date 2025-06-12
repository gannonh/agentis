# Basic Usage

Better Auth provides built-in authentication support for:

* **Email and password**
* **Social provider (Google, GitHub, Apple, and more)**

But also can easily be extended using plugins, such as: [username](/docs/plugins/username), [magic link](/docs/plugins/magic-link), [passkey](/docs/plugins/passkey), [email-otp](/docs/plugins/email-otp), and more.

## Email & Password

To enable email and password authentication:

**auth.ts**
```typescript
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true
    }
})
```

### Sign Up

To sign up a user you need to call the client method `signUp.email` with the user's information.

**sign-up.ts**
```typescript
import { authClient } from "@/lib/auth-client"; //import the auth client

const { data, error } = await authClient.signUp.email({
        email, // user email address
        password, // user password -> min 8 characters by default
        name, // user display name
        image, // User image URL (optional)
        callbackURL: "/dashboard" // A URL to redirect to after the user verifies their email (optional)
    }, {
        onRequest: (ctx) => {
            //show loading
        },
        onSuccess: (ctx) => {
            //redirect to the dashboard or sign in page
        },
        onError: (ctx) => {
            // display the error message
            alert(ctx.error.message);
        },
});
```

By default, the users are automatically signed in after they successfully sign up. To disable this behavior you can set `autoSignIn` to `false`.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {
    	enabled: true,
    	autoSignIn: false //defaults to true
  },
})
```

### Sign In

To sign a user in, you can use the `signIn.email` function provided by the client.

**sign-in**
```typescript
const { data, error } = await authClient.signIn.email({
        /**
         * The user email
         */
        email,
        /**
         * The user password
         */
        password,
        /**
         * A URL to redirect to after the user verifies their email (optional)
         */
        callbackURL: "/dashboard",
        /**
         * remember the user session after the browser is closed.
         * @default true
         */
        rememberMe: false
}, {
    //callbacks
})
```

Always invoke client methods from the client side. Don't call them from the server.

### Server-Side Authentication

To authenticate a user on the server, you can use the `auth.api` methods.

**server.ts**
```typescript
import { auth } from "./auth"; // path to your Better Auth server instance

const response = await auth.api.signInEmail({
    body: {
        email,
        password
    },
    asResponse: true // returns a response object instead of data
});
```

If the server cannot return a response object, you'll need to manually parse and set cookies. But for frameworks like Next.js we provide [a plugin](/docs/integrations/next#server-action-cookies) to handle this automatically

## Social Sign-On

Better Auth supports multiple social providers, including Google, GitHub, Apple, Discord, and more. To use a social provider, you need to configure the ones you need in the `socialProviders` option on your `auth` object.

**auth.ts**
```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }
    },
})
```

### Sign in with social providers

To sign in using a social provider you need to call `signIn.social`. It takes an object with the following properties:

**sign-in.ts**
```typescript
import { authClient } from "@/lib/auth-client"; //import the auth client

await authClient.signIn.social({
    /**
     * The social provider ID
     * @example "github", "google", "apple"
     */
    provider: "github",
    /**
     * A URL to redirect after the user authenticates with the provider
     * @default "/"
     */
    callbackURL: "/dashboard",
    /**
     * A URL to redirect if an error occurs during the sign in process
     */
    errorCallbackURL: "/error",
    /**
     * A URL to redirect if the user is newly registered
     */
    newUserCallbackURL: "/welcome",
    /**
     * disable the automatic redirect to the provider.
     * @default false
     */
    disableRedirect: true,
});
```

You can also authenticate using `idToken` or `accessToken` from the social provider instead of redirecting the user to the provider's site. See social providers documentation for more details.

## Signout

To signout a user, you can use the `signOut` function provided by the client.

**user-card.tsx**
```typescript
await authClient.signOut();
```

you can pass `fetchOptions` to redirect onSuccess

**user-card.tsx**
```typescript
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push("/login"); // redirect to login page
    },
  },
});
```

## Session

Once a user is signed in, you'll want to access the user session. Better Auth allows you easily to access the session data from the server and client side.

### Client Side

#### Use Session

Better Auth provides a `useSession` hook to easily access session data on the client side. This hook is implemented using nanostore and has support for each supported framework and vanilla client, ensuring that any changes to the session (such as signing out) are immediately reflected in your UI.

**user.tsx** (React)
```typescript
import { authClient } from "@/lib/auth-client" // import the auth client

export function User(){

    const {
        data: session,
        isPending, //loading state
        error, //error object
        refetch //refetch the session
    } = authClient.useSession()

    return (
        //...
    )
}
```

#### Get Session

If you prefer not to use the hook, you can use the `getSession` method provided by the client.

**user.tsx**
```typescript
import { authClient } from "@/lib/auth-client" // import the auth client

const { data: session, error } = await authClient.getSession()
```

You can also use it with client-side data-fetching libraries like [TanStack Query](https://tanstack.com/query/latest).

### Server Side

The server provides a `session` object that you can use to access the session data. It requires request headers object to be passed to the `getSession` method.

**Example: Using some popular frameworks**

**server.ts** (Next.js)
```typescript
import { auth } from "./auth"; // path to your Better Auth server instance
import { headers } from "next/headers";

const session = await auth.api.getSession({
    headers: await headers() // you need to pass the headers object.
})
```

For more details check [session-management](/docs/concepts/session-management) documentation.

## Using Plugins

One of the unique features of Better Auth is a plugins ecosystem. It allows you to add complex auth related functionality with small lines of code.

Below is an example of how to add two factor authentication using two factor plugin.

### Server Configuration

To add a plugin, you need to import the plugin and pass it to the `plugins` option of the auth instance. For example, to add two factor authentication, you can use the following code:

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { twoFactor } from "better-auth/plugins"

export const auth = betterAuth({
    //...rest of the options
    plugins: [
        twoFactor()
    ]
})
```

now two factor related routes and method will be available on the server.

### Migrate Database

After adding the plugin, you'll need to add the required tables to your database. You can do this by running the `migrate` command, or by using the `generate` command to create the schema and handle the migration manually.

generating the schema:

```bash
npx @better-auth/cli generate
```

using the `migrate` command:

```bash
npx @better-auth/cli migrate
```

If you prefer adding the schema manually, you can check the schema required on the [two factor plugin](/docs/plugins/2fa#schema) documentation.

### Client Configuration

Once we're done with the server, we need to add the plugin to the client. To do this, you need to import the plugin and pass it to the `plugins` option of the auth client. For example, to add two factor authentication, you can use the following code:

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
    plugins: [
        twoFactorClient({
            twoFactorPage: "/two-factor" // the page to redirect if a user need to verify 2nd factor
        })
    ]
})
```

now two factor related methods will be available on the client.

**profile.ts**
```typescript
import { authClient } from "./auth-client"

const enableTwoFactor = async() => {
    const data = await authClient.twoFactor.enable({
        password // the user password is required
    }) // this will enable two factor
}

const disableTwoFactor = async() => {
    const data = await authClient.twoFactor.disable({
        password // the user password is required
    }) // this will disable two factor
}

const signInWith2Factor = async() => {
    const data = await authClient.signIn.email({
        //...
    })
    //if the user has two factor enabled, it will redirect to the two factor page
}

const verifyTOTP = async() => {
    const data = await authClient.twoFactor.verifyTOTP({
        code: "123456", // the code entered by the user
        /**
         * If the device is trusted, the user won't
         * need to pass 2FA again on the same device
         */
        trustDevice: true
    })
}
```

Next step: See the [two factor plugin documentation](/docs/plugins/2fa).
