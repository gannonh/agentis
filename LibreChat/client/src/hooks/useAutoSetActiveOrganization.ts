/**
 * @fileoverview Hook to automatically set active organization after login
 * @module hooks/useAutoSetActiveOrganization
 */

import { useEffect, useRef } from 'react';
import { authClient } from '~/config/betterAuth';

/**
 * Hook that automatically sets the active organization for the user after login
 * This ensures the organization button remains visible in the sidebar
 *
 * Following Better Auth's organization patterns:
 * - Uses useListOrganizations hook to get user's organizations
 * - Uses authClient.organization.setActive() to set the active organization
 */
export function useAutoSetActiveOrganization() {
  const hasSetActiveOrg = useRef(false);

  // Get current session and active organization using Better Auth hooks
  const { data: session } = authClient.useSession();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const { data: organizations } = authClient.useListOrganizations();

  useEffect(() => {
    async function setActiveOrganization() {
      // Only run if:
      // 1. User is logged in (has session)
      // 2. No active organization is set
      // 3. We haven't already tried to set it
      // 4. Organizations list is loaded
      if (
        session?.user &&
        !activeOrg &&
        !hasSetActiveOrg.current &&
        organizations &&
        organizations.length > 0
      ) {
        hasSetActiveOrg.current = true;

        try {
          // Set the first organization as active (in Phase 1, users only have one org)
          const firstOrg = organizations[0];
          console.log('🏢 Setting active organization:', firstOrg.name);

          await authClient.organization.setActive({
            organizationId: firstOrg.id,
          });

          console.log('✅ Active organization set successfully');
        } catch (error) {
          console.error('❌ Error setting active organization:', error);
          hasSetActiveOrg.current = false; // Reset so it can retry
        }
      }
    }

    setActiveOrganization();
  }, [session?.user, activeOrg, organizations]);

  // Reset the flag when user logs out
  useEffect(() => {
    if (!session?.user) {
      hasSetActiveOrg.current = false;
    }
  }, [session?.user]);
}
