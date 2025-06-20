# Organization Button Disappearing After Login - Fix Documentation

## Issue Description

When users first register in LibreChat with Better Auth, an organization is created for them and the organization button appears in the sidebar. However, on subsequent logins, the organization button disappears.

## Root Cause

The Better Auth documentation states: "By default when the user is signed in the active organization is set to `null`."

This means that while the organization is created and set as active during registration, it's not persisted in the session for subsequent logins. The `NavOrganizationHeader` component only renders when there's an active organization, causing it to disappear.

## Solution

The fix involves two complementary approaches:

### 1. Server-Side: Database Hooks for New Sessions

Added database hooks to the Better Auth configuration in `LibreChat/api/auth.js`:

```javascript
databaseHooks: {
  session: {
    create: {
      before: async (session) => {
        try {
          // Get user's organization membership
          const memberCollection = db.collection('member');
          const membership = await memberCollection.findOne({ userId: session.userId });
          
          if (membership && membership.organizationId) {
            return {
              data: {
                ...session,
                activeOrganizationId: membership.organizationId,
              },
            };
          }
          
          return session;
        } catch (error) {
          logger.error('Error in session create hook:', error);
          return session;
        }
      },
    },
  },
},
```

This hook runs whenever a new session is created (on login) and attempts to set the user's organization as active in the session.

### 2. Client-Side: Auto-Set Active Organization Hook

Created a custom React hook that follows Better Auth's organization patterns to automatically set the active organization on the client side:

**File**: `LibreChat/client/src/hooks/useAutoSetActiveOrganization.ts`

```typescript
export function useAutoSetActiveOrganization() {
  const hasSetActiveOrg = useRef(false);
  
  // Use Better Auth hooks
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();

  useEffect(() => {
    async function setActiveOrganization() {
      if (session?.user && !activeOrg && !hasSetActiveOrg.current && organizations && organizations.length > 0) {
        hasSetActiveOrg.current = true;
        
        try {
          const firstOrg = organizations[0];
          await authClient.organization.setActive({
            organizationId: firstOrg.id,
          });
        } catch (error) {
          console.error('Error setting active organization:', error);
          hasSetActiveOrg.current = false;
        }
      }
    }

    setActiveOrganization();
  }, [session?.user, activeOrg, organizations]);
}
```

This hook is used in the Root component to ensure it runs when the user is authenticated.

## How It Works

1. **Registration Flow**: 
   - User registers → Organization created → `setActive()` called → Organization visible

2. **Login Flow (After Fix)**:
   - User logs in → New session created
   - Server-side: Database hook attempts to set activeOrganizationId in session
   - Client-side: `useAutoSetActiveOrganization` hook detects no active org and sets it
   - Organization button remains visible

## Better Auth Best Practices Applied

Following the [Better Auth organization documentation](https://www.better-auth.com/docs/plugins/organization):

1. **Using Better Auth Hooks**: The solution uses `useListOrganizations`, `useActiveOrganization`, and `useSession` hooks as recommended.

2. **Setting Active Organization**: Uses `authClient.organization.setActive()` to properly set the active organization.

3. **Database Hooks**: Implements the recommended pattern for setting active organization during session creation.

4. **Client-Side Management**: As the docs state: "You can manage the active organization in the client side only" - our hook provides this capability.

## Testing

To verify the fix:

1. Register a new user
2. Log out
3. Log back in
4. The organization button should remain visible in the sidebar

## Migration for Existing Sessions

Also created a migration script to update existing sessions:

- **File**: `LibreChat/api/db/migrations/ensure-active-organization-in-sessions.js`
- **Purpose**: Updates all existing sessions to include the user's organization
- **Runs**: Automatically on server startup

## Related Files

- `LibreChat/api/auth.js` - Better Auth configuration with database hooks
- `LibreChat/client/src/hooks/useAutoSetActiveOrganization.ts` - Client-side auto-set hook
- `LibreChat/client/src/routes/Root.tsx` - Uses the hook in the main app component
- `LibreChat/api/db/migrations/ensure-active-organization-in-sessions.js` - Migration script
- `LibreChat/client/src/components/Nav/NavOrganizationHeader.tsx` - Component that renders the org button
- `LibreChat/client/src/Providers/OrganizationProvider.tsx` - Provides organization context

## Better Auth Documentation Reference

According to the [Better Auth organization documentation](https://www.better-auth.com/docs/plugins/organization#set-active-organization):

> To set active organization when a session is created you can use database hooks.

This is exactly what we implemented to fix the issue. 