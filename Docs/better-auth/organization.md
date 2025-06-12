# Organization

Organizations simplifies user access and permissions management. Assign roles and permissions to streamline project management, team coordination, and partnerships.

## Installation

### Add the plugin to your **auth** config

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"

export const auth = betterAuth({
    plugins: [
        organization()
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

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        organizationClient()
    ]
})
```

## Usage

Once you've installed the plugin, you can start using the organization plugin to manage your organization's members and teams. The client plugin will provide you methods under the `organization` namespace. And the server `api` will provide you with the necessary endpoints to manage your organization and gives you easier way to call the functions on your own backend.

## Organization

### Create an organization

To create an organization, you need to provide:

* `name`: The name of the organization.
* `slug`: The slug of the organization.
* `logo`: The logo of the organization. (Optional)

**auth-client.ts**
```typescript
await authClient.organization.create({
    name: "My Organization",
    slug: "my-org",
    logo: "https://example.com/logo.png"
})
```

#### Restrict who can create an organization

By default, any user can create an organization. To restrict this, set the `allowUserToCreateOrganization` option to a function that returns a boolean, or directly to `true` or `false`.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"

const auth = betterAuth({
    //...
    plugins: [
        organization({
            allowUserToCreateOrganization: async (user) => {
                const subscription = await getSubscription(user.id)
                return subscription.plan === "pro"
            }
        })
    ]
})
```
#### Check if organization slug is taken

To check if an organization slug is taken or not you can use the `checkSlug` function provided by the client. The function takes an object with the following properties:

* `slug`: The slug of the organization.

**auth-client.ts**
```typescript
await authClient.organization.checkSlug({
    slug: "my-org",
});
```

#### Organization Creation Hooks

You can customize the organization creation process using hooks that run before and after an organization is created.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"

export const auth = betterAuth({
    plugins: [
        organization({
            organizationCreation: {
                disabled: false, // Set to true to disable organization creation
                beforeCreate: async ({ organization, user }, request) => {
                    // Run custom logic before organization is created
                    // Optionally modify the organization data
                    return {
                        data: {
                            ...organization,
                            metadata: {
                                customField: "value"
                            }
                        }
                    }
                },
                afterCreate: async ({ organization, member, user }, request) => {
                    // Run custom logic after organization is created
                    // e.g., create default resources, send notifications
                    await setupDefaultResources(organization.id)
                }
            }
        })
    ]
})
```

The `beforeCreate` hook runs before an organization is created. It receives:

* `organization`: The organization data (without ID)
* `user`: The user creating the organization
* `request`: The HTTP request object (optional)

Return an object with `data` property to modify the organization data that will be created.

The `afterCreate` hook runs after an organization is successfully created. It receives:

* `organization`: The created organization (with ID)
* `member`: The member record for the creator
* `user`: The user who created the organization
* `request`: The HTTP request object (optional)
### List User's Organizations

To list the organizations that a user is a member of, you can use `useListOrganizations` hook. It implements a reactive way to get the organizations that the user is a member of.

**client.tsx**
```typescript
import { authClient } from "@/lib/auth-client"

function App(){
    const { data: organizations } = authClient.useListOrganizations()
    return (
        <div>
            {organizations.map(org => <p>{org.name}</p>)}
        </div>
    )
}
```

### Active Organization

Active organization is the workspace the user is currently working on. By default when the user is signed in the active organization is set to `null`. You can set the active organization to the user session.

It's not always you want to persist the active organization in the session. You can manage the active organization in the client side only. For example, multiple tabs can have different active organizations.

#### Set Active Organization

You can set the active organization by calling the `organization.setActive` function. It'll set the active organization for the user session.

**auth-client.ts**
```typescript
import { authClient } from "@/lib/auth-client";

await authClient.organization.setActive({
  organizationId: "organization-id"
})

// you can also use organizationSlug instead of organizationId
await authClient.organization.setActive({
  organizationSlug: "organization-slug"
})
```

To set active organization when a session is created you can use [database hooks](/docs/concepts/database#database-hooks).

**auth.ts**
```typescript
export const auth = betterAuth({
  databaseHooks: {
      session: {
          create: {
              before: async(session)=>{
                  const organization = await getActiveOrganization(session.userId)
                  return {
                    data: {
                      ...session,
                      activeOrganizationId: organization.id
                    }
                  }
              }
          }
      }
  }
})
```
#### Use Active Organization

To retrieve the active organization for the user, you can call the `useActiveOrganization` hook. It returns the active organization for the user. Whenever the active organization changes, the hook will re-evaluate and return the new active organization.

**client.tsx**
```typescript
import { authClient } from "@/lib/auth-client"

