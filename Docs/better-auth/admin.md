# Admin

The Admin plugin provides a set of administrative functions for user management in your application. It allows administrators to perform various operations such as creating users, managing user roles, banning/unbanning users, impersonating users, and more.

## Installation

### Add the plugin to your auth config

To use the Admin plugin, add it to your auth config.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
    // ... other config options
    plugins: [
        admin()
    ]
})
```

### Migrate the database

Run the migration or generate the schema to add the necessary fields and tables to the database.

```bash
npx @better-auth/cli migrate
```

See the [Schema](#schema) section to add the fields manually.

### Add the client plugin

Next, include the admin client plugin in your authentication client instance.

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        adminClient()
    ]
})
```

## Usage

Before performing any admin operations, the user must be authenticated with an admin account. An admin is any user assigned the `admin` role or any user whose ID is included in the `adminUserIds` option.

### Create User

Allows an admin to create a new user.

**admin.ts**
```typescript
const newUser = await authClient.admin.createUser({
  name: "Test User",
  email: "user@example.com",
  password: "password123",
  role: "user", // this can also be an array for multiple roles (e.g. ["user", "sale"])
  data: {
    // any additional on the user table including plugin fields and custom fields
    customField: "customValue",
  },
});
```

### List Users

Allows an admin to list all users in the database.

**admin.ts**
```typescript
const users = await authClient.admin.listUsers({
  query: {
    limit: 10,
  },
});
```

By default, 100 users are returned. You can adjust the limit and offset using the following query parameters:

* `search`: The search query to apply to the users. It can be an object with the following properties:
  + `field`: The field to search on, which can be `email` or `name`.
  + `operator`: The operator to use for the search. It can be `contains`, `starts_with`, or `ends_with`.
  + `value`: The value to search for.
* `limit`: The number of users to return.
* `offset`: The number of users to skip.
* `sortBy`: The field to sort the users by.
* `sortDirection`: The direction to sort the users by. Defaults to `asc`.
* `filter`: The filter to apply to the users. It can be an array of objects.

**admin.ts**
```typescript
const users = await authClient.admin.listUsers({
    query: {
        searchField: "email",
        searchOperator: "contains",
        searchValue: "@example.com",
        limit: 10,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
        filterField: "role",
        filterOperator: "eq",
        filterValue: "admin"
    }
});
```
#### Query Filtering

The `listUsers` function supports various filter operators including `eq`, `contains`, `starts_with`, and `ends_with`.

#### Pagination

The `listUsers` function supports pagination by returning metadata alongside the user list. The response includes the following fields:

```typescript
{
  users: User[],   // Array of returned users
  total: number,   // Total number of users after filters and search queries
  limit: number | undefined,   // The limit provided in the query
  offset: number | undefined   // The offset provided in the query
}
```

##### How to Implement Pagination

To paginate results, use the `total`, `limit`, and `offset` values to calculate:

* **Total pages:** `Math.ceil(total / limit)`
* **Current page:** `(offset / limit) + 1`
* **Next page offset:** `Math.min(offset + limit, (total - 1))` – The value to use as `offset` for the next page, ensuring it does not exceed the total number of pages.
* **Previous page offset:** `Math.max(0, offset - limit)` – The value to use as `offset` for the previous page (ensuring it doesn't go below zero).

##### Example Usage

Fetching the second page with 10 users per page:

**admin.ts**
```typescript
const pageSize = 10;
const currentPage = 2;

const users = await authClient.admin.listUsers({
    query: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
    }
});

const totalUsers = users.total;
const totalPages = Math.ceil(totalUsers / limit)
```

### Set User Role

Changes the role of a user.

**admin.ts**
```typescript
const updatedUser = await authClient.admin.setRole({
  userId: "user_id_here",
  role: "admin", // this can also be an array for multiple roles (e.g. ["admin", "sale"])
});
```

### Ban User

Bans a user, preventing them from signing in and revokes all of their existing sessions.

**admin.ts**
```typescript
const bannedUser = await authClient.admin.banUser({
  userId: "user_id_here",
  banReason: "Spamming", // Optional (if not provided, the default ban reason will be used - No reason)
  banExpiresIn: 60 * 60 * 24 * 7, // Optional (if not provided, the ban will never expire)
});
```

### Unban User

Removes the ban from a user, allowing them to sign in again.

**admin.ts**
```typescript
const unbannedUser = await authClient.admin.unbanUser({
  userId: "user_id_here",
});
```

### List User Sessions

Lists all sessions for a user.

**admin.ts**
```typescript
const sessions = await authClient.admin.listUserSessions({
  userId: "user_id_here",
});
```

### Revoke User Session

Revokes a specific session for a user.

**admin.ts**
```typescript
const revokedSession = await authClient.admin.revokeUserSession({
  sessionToken: "session_token_here",
});
```

### Revoke All Sessions for a User

Revokes all sessions for a user.

**admin.ts**
```typescript
const revokedSessions = await authClient.admin.revokeUserSessions({
  userId: "user_id_here",
});
```
import { createAccessControl } from "better-auth/plugins/access";

/**
 * make sure to use `as const` so typescript can infer the type correctly
 */
const statement = {
    project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);
```

#### Create Roles

Once you have created the access controller you can create roles with the permissions you have defined.

**permissions.ts**
```typescript
import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
    project: ["create", "share", "update", "delete"], // <-- Permissions available for created roles
} as const;

