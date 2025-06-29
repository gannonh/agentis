# Admin

The Admin plugin provides a set of administrative functions for user management in your application. It allows administrators to perform various operations such as creating users, managing user roles, banning/unbanning users, impersonating users, and more.

## [Installation](#installation)

### [Add the plugin to your auth config](#add-the-plugin-to-your-auth-config)

To use the Admin plugin, add it to your auth config.

auth.ts

```
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"

export const auth = betterAuth({
    // ... other config options
    plugins: [
        admin()
    ]
})
```

### [Migrate the database](#migrate-the-database)

Run the migration or generate the schema to add the necessary fields and tables to the database.

migrategenerate

```
npx @better-auth/cli migrate
```

See the [Schema](#schema) section to add the fields manually.

### [Add the client plugin](#add-the-client-plugin)

Next, include the admin client plugin in your authentication client instance.

auth-client.ts

```
import { createAuthClient } from "better-auth/client"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        adminClient()
    ]
})
```

## [Usage](#usage)

Before performing any admin operations, the user must be authenticated with an admin account. An admin is any user assigned the `admin` role or any user whose ID is included in the `adminUserIds` option.

### [Create User](#create-user)

Allows an admin to create a new user.

admin.ts

```
const newUser = await authClient.admin.createUser({
  name: "Test User",
  email: "[[email protected]](/cdn-cgi/l/email-protection)",
  password: "password123",
  role: "user", // this can also be an array for multiple roles (e.g. ["user", "sale"])
  data: {
    // any additional on the user table including plugin fields and custom fields
    customField: "customValue",
  },
});
```

### [List Users](#list-users)

Allows an admin to list all users in the database.

admin.ts

```
const users = await authClient.admin.listUsers({
  query: {
    limit: 10,
  },
});
```

By default, 100 users are returned. You can adjust the limit and offset using the following query parameters:

- `search`: The search query to apply to the users. It can be an object with the following properties:
  - `field`: The field to search on, which can be `email` or `name`.
  - `operator`: The operator to use for the search. It can be `contains`, `starts_with`, or `ends_with`.
  - `value`: The value to search for.
- `limit`: The number of users to return.
- `offset`: The number of users to skip.
- `sortBy`: The field to sort the users by.
- `sortDirection`: The direction to sort the users by. Defaults to `asc`.
- `filter`: The filter to apply to the users. It can be an array of objects.

admin.ts

```
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

#### [Query Filtering](#query-filtering)

The `listUsers` function supports various filter operators including `eq`, `contains`, `starts_with`, and `ends_with`.

#### [Pagination](#pagination)

The `listUsers` function supports pagination by returning metadata alongside the user list. The response includes the following fields:

```
{
  users: User[],   // Array of returned users
  total: number,   // Total number of users after filters and search queries
  limit: number | undefined,   // The limit provided in the query
  offset: number | undefined   // The offset provided in the query
}
```

##### [How to Implement Pagination](#how-to-implement-pagination)

To paginate results, use the `total`, `limit`, and `offset` values to calculate:

- **Total pages:** `Math.ceil(total / limit)`
- **Current page:** `(offset / limit) + 1`
- **Next page offset:** `Math.min(offset + limit, (total - 1))` – The value to use as `offset` for the next page, ensuring it does not exceed the total number of pages.
- **Previous page offset:** `Math.max(0, offset - limit)` – The value to use as `offset` for the previous page (ensuring it doesn’t go below zero).

##### [Example Usage](#example-usage)

Fetching the second page with 10 users per page:

admin.ts

```
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

### [Set User Role](#set-user-role)

Changes the role of a user.

admin.ts

```
const updatedUser = await authClient.admin.setRole({
  userId: "user_id_here",
  role: "admin", // this can also be an array for multiple roles (e.g. ["admin", "sale"])
});
```

### [Ban User](#ban-user)

Bans a user, preventing them from signing in and revokes all of their existing sessions.

admin.ts

```
const bannedUser = await authClient.admin.banUser({
  userId: "user_id_here",
  banReason: "Spamming", // Optional (if not provided, the default ban reason will be used - No reason)
  banExpiresIn: 60 * 60 * 24 * 7, // Optional (if not provided, the ban will never expire)
});
```

### [Unban User](#unban-user)

Removes the ban from a user, allowing them to sign in again.

admin.ts

```
const unbannedUser = await authClient.admin.unbanUser({
  userId: "user_id_here",
});
```

### [List User Sessions](#list-user-sessions)

Lists all sessions for a user.

admin.ts

```
const sessions = await authClient.admin.listUserSessions({
  userId: "user_id_here",
});
```

### [Revoke User Session](#revoke-user-session)

Revokes a specific session for a user.

admin.ts

```
const revokedSession = await authClient.admin.revokeUserSession({
  sessionToken: "session_token_here",
});
```

### [Revoke All Sessions for a User](#revoke-all-sessions-for-a-user)

Revokes all sessions for a user.

admin.ts

```
const revokedSessions = await authClient.admin.revokeUserSessions({
  userId: "user_id_here",
});
```

### [Impersonate User](#impersonate-user)

This feature allows an admin to create a session that mimics the specified user. The session will remain active until either the browser session ends or it reaches 1 hour. You can change this duration by setting the `impersonationSessionDuration` option.

admin.ts

```
const impersonatedSession = await authClient.admin.impersonateUser({
  userId: "user_id_here",
});
```

### [Stop Impersonating User](#stop-impersonating-user)

To stop impersonating a user and continue with the admin account, you can use `stopImpersonating`

admin.ts

```
await authClient.admin.stopImpersonating();
```

### [Remove User](#remove-user)

Hard deletes a user from the database.

admin.ts

```
const deletedUser = await authClient.admin.removeUser({
  userId: "user_id_here",
});
```

## [Access Control](#access-control)

The admin plugin offers a highly flexible access control system, allowing you to manage user permissions based on their role. You can define custom permission sets to fit your needs.

### [Roles](#roles)

By default, there are two roles:

`admin`: Users with the admin role have full control over other users.

`user`: Users with the user role have no control over other users.

A user can have multiple roles. Multiple roles are stored as string separated by comma (",").

### [Permissions](#permissions)

By default, there are two resources with up to six permissions.

**user**:
`create` `list` `set-role` `ban` `impersonate` `delete` `set-password`

**session**:
`list` `revoke` `delete`

Users with the admin role have full control over all the resources and actions. Users with the user role have no control over any of those actions.

### [Custom Permissions](#custom-permissions)

The plugin provides an easy way to define your own set of permissions for each role.

#### [Create Access Control](#create-access-control)

You first need to create an access controller by calling the `createAccessControl` function and passing the statement object. The statement object should have the resource name as the key and the array of actions as the value.

permissions.ts

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

#### [Create Roles](#create-roles)

Once you have created the access controller you can create roles with the permissions you have defined.

permissions.ts

```
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

permissions.ts

```
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

#### [Pass Roles to the Plugin](#pass-roles-to-the-plugin)

Once you have created the roles you can pass them to the admin plugin both on the client and the server.

auth.ts

```
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

auth-client.ts

```
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

### [Access Control Usage](#access-control-usage)

**Has Permission**:

To check a user's permissions, you can use the `hasPermission` function provided by the client.

auth-client.ts

```
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

api.ts

```
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

Use the `checkRolePermission` function on the client side to verify whether a given **role** has a specific **permission**. This is helpful after defining roles and their permissions, as it allows you to perform permission checks without needing to contact the server.

Note that this function does **not** check the permissions of the currently logged-in user directly. Instead, it checks what permissions are assigned to a specified role. The function is synchronous, so you don't need to use `await` when calling it.

auth-client.ts

```
const canCreateProject = authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
  },
  role: "admin",
});

// You can also check multiple resource permissions at the same time
const canDeleteUserAndRevokeSession = authClient.admin.checkRolePermission({
  permissions: {
    user: ["delete"],
    session: ["revoke"]
  },
  role: "admin",
});
```

## [Schema](#schema)

This plugin adds the following fields to the `user` table:

| Field Name | Type    | Key | Description                                                             |
| ---------- | ------- | --- | ----------------------------------------------------------------------- |
| role       | string  | ?   | The user's role. Defaults to `user`. Admins will have the `admin` role. |
| banned     | boolean | ?   | Indicates whether the user is banned.                                   |
| banReason  | string  | ?   | The reason for the user's ban.                                          |
| banExpires | date    | ?   | The date when the user's ban will expire.                               |

And adds one field in the `session` table:

| Field Name     | Type   | Key | Description                                             |
| -------------- | ------ | --- | ------------------------------------------------------- |
| impersonatedBy | string | ?   | The ID of the admin that is impersonating this session. |

## [Options](#options)

### [Default Role](#default-role)

The default role for a user. Defaults to `user`.

auth.ts

```
admin({
  defaultRole: "regular",
});
```

### [Admin Roles](#admin-roles)

The roles that are considered admin roles. Defaults to `["admin"]`.

auth.ts

```
admin({
  adminRoles: ["admin", "superadmin"],
});
```

Any role that isn't in the `adminRoles` list, even if they have the permission,
will not be considered an admin.

### [Admin userIds](#admin-userids)

You can pass an array of userIds that should be considered as admin. Default to `[]`

auth.ts

```
admin({
    adminUserIds: ["user_id_1", "user_id_2"]
})
```

If a user is in the `adminUserIds` list, they will be able to perform any admin operation.

### [impersonationSessionDuration](#impersonationsessionduration)

The duration of the impersonation session in seconds. Defaults to 1 hour.

auth.ts

```
admin({
  impersonationSessionDuration: 60 * 60 * 24, // 1 day
});
```

### [Default Ban Reason](#default-ban-reason)

The default ban reason for a user created by the admin. Defaults to `No reason`.

auth.ts

```
admin({
  defaultBanReason: "Spamming",
});
```

### [Default Ban Expires In](#default-ban-expires-in)

The default ban expires in for a user created by the admin in seconds. Defaults to `undefined` (meaning the ban never expires).

auth.ts

```
admin({
  defaultBanExpiresIn: 60 * 60 * 24, // 1 day
});
```

### [bannedUserMessage](#bannedusermessage)

The message to show when a banned user tries to sign in. Defaults to "You have been banned from this application. Please contact support if you believe this is an error."

auth.ts

```
admin({
  bannedUserMessage: "Custom banned user message",
});
```

[### One Tap

One Tap plugin for Better Auth](/docs/plugins/one-tap)[### API Key

API Key plugin for Better Auth.](/docs/plugins/api-key)[Edit on GitHub](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/admin.mdx)

### On this page

[Installation](#installation)[Add the plugin to your auth config](#add-the-plugin-to-your-auth-config)[Migrate the database](#migrate-the-database)[Add the client plugin](#add-the-client-plugin)[Usage](#usage)[Create User](#create-user)[List Users](#list-users)[Query Filtering](#query-filtering)[Pagination](#pagination)[How to Implement Pagination](#how-to-implement-pagination)[Example Usage](#example-usage)[Set User Role](#set-user-role)[Ban User](#ban-user)[Unban User](#unban-user)[List User Sessions](#list-user-sessions)[Revoke User Session](#revoke-user-session)[Revoke All Sessions for a User](#revoke-all-sessions-for-a-user)[Impersonate User](#impersonate-user)[Stop Impersonating User](#stop-impersonating-user)[Remove User](#remove-user)[Access Control](#access-control)[Roles](#roles)[Permissions](#permissions)[Custom Permissions](#custom-permissions)[Create Access Control](#create-access-control)[Create Roles](#create-roles)[Pass Roles to the Plugin](#pass-roles-to-the-plugin)[Access Control Usage](#access-control-usage)[Schema](#schema)[Options](#options)[Default Role](#default-role)[Admin Roles](#admin-roles)[Admin userIds](#admin-userids)[impersonationSessionDuration](#impersonationsessionduration)[Default Ban Reason](#default-ban-reason)[Default Ban Expires In](#default-ban-expires-in)[bannedUserMessage](#bannedusermessage)