function App(){
    const { data: activeOrganization } = authClient.useActiveOrganization()
    return (
        <div>
            {activeOrganization ? <p>{activeOrganization.name}</p> : null}
        </div>
    )
}
```

### Get Full Organization

To get the full details of an organization, you can use the `getFullOrganization` function provided by the client. The function takes an object with the following properties:

* `organizationId`: The ID of the organization. (Optional) – By default, it will use the active organization.
* `organizationSlug`: The slug of the organization. (Optional) – To get the organization by slug.

**auth-client.ts**
```typescript
const organization = await authClient.organization.getFullOrganization({
    query: { organizationId: "organization-id" } // optional, by default it will use the active organization
})
// you can also use organizationSlug instead of organizationId
const organization = await authClient.organization.getFullOrganization({
    query: { organizationSlug: "organization-slug" }
})
```

### Update Organization

To update organization info, you can use `organization.update`

```typescript
await authClient.organization.update({
  data: {
    name: "updated-name",
    logo: "new-logo.url",
    metadata: {
      customerId: "test"
    },
    slug: "updated-slug"
  },
  organizationId: 'org-id' //defaults to the current active organization
})
```

### Delete Organization

To remove user owned organization, you can use `organization.delete`

**org.ts**
```typescript
await authClient.organization.delete({
  organizationId: "test"
});
```

If the user has the necessary permissions (by default: role is owner) in the specified organization, all members, invitations and organization information will be removed.

You can configure how organization deletion is handled through `organizationDeletion` option:

```typescript
const auth = betterAuth({
  plugins: [
    organization({
      organizationDeletion: {
        disabled: true, //to disable it altogether
        beforeDelete: async (data, request) => {
          // a callback to run before deleting org
        },
        afterDelete: async (data, request) => {
          // a callback to run after deleting org
        },
      },
    }),
  ],
});
```
## Invitations

To add a member to an organization, we first need to send an invitation to the user. The user will receive an email/sms with the invitation link. Once the user accepts the invitation, they will be added to the organization.

### Setup Invitation Email

For member invitation to work we first need to provide `sendInvitationEmail` to the `better-auth` instance. This function is responsible for sending the invitation email to the user.

You'll need to construct and send the invitation link to the user. The link should include the invitation ID, which will be used with the acceptInvitation function when the user clicks on it.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"
import { sendOrganizationInvitation } from "./email"

export const auth = betterAuth({
    plugins: [
        organization({
            async sendInvitationEmail(data) {
                const inviteLink = `https://example.com/accept-invitation/${data.id}`
                sendOrganizationInvitation({
                    email: data.email,
                    invitedByUsername: data.inviter.user.name,
                    invitedByEmail: data.inviter.user.email,
                    teamName: data.organization.name,
                    inviteLink
                })
            },
        }),
    ],
});
```

### Send Invitation

To invite users to an organization, you can use the `invite` function provided by the client. The `invite` function takes an object with the following properties:

* `email`: The email address of the user.
* `role`: The role of the user in the organization. It can be `admin`, `member`, or `guest`.
* `organizationId`: The ID of the organization. this is optional by default it will use the active organization. (Optional)

**invitation.ts**
```typescript
await authClient.organization.inviteMember({
    email: "user@example.com",
    role: "admin", //this can also be an array for multiple roles (e.g. ["admin", "sale"])
})
```

* If the user is already a member of the organization, the invitation will be canceled.
* If the user is already invited to the organization, unless `resend` is set to `true`, the invitation will not be sent again.
* If `cancelPendingInvitationsOnReInvite` is set to `true`, the invitation will be canceled if the user is already invited to the organization and a new invitation is sent.
### Accept Invitation

When a user receives an invitation email, they can click on the invitation link to accept the invitation. The invitation link should include the invitation ID, which will be used to accept the invitation.

Make sure to call the `acceptInvitation` function after the user is logged in.

**auth-client.ts**
```typescript
await authClient.organization.acceptInvitation({
    invitationId: "invitation-id"
})
```

### Update Invitation Status

To update the status of invitation you can use the `acceptInvitation`, `cancelInvitation`, `rejectInvitation` functions provided by the client. The functions take the invitation ID as an argument.

**auth-client.ts**
```typescript
//cancel invitation
await authClient.organization.cancelInvitation({
    invitationId: "invitation-id"
})

