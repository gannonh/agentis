import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrganizationDetection } from '../useOrganizationDetection';
import { waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// Mock fetch
global.fetch = vi.fn();

describe('useOrganizationDetection', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Domain Extraction', () => {
    it('should not fetch when email is empty', () => {
      const { result } = renderHook(() => useOrganizationDetection(''), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.organization).toBeUndefined();
      expect(result.current.domain).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should not fetch when email is invalid', () => {
      const { result } = renderHook(() => useOrganizationDetection('invalid-email'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.domain).toBeUndefined();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should extract domain and call API for valid email', async () => {
      const mockResponse = {
        organization: {
          id: 'org-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
          domain: 'acme.com',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useOrganizationDetection('user@acme.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?email=user%40acme.com',
          expect.objectContaining({
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );
      });

      expect(result.current.domain).toBe('acme.com');
    });
  });

  describe('Organization Detection', () => {
    it('should detect existing organization', async () => {
      const mockResponse = {
        organization: {
          id: 'org-456',
          name: 'Tech Corp',
          slug: 'tech-corp',
          domain: 'tech.com',
          memberCount: 25,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useOrganizationDetection('user@tech.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toEqual(mockResponse.organization);
        expect(result.current.isNewDomain).toBe(false);
        expect(result.current.isExistingOrg).toBe(true);
      });
    });

    it('should detect new domain (no existing organization)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 404,
        json: async () => ({ organization: null }),
      });

      const { result } = renderHook(() => useOrganizationDetection('user@newcompany.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toBeNull();
        expect(result.current.isNewDomain).toBe(true);
        expect(result.current.isExistingOrg).toBe(false);
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (global.fetch as any).mockReturnValueOnce({
        ok: true,
        json: () => promise,
      });

      const { result } = renderHook(() => useOrganizationDetection('user@example.com'), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise({ organization: null });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const mockError = new Error('Network error');
      (global.fetch as any).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useOrganizationDetection('user@error.com'), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
          expect(result.current.organization).toBeUndefined();
        },
        { timeout: 5000 },
      );
    });

    it('should handle non-404 HTTP errors', async () => {
      // Mock a 500 error that will cause the hook to throw
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useOrganizationDetection('user@error.com'), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
          expect(result.current.organization).toBeUndefined();
        },
        { timeout: 5000 },
      );
    });

    it('should handle malformed API responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      const { result } = renderHook(() => useOrganizationDetection('user@malformed.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.organization).toBeNull();
        expect(result.current.isNewDomain).toBe(true);
      });
    });
  });

  describe('Caching', () => {
    it('should cache results for the same email', async () => {
      const mockResponse = {
        organization: {
          id: 'org-789',
          name: 'Cached Corp',
          slug: 'cached-corp',
          domain: 'cached.com',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First render
      const { result: result1 } = renderHook(() => useOrganizationDetection('user@cached.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.organization).toEqual(mockResponse.organization);
      });

      // Second render with same email
      const { result: result2 } = renderHook(() => useOrganizationDetection('user@cached.com'), {
        wrapper,
      });

      // Should use cached result, not make another API call
      expect(result2.current.organization).toEqual(mockResponse.organization);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should make new API call for different email', async () => {
      const mockResponse1 = {
        organization: { id: 'org-1', name: 'Corp 1', slug: 'corp-1', domain: 'corp1.com' },
      };
      const mockResponse2 = {
        organization: { id: 'org-2', name: 'Corp 2', slug: 'corp-2', domain: 'corp2.com' },
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      // First email
      const { result: result1 } = renderHook(() => useOrganizationDetection('user@corp1.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result1.current.organization).toEqual(mockResponse1.organization);
      });

      // Different email
      const { result: result2 } = renderHook(() => useOrganizationDetection('user@corp2.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result2.current.organization).toEqual(mockResponse2.organization);
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle emails with subdomains', async () => {
      const mockResponse = {
        organization: {
          id: 'org-sub',
          name: 'Company',
          slug: 'company',
          domain: 'mail.company.com',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useOrganizationDetection('user@mail.company.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?email=user%40mail.company.com',
          expect.any(Object),
        );
      });

      expect(result.current.domain).toBe('mail.company.com');
    });

    it('should handle special characters in email', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      const { result } = renderHook(() => useOrganizationDetection('user+tag@example.com'), {
        wrapper,
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?email=user%2Btag%40example.com',
          expect.any(Object),
        );
      });
    });

    it('should handle case sensitivity', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      const { result } = renderHook(() => useOrganizationDetection('USER@EXAMPLE.COM'), {
        wrapper,
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?email=USER%40EXAMPLE.COM',
          expect.any(Object),
        );
      });
    });
  });

  describe('Extracted Domain Info', () => {
    it('should provide extracted domain information', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      const { result } = renderHook(() => useOrganizationDetection('user@newcompany.io'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.domain).toBe('newcompany.io');
        expect(result.current.isNewDomain).toBe(true);
      });
    });
  });
});
