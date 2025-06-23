/**
 * @fileoverview Unit tests for OrganizationDetection component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationDetection } from '../OrganizationDetection';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OrganizationDetection', () => {
  let queryClient: QueryClient;
  const mockOnOrganizationDetected = vi.fn();

  const defaultProps = {
    email: 'user@example.com',
    onOrganizationDetected: mockOnOrganizationDetected,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  const renderWithProviders = (props = defaultProps) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OrganizationDetection {...props} />
      </QueryClientProvider>,
    );
  };

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock pending request
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      renderWithProviders();

      expect(screen.getByText('Checking for existing organization...')).toBeInTheDocument();
    });
  });

  describe('Email Domain Extraction', () => {
    it('should extract domain from email correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      renderWithProviders({ ...defaultProps, email: 'user@company.com' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?domain=company.com',
        );
      });
    });

    it('should not make API call for empty email', () => {
      renderWithProviders({ ...defaultProps, email: '' });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('New Organization Creation', () => {
    it('should show new organization UI when no existing organization found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText("You'll create a new organization")).toBeInTheDocument();
      });

      expect(
        screen.getByText('Set up example.com on Agentis and invite your team'),
      ).toBeInTheDocument();
      expect(screen.getByText("You'll be the organization owner")).toBeInTheDocument();
    });
  });

  describe('Existing Organization Found', () => {
    it('should show existing organization UI when organization found', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Example Corp',
        memberCount: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: mockOrg }),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText("You'll join Example Corp")).toBeInTheDocument();
      });

      expect(screen.getByText('5 team members are already using Agentis')).toBeInTheDocument();
      expect(screen.getByText("You'll be added as a team member")).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should fall back to new organization UI when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText("You'll create a new organization")).toBeInTheDocument();
      });

      expect(
        screen.getByText('Set up example.com on Agentis and invite your team'),
      ).toBeInTheDocument();
      expect(screen.getByText("You'll be the organization owner")).toBeInTheDocument();
    });

    it('should fall back to new organization UI when API returns non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText("You'll create a new organization")).toBeInTheDocument();
      });

      expect(
        screen.getByText('Set up example.com on Agentis and invite your team'),
      ).toBeInTheDocument();
    });
  });

  describe('Callback Functionality', () => {
    it('should call onOrganizationDetected with null when no organization found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(mockOnOrganizationDetected).toHaveBeenCalledWith(null, true);
      });
    });

    it('should call onOrganizationDetected with organization when found', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Example Corp',
        memberCount: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: mockOrg }),
      });

      renderWithProviders();

      await waitFor(() => {
        expect(mockOnOrganizationDetected).toHaveBeenCalledWith(mockOrg, false);
      });
    });
  });

  describe('Component Re-rendering', () => {
    it('should update when email prop changes', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ organization: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ organization: null }),
        });

      const { rerender } = renderWithProviders({ ...defaultProps, email: 'user@first.com' });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?domain=first.com',
        );
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <OrganizationDetection {...defaultProps} email="user@second.com" />
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/auth/organization/check-domain?domain=second.com',
        );
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ organization: null }),
      });

      const { container } = renderWithProviders({ ...defaultProps, className: 'custom-class' });

      await waitFor(() => {
        expect(container.firstChild).toHaveClass('custom-class');
      });
    });
  });
});