//reject invitation (needs to be called when the user who received the invitation is logged in)
await authClient.organization.rejectInvitation({
    invitationId: "invitation-id"
})
```

### Get Invitation

To get an invitation you can use the `getInvitation` function provided by the client. You need to provide the invitation ID as a query parameter.

**auth-client.ts**
```typescript
await authClient.organization.getInvitation({
    query: {
        id: params.id
    }
})
```

### List Invitations

To list all invitations you can use the `listInvitations` function provided by the client.

**auth-client.ts**
```typescript
const invitations = await authClient.organization.listInvitations({
    query: {
        organizationId: "organization-id" // optional, by default it will use the active organization
    }
})
```
## Members

### Remove Member

To remove you can use `organization.removeMember`

**auth-client.ts**
```typescript
//remove member
await authClient.organization.removeMember({
    memberIdOrEmail: "member-id", // this can also be the email of the member
    organizationId: "organization-id" // optional, by default it will use the active organization
})
```

### Update Member Role

To update the role of a member in an organization, you can use the `organization.updateMemberRole`. If the user has the permission to update the role of the member, the role will be updated.

**auth-client.ts**
```typescript
await authClient.organization.updateMemberRole({
    memberId: "member-id",
    role: "admin" // this can also be an array for multiple roles (e.g. ["admin", "sale"])
})
```

### Get Active Member

To get the current member of the organization you can use the `organization.getActiveMember` function. This function will return the current active member.

**auth-client.ts**
```typescript
const member = await authClient.organization.getActiveMember()
```

### Add Member

If you want to add a member directly to an organization without sending an invitation, you can use the `addMember` function which can only be invoked on the server.

**api.ts**
```typescript
import { auth } from "@/auth";

await auth.api.addMember({
  body: {
      userId: "user-id",
      organizationId: "organization-id",
      role: "admin", // this can also be an array for multiple roles (e.g. ["admin", "sale"])
      teamId: "team-id" // Optionally specify a teamId to add the member to a team. (requires teams to be enabled)
  }
})
```

### Leave Organization

To leave organization you can use `organization.leave` function. This function will remove the current user from the organization.

**auth-client.ts**
```typescript
await authClient.organization.leave({
    organizationId: "organization-id"
})
```
## Access Control

The organization plugin providers a very flexible access control system. You can control the access of the user based on the role they have in the organization. You can define your own set of permissions based on the role of the user.

### Roles

By default, there are three roles in the organization:

`owner`: The user who created the organization by default. The owner has full control over the organization and can perform any action.

`admin`: Users with the admin role have full control over the organization except for deleting the organization or changing the owner.

`member`: Users with the member role have limited control over the organization. They can create projects, invite users, and manage projects they have created.

A user can have multiple roles. Multiple roles are stored as string separated by comma (",").

### Permissions

By default, there are three resources, and these have two to three actions.

**organization**:
`update` `delete`

**member**:
`create` `update` `delete`

**invitation**:
`create` `cancel`

The owner has full control over all the resources and actions. The admin has full control over all the resources except for deleting the organization or changing the owner. The member has no control over any of those actions other than reading the data.

### Custom Permissions

The plugin provides an easy way to define your own set of permissions for each role.

#### Create Access Control

You first need to create access controller by calling `createAccessControl` function and passing the statement object. The statement object should have the resource name as the key and the array of actions as the value.

**permissions.ts**
```typescript
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

const statement = {
    project: ["create", "share", "update", "delete"],
} as const;

const ac = createAccessControl(statement);

const member = ac.newRole({
    project: ["create"],
});

const admin = ac.newRole({
    project: ["create", "update"],
});

const owner = ac.newRole({
    project: ["create", "update", "delete"],
});

