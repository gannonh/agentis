# Database

## Adapters

Better Auth requires a database connection to store data. It comes with a query builder called [Kysely](https://kysely.dev/) to manage and query your database. The database will be used to store data such as users, sessions, and more. Plugins can also define their own database tables to store data.

You can pass a database connection to Better Auth by passing a supported database instance, a dialect instance or a Kysely instance in the database options.

You can learn more about supported Kysely dialects in the [Other relational databases](/docs/adapters/other-relational-databases) documentation. Or if you're using an ORM, you can find our supported ORM adapters in that same category on the documentation sidebar.

## CLI

Better Auth comes with a CLI tool to manage database migrations and generate schema.

### Running Migrations

The cli checks your database and prompts you to add missing tables or update existing ones with new columns. This is only supported for the built-in Kysely adapter. For other adapters, you can use the `generate` command to create the schema and handle the migration through your ORM.

```bash
npx @better-auth/cli migrate
```

### Generating Schema

Better Auth also provides a `generate` command to generate the schema required by Better Auth. The `generate` command creates the schema required by Better Auth. If you're using a database adapter like Prisma or Drizzle, this command will generate the right schema for your ORM. If you're using the built-in Kysely adapter, it will generate an SQL file you can run directly on your database.

```bash
npx @better-auth/cli generate
```

See the [CLI](/docs/concepts/cli) documentation for more information on the CLI.

If you prefer adding tables manually, you can do that as well. The core schema required by Better Auth is described below and you can find additional schema required by plugins in the plugin documentation.

## Secondary Storage

Secondary storage in Better Auth allows you to use key-value stores for managing session data, rate limiting counters, etc. This can be useful when you want to offload the storage of this intensive records to a high performance storage or even RAM.

### Implementation

To use secondary storage, implement the `SecondaryStorage` interface:

```typescript
interface SecondaryStorage {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}
```

Then, provide your implementation to the `betterAuth` function:

```typescript
betterAuth({
  // ... other options
  secondaryStorage: {
    // Your implementation here
  },
});
```

**Example: Redis Implementation**

Here's a basic example using Redis:

```typescript
import { createClient } from "redis";
import { betterAuth } from "better-auth";

const redis = createClient();
await redis.connect();

export const auth = betterAuth({
  // ... other options
  secondaryStorage: {
    get: async (key) => {
      const value = await redis.get(key);
      return value ? value : null;
    },
    set: async (key, value, ttl) => {
      if (ttl) await redis.set(key, value, { EX: ttl });
      // or for ioredis:
      // if (ttl) await redis.set(key, value, 'EX', ttl)
      else await redis.set(key, value);
    },
    delete: async (key) => {
      await redis.del(key);
    }
  }
});
```

This implementation allows Better Auth to use Redis for storing session data and rate limiting counters. You can also add prefixes to the keys names.

## Core Schema

Better Auth requires the following tables to be present in the database. The types are in `typescript` format. You can use corresponding types in your database.

### User

Table Name: `user`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each user |
| name | string | - | User's chosen display name |
| email | string | - | User's email address for communication and login |
| emailVerified | boolean | - | Whether the user's email is verified |
| image | string | ? | User's image url |
| createdAt | Date | - | Timestamp of when the user account was created |
| updatedAt | Date | - | Timestamp of the last update to the user's information |

### Session

Table Name: `session`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each session |
| userId | string | FK | The ID of the user |
| token | string | - | The unique session token |
| expiresAt | Date | - | The time when the session expires |
| ipAddress | string | ? | The IP address of the device |
| userAgent | string | ? | The user agent information of the device |
| createdAt | Date | - | Timestamp of when the session was created |
| updatedAt | Date | - | Timestamp of when the session was updated |

### Account

Table Name: `account`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each account |
| userId | string | FK | The ID of the user |
| accountId | string | - | The ID of the account as provided by the SSO or equal to userId for credential accounts |
| providerId | string | - | The ID of the provider |
| accessToken | string | ? | The access token of the account. Returned by the provider |
| refreshToken | string | ? | The refresh token of the account. Returned by the provider |
| accessTokenExpiresAt | Date | ? | The time when the access token expires |
| refreshTokenExpiresAt | Date | ? | The time when the refresh token expires |
| scope | string | ? | The scope of the account. Returned by the provider |
| idToken | string | ? | The ID token returned from the provider |
| password | string | ? | The password of the account. Mainly used for email and password authentication |
| createdAt | Date | - | Timestamp of when the account was created |
| updatedAt | Date | - | Timestamp of when the account was updated |

### Verification

Table Name: `verification`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each verification |
| identifier | string | - | The identifier for the verification request |
| value | string | - | The value to be verified |
| expiresAt | Date | - | The time when the verification request expires |
| createdAt | Date | - | Timestamp of when the verification request was created |
| updatedAt | Date | - | Timestamp of when the verification request was updated |

## Custom Tables

Better Auth allows you to customize the table names and column names for the core schema. You can also extend the core schema by adding additional fields to the user and session tables.

### Custom Table Names

You can customize the table names and column names for the core schema by using the `modelName` and `fields` properties in your auth config:

**auth.ts**
```typescript
export const auth = betterAuth({
  user: {
    modelName: "users",
    fields: {
      name: "full_name",
      email: "email_address",
    },
  },
  session: {
    modelName: "user_sessions",
    fields: {
      userId: "user_id",
    },
  },
});
```

Type inference in your code will still use the original field names (e.g., `user.name`, not `user.full_name`).

To customize table names and column name for plugins, you can use the `schema` property in the plugin config:

**auth.ts**
```typescript
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      schema: {
        user: {
          fields: {
            twoFactorEnabled: "two_factor_enabled",
            secret: "two_factor_secret",
          },
        },
      },
    }),
  ],
});
```

### Extending Core Schema

Better Auth provides a type-safe way to extend the `user` and `session` schemas. You can add custom fields to your auth config, and the CLI will automatically update the database schema. These additional fields will be properly inferred in functions like `useSession`, `signUp.email`, and other endpoints that work with user or session objects.

To add custom fields, use the `additionalFields` property in the `user` or `session` object of your auth config. The `additionalFields` object uses field names as keys, with each value being a `FieldAttributes` object containing:

* `type`: The data type of the field (e.g., "string", "number", "boolean").
* `required`: A boolean indicating if the field is mandatory.
* `defaultValue`: The default value for the field (note: this only applies in the JavaScript layer; in the database, the field will be optional).
* `input`: This determines whether a value can be provided when creating a new record (default: `true`). If there are additional fields, like `role`, that should not be provided by the user during signup, you can set this to `false`.

Here's an example of how to extend the user schema with additional fields:

**auth.ts**
```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
      lang: {
        type: "string",
        required: false,
        defaultValue: "en",
      },
    },
  },
});
```

Now you can access the additional fields in your application logic.

```typescript
//on signup
const res = await auth.api.signUpEmail({
  email: "user@example.com",
  password: "password",
  name: "John Doe",
  lang: "fr",
});

//user object
res.user.role; // > "admin"
res.user.lang; // > "fr"
```

See the [TypeScript](/docs/concepts/typescript#inferring-additional-fields-on-client) documentation for more information on how to infer additional fields on the client side.

If you're using social / OAuth providers, you may want to provide `mapProfileToUser` to map the profile data to the user object. So, you can populate additional fields from the provider's profile.

**Example: Mapping Profile to User For `firstName` and `lastName`**

**auth.ts**
```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: "YOUR_GITHUB_CLIENT_ID",
      clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.name.split(" ")[0],
          lastName: profile.name.split(" ")[1],
        };
      },
    },
    google: {
      clientId: "YOUR_GOOGLE_CLIENT_ID",
      clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
      mapProfileToUser: (profile) => {
        return {
          firstName: profile.given_name,
          lastName: profile.family_name,
        };
      },
    },
  },
});
```

### ID Generation

Better Auth by default will generate unique IDs for users, sessions, and other entities. If you want to customize how IDs are generated, you can configure this in the `advanced.database.generateId` option in your auth config.

You can also disable ID generation by setting the `advanced.database.generateId` option to `false`. This will assume your database will generate the ID automatically.

**Example: Automatic Database IDs**

**auth.ts**
```typescript
import { betterAuth } from "better-auth";
import { db } from "./db";

export const auth = betterAuth({
  database: {
    db: db,
  },
  advanced: {
    database: {
      generateId: false,
    },
  },
});
```

### Database Hooks

Database hooks allow you to define custom logic that can be executed during the lifecycle of core database operations in Better Auth. You can create hooks for the following models: **user**, **session**, and **account**.

There are two types of hooks you can define:

#### 1. Before Hook

* **Purpose**: This hook is called before the respective entity (user, session, or account) is created or updated.
* **Behavior**: If the hook returns `false`, the operation will be aborted. And If it returns a data object, it'll replace the original payload.

#### 2. After Hook

* **Purpose**: This hook is called after the respective entity is created or updated.
* **Behavior**: You can perform additional actions or modifications after the entity has been successfully created or updated.

**Example Usage**

**auth.ts**
```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // Modify the user object before it is created
          return {
            data: {
              ...user,
              firstName: user.name.split(" ")[0],
              lastName: user.name.split(" ")[1],
            },
          };
        },
        after: async (user) => {
          //perform additional actions, like creating a stripe customer
        },
      },
    },
  },
});
```

#### Throwing Errors

If you want to stop the database hook from proceeding, you can throw errors using the `APIError` class imported from `better-auth/api`.

**auth.ts**
```typescript
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (user.isAgreedToTerms === false) {
            // Your special condition.
            // Send the API error.
            throw new APIError("BAD_REQUEST", {
              message: "User must agree to the TOS before signing up.",
            });
          }
          return {
            data: user,
          };
        },
      },
    },
  },
});
```

Much like standard hooks, database hooks also provide a `ctx` object that offers a variety of useful properties. Learn more in the [Hooks Documentation](/docs/concepts/hooks#ctx).

## Plugins Schema

Plugins can define their own tables in the database to store additional data. They can also add columns to the core tables to store additional data. For example, the two factor authentication plugin adds the following columns to the `user` table:

* `twoFactorEnabled`: Whether two factor authentication is enabled for the user.
* `twoFactorSecret`: The secret key used to generate TOTP codes.
* `twoFactorBackupCodes`: Encrypted backup codes for account recovery.

To add new tables and columns to your database, you have two options:

`CLI`: Use the migrate or generate command. These commands will scan your database and guide you through adding any missing tables or columns.
`Manual Method`: Follow the instructions in the plugin documentation to manually add tables and columns.

Both methods ensure your database schema stays up to date with your plugins' requirements.
