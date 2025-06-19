import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import { authClient } from '~/config/betterAuth';

interface OrganizationDetectionResult {
  organization?: {
    id: string;
    name: string;
    slug: string;
    domain: string;
    memberCount?: number;
  } | null;
  isNewDomain: boolean;
  isExistingOrg: boolean;
  isLoading: boolean;
  error: Error | null;
  domain?: string;
}

interface CheckDomainResponse {
  organization?: {
    id: string;
    name: string;
    slug: string;
    domain: string;
    memberCount?: number;
  } | null;
}

/**
 * Hook to detect organization based on email domain
 * @param email - The email address to check
 * @returns Organization detection result with loading and error states
 */
export function useOrganizationDetection(email: string): OrganizationDetectionResult {
  // Extract domain from email
  const domain = email.includes('@') ? email.split('@')[1] : undefined;
  const shouldFetch = !!email && !!domain;

  // Use React Query for API call with caching
  const queryResult = useQuery<CheckDomainResponse>(
    ['organization-detection', email],
    async () => {
      // For now, we'll simulate the API call since checkDomain might not exist yet
      // TODO: Replace with actual API call once backend endpoint is available

      // Temporary mock implementation until backend endpoint exists
      if ((authClient.organization as any).checkDomain) {
        return await (authClient.organization as any).checkDomain({ email });
      }

      // Fallback mock response for testing
      return { organization: null } as CheckDomainResponse;
    },
    {
      enabled: shouldFetch, // Only run if we have a valid email with domain
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (gcTime in v5)
      retry: 1, // Only retry once on failure
    },
  );

  const { data, isLoading, error } = queryResult;

  return {
    organization: data?.organization,
    isNewDomain: !!data && !data.organization,
    isExistingOrg: !!data?.organization,
    isLoading: shouldFetch ? isLoading : false, // Only show loading if we're actually fetching
    error: error as Error | null,
    domain,
  };
}