const myCustomRole = ac.newRole({
    project: ["create", "update", "delete"],
    organization: ["update"],
});
```

When you create custom roles for existing roles, the predefined permissions for those roles will be overridden. To add the existing permissions to the custom role, you need to import `defaultStatements` and merge it with your new statement, plus merge the roles' permissions set with the default roles.

**permissions.ts**
```typescript
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from 'better-auth/plugins/organization/access'

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

Once you have created the roles you can pass them to the organization plugin both on the client and the server.

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"
import { ac, owner, admin, member } from "@/auth/permissions"

export const auth = betterAuth({
    plugins: [
        organization({
            ac,
            roles: {
                owner,
                admin,
                member,
                myCustomRole
            }
        }),
    ],
});
```

You also need to pass the access controller and the roles to the client plugin.

**auth-client**
```typescript
import { createAuthClient } from "better-auth/client"
import { organizationClient } from "better-auth/client/plugins"
import { ac, owner, admin, member, myCustomRole } from "@/auth/permissions"

export const authClient = createAuthClient({
    plugins: [
        organizationClient({
            ac,
            roles: {
                owner,
                admin,
                member,
                myCustomRole
            }
        })
  ]
})
```
### Access Control Usage

**Has Permission**:

You can use the `hasPermission` action provided by the `api` to check the permission of the user.

**api.ts**
```typescript
import { auth } from "@/auth";

await auth.api.hasPermission({
  headers: await headers(),
    body: {
      permissions: {
        project: ["create"] // This must match the structure in your access control
      }
    }
});

// You can also check multiple resource permissions at the same time
await auth.api.hasPermission({
  headers: await headers(),
    body: {
      permissions: {
        project: ["create"], // This must match the structure in your access control
        sale: ["create"]
      }
    }
});
```

If you want to check the permission of the user on the client from the server you can use the `hasPermission` function provided by the client.

**auth-client.ts**
```typescript
const canCreateProject = await authClient.organization.hasPermission({
    permissions: {
        project: ["create"]
    }
})

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale = await authClient.organization.hasPermission({
    permissions: {
        project: ["create"],
        sale: ["create"]
    }
})
```

**Check Role Permission**:

Once you have defined the roles and permissions to avoid checking the permission from the server you can use the `checkRolePermission` function provided by the client.

**auth-client.ts**
```typescript
const canCreateProject = authClient.organization.checkRolePermission({
    permissions: {
        organization: ["delete"],
    },
    role: "admin",
});