const ac = createAccessControl(statement);

export const user = ac.newRole({
    project: ["create"],
});

export const admin = ac.newRole({
    project: ["create", "update"],
});

export const myCustomRole = ac.newRole({
    project: ["create", "update", "delete"],
    user: ["ban"],
});
```

When you create custom roles for existing roles, the predefined permissions for those roles will be overridden. To add the existing permissions to the custom role, you need to import `defaultStatements` and merge it with your new statement, plus merge the roles' permissions set with the default roles.

**permissions.ts**
```typescript
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
    ...defaultStatements,
    project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const admin = ac.newRole({
    project: ["create", "update"],
    ...adminAc.statements,
});
```

#### Pass Roles to the Plugin

Once you have created the roles you can pass them to the admin plugin both on the client and the server.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { ac, admin, user } from "@/auth/permissions"

export const auth = betterAuth({
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                user,
                myCustomRole
            }
        }),
    ],
});
```

You also need to pass the access controller and the roles to the client plugin.

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"
import { ac, admin, user, myCustomRole } from "@/auth/permissions"

export const client = createAuthClient({
    plugins: [
        adminClient({
            ac,
            roles: {
                admin,
                user,
                myCustomRole
            }
        })
    ]
})
```
### Access Control Usage

**Has Permission**:

To check a user's permissions, you can use the `hasPermission` function provided by the client.

**auth-client.ts**
```typescript
const canCreateProject = await authClient.admin.hasPermission({
  permissions: {
    project: ["create"],
  },
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale = await authClient.admin.hasPermission({
  permissions: {
    project: ["create"],
    sale: ["create"]
  },
});
```

If you want to check a user's permissions server-side, you can use the `userHasPermission` action provided by the `api` to check the user's permissions.

**api.ts**
```typescript
import { auth } from "@/auth";

await auth.api.userHasPermission({
  body: {
    userId: 'id', //the user id
    permissions: {
      project: ["create"], // This must match the structure in your access control
    },
  },
});

// You can also just pass the role directly
await auth.api.userHasPermission({
  body: {
   role: "admin",
    permissions: {
      project: ["create"], // This must match the structure in your access control
    },
  },
});

// You can also check multiple resource permissions at the same time
await auth.api.userHasPermission({
  body: {
   role: "admin",
    permissions: {
      project: ["create"], // This must match the structure in your access control
      sale: ["create"]
    },
  },
});
```

**Check Role Permission**:

Once you have defined the roles and permissions to avoid checking the permission from the server you can use the `checkRolePermission` function provided by the client.

**auth-client.ts**
```typescript
const canCreateProject = await authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
  },
  role: "admin",
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndRevokeSession = await authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
    session: ["revoke"]
  },
  role: "admin",
});
```

## Schema

This plugin adds the following fields to the `user` table:

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| role | string | ? | The user's role. Defaults to `user`. Admins will have the `admin` role. |
| banned | boolean | ? | Indicates whether the user is banned. |
| banReason | string | ? | The reason for the user's ban. |
| banExpires | date | ? | The date when the user's ban will expire. |

And adds one field in the `session` table:

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| impersonatedBy | string | ? | The ID of the admin that is impersonating this session. |

## Options

### Default Role

The default role for a user. Defaults to `user`.

**auth.ts**
```typescript
admin({
  defaultRole: "regular",
});
```

### Admin Roles

The roles that are considered admin roles. Defaults to `["admin"]`.

**auth.ts**
```typescript
admin({
  adminRoles: ["admin", "superadmin"],
});
```

Any role that isn't in the `adminRoles` list, even if they have the permission, will not be considered an admin.

### Admin userIds

You can pass an array of userIds that should be considered as admin. Default to `[]`

**auth.ts**
```typescript
admin({
    adminUserIds: ["user_id_1", "user_id_2"]
})
```

If a user is in the `adminUserIds` list, they will be able to perform any admin operation.

### impersonationSessionDuration

The duration of the impersonation session in seconds. Defaults to 1 hour.

**auth.ts**
```typescript
admin({
  impersonationSessionDuration: 60 * 60 * 24, // 1 day
});
```

### Default Ban Reason

The default ban reason for a user created by the admin. Defaults to `No reason`.

**auth.ts**
```typescript
admin({
  defaultBanReason: "Spamming",
});
```

### Default Ban Expires In

The default ban expires in for a user created by the admin in seconds. Defaults to `undefined` (meaning the ban never expires).

**auth.ts**
```typescript
admin({
  defaultBanExpiresIn: 60 * 60 * 24, // 1 day
});
```

### bannedUserMessage

The message to show when a banned user tries to sign in. Defaults to "You have been banned from this application. Please contact support if you believe this is an error."

**auth.ts**
```typescript
admin({
  bannedUserMessage: "Custom banned user message",
});
```