// You can also check multiple resource permissions at the same time
const canCreateProjectAndCreateSale = authClient.organization.checkRolePermission({
    permissions: {
        organization: ["delete"],
        member: ["delete"]
    },
    role: "admin",
});
```
## Teams

Teams allow you to group members within an organization. The teams feature provides additional organization structure and can be used to manage permissions at a more granular level.

### Enabling Teams

To enable teams, pass the `teams` configuration option to both server and client plugins:

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"

export const auth = betterAuth({
    plugins: [
        organization({
            teams: {
                enabled: true,
                maximumTeams: 10, // Optional: limit teams per organization
                allowRemovingAllTeams: false // Optional: prevent removing the last team
            }
        })
    ]
})
```

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client"
import { organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    plugins: [
        organizationClient({
            teams: {
                enabled: true
            }
        })
    ]
})
```

### Managing Teams

#### Create Team

Create a new team within an organization:

```typescript
const team = await authClient.organization.createTeam({
    name: "Development Team",
    organizationId: "org-id" // Optional: defaults to active organization
})
```

#### List Teams

Get all teams in an organization:

```typescript
const teams = await authClient.organization.listTeams({
  query: {
    organizationId: org.id, // Optional: defaults to active organization
  },
});
```

#### Update Team

Update a team's details:

```typescript
const updatedTeam = await authClient.organization.updateTeam({
    teamId: "team-id",
    data: {
        name: "Updated Team Name"
    }
})
```

#### Remove Team

Delete a team from an organization:

```typescript
await authClient.organization.removeTeam({
    teamId: "team-id",
    organizationId: "org-id" // Optional: defaults to active organization
})
```
### Team Permissions

Teams follow the organization's permission system. To manage teams, users need the following permissions:

* `team:create` - Create new teams
* `team:update` - Update team details
* `team:delete` - Remove teams

By default:

* Organization owners and admins can manage teams
* Regular members cannot create, update, or delete teams

### Team Configuration Options

The teams feature supports several configuration options:

* `maximumTeams`: Limit the number of teams per organization

  ```typescript
  teams: {
    enabled: true,
    maximumTeams: 10 // Fixed number
    // OR
    maximumTeams: async ({ organizationId, session }, request) => {
      // Dynamic limit based on organization plan
      const plan = await getPlan(organizationId)
      return plan === 'pro' ? 20 : 5
    }
  }
  ```

* `allowRemovingAllTeams`: Control whether the last team can be removed

  ```typescript
  teams: {
    enabled: true,
    allowRemovingAllTeams: false // Prevent removing the last team
  }
  ```

### Team Members

When inviting members to an organization, you can specify a team:

```typescript
await authClient.organization.inviteMember({
    email: "user@example.com",
    role: "member",
    teamId: "team-id"
})
```

The invited member will be added to the specified team upon accepting the invitation.

### Database Schema

When teams are enabled, a new `team` table is added with the following structure:

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each team |
| name | string | - | The name of the team |
| organizationId | string | FK | The ID of the organization |
| createdAt | Date | - | Timestamp of when the team was created |
| updatedAt | Date | - | Timestamp of when the team was last updated |
## Schema

The organization plugin adds the following tables to the database:

### Organization

Table Name: `organization`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each organization |
| name | string | - | The name of the organization |
| slug | string | - | The slug of the organization |
| logo | string | ? | The logo of the organization |
| metadata | string | ? | Additional metadata for the organization |
| createdAt | Date | - | Timestamp of when the organization was created |

### Member

Table Name: `member`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each member |
| userId | string | FK | The ID of the user |
| organizationId | string | FK | The ID of the organization |
| role | string | - | The role of the user in the organization |
| createdAt | Date | - | Timestamp of when the member was added to the organization |

### Invitation

Table Name: `invitation`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each invitation |
| email | string | - | The email address of the user |
| inviterId | string | FK | The ID of the inviter |
| organizationId | string | FK | The ID of the organization |
| role | string | - | The role of the user in the organization |
| status | string | - | The status of the invitation |
| expiresAt | Date | - | Timestamp of when the invitation expires |
| createdAt | Date | - | Timestamp of when the invitation was created |

### Session

Table Name: `session`

You need to add one more field to the session table to store the active organization ID.

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| activeOrganizationId | string | ? | The ID of the active organization |

### Teams (optional)

Table Name: `team`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each team |
| name | string | - | The name of the team |
| organizationId | string | FK | The ID of the organization |
| createdAt | Date | - | Timestamp of when the team was created |
| updatedAt | Date | ? | Timestamp of when the team was created |

Table Name: `member`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| teamId | string | ? | The ID of the team |

Table Name: `invitation`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| teamId | string | ? | The ID of the team |
### Customizing the Schema

To change the schema table name or fields, you can pass `schema` option to the organization plugin.

**auth.ts**
```typescript
const auth = betterAuth({
  plugins: [organization({
    schema: {
      organization: {
        modelName: "organizations",  //map the organization table to organizations
        fields: {
          name: "title" //map the name field to title
        }
      }
    }
  })]
})
```

## Options

**allowUserToCreateOrganization**: `boolean` | `((user: User) => Promise<boolean> | boolean)` - A function that determines whether a user can create an organization. By default, it's `true`. You can set it to `false` to restrict users from creating organizations.

**organizationLimit**: `number` | `((user: User) => Promise<boolean> | boolean)` - The maximum number of organizations allowed for a user. By default, it's `5`. You can set it to any number you want or a function that returns a boolean.

**creatorRole**: `admin | owner` - The role of the user who creates the organization. By default, it's `owner`. You can set it to `admin`.

**membershipLimit**: `number` - The maximum number of members allowed in an organization. By default, it's `100`. You can set it to any number you want.

**sendInvitationEmail**: `async (data) => Promise<void>` - A function that sends an invitation email to the user.

**invitationExpiresIn** : `number` - How long the invitation link is valid for in seconds. By default, it's 48 hours (2 days).

**cancelPendingInvitationsOnReInvite**: `boolean` - Whether to cancel pending invitations if the user is already invited to the organization. By default, it's `true`.

**invitationLimit**: `number` | `((user: User) => Promise<boolean> | boolean)` - The maximum number of invitations allowed for a user. By default, it's `100`. You can set it to any number you want or a function that returns a boolean.
