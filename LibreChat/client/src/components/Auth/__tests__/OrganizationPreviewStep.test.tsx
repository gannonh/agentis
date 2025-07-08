/**
 * @fileoverview Unit tests for OrganizationPreviewStep component - Issue #104
 * @module components/Auth/__tests__/OrganizationPreviewStep.test
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import OrganizationPreviewStep from '../OrganizationPreviewStep';
import { ToastProvider } from '~/Providers/ToastContext';

// Mock fetch globally
global.fetch = vi.fn();

// Mock toast context
const mockShowToast = vi.fn();
vi.mock('~/Providers/ToastContext', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock authClient
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    organization: {
      setActive: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe('OrganizationPreviewStep', () => {
  const defaultProps = {
    organization: {
      id: 'org-123',
      name: 'ACME Corporation',
      domain: 'acme.com',
      memberCount: 25,
      allowDomainJoin: true,
    },
    userEmail: 'john@acme.com',
    onNext: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('Auto-Join Flow', () => {
    it('should display organization information and auto-join option when eligible', async () => {
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: true }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait for eligibility check
      await waitFor(() => {
        expect(screen.getByText('ACME Corporation')).toBeInTheDocument();
      });

      // Verify organization details
      expect(screen.getByText('acme.com')).toBeInTheDocument();
      expect(screen.getByText('25 members')).toBeInTheDocument();
      expect(screen.getByText('Auto-join enabled')).toBeInTheDocument();
      expect(screen.getByText(/You can automatically join this organization/)).toBeInTheDocument();

      // Verify join button
      expect(screen.getByRole('button', { name: /Join ACME Corporation/i })).toBeInTheDocument();
    });

    it('should successfully auto-join organization when button clicked', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: true }),
      });

      // Mock auto-join request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          membership: { id: 'member-456', role: 'member' },
        }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Join ACME Corporation/i })).toBeInTheDocument();
      });

      // Click join button
      await user.click(screen.getByRole('button', { name: /Join ACME Corporation/i }));

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/organization/auto-join', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: 'org-123' }),
        });
      });

      // Verify success toast
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Successfully joined ACME Corporation!',
        severity: 'success',
        showIcon: true,
        duration: 3000,
      });

      // Verify onNext was called after async operations complete
      await waitFor(() => {
        expect(defaultProps.onNext).toHaveBeenCalled();
      });
    });

    it('should show request form if auto-join fails', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: true }),
      });

      // Mock failed auto-join
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Domain join disabled' }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait and click join
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Join ACME Corporation/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Join ACME Corporation/i }));

      // Should show error toast
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'Domain join disabled',
          severity: 'error',
          showIcon: true,
          duration: 5000,
        });
      });

      // Should show request form
      expect(screen.getByText('Message to admin (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
    });
  });

  describe('Request-to-Join Flow', () => {
    it('should show request form when not eligible for auto-join', async () => {
      // Mock eligibility check - not eligible
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: false }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait for eligibility check
      await waitFor(() => {
        expect(screen.getByText('ACME Corporation')).toBeInTheDocument();
      });

      // Should show request form
      expect(screen.getByText('Message to admin (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Continue with personal workspace/i })).toBeInTheDocument();
    });

    it('should successfully submit join request', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: false }),
      });

      // Mock join request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          request: { id: 'request-789', status: 'pending' },
        }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait for form
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /Message to admin/i })).toBeInTheDocument();
      });

      // Fill message and submit
      await user.type(
        screen.getByRole('textbox', { name: /Message to admin/i }),
        'I would like to join the team'
      );
      await user.click(screen.getByRole('button', { name: /Request to Join/i }));

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/organization/request-join', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: 'org-123',
            requestMessage: 'I would like to join the team',
          }),
        });
      });

      // Verify success toast
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Join request sent! An admin will review your request.',
        severity: 'success',
        showIcon: true,
        duration: 5000,
      });

      // Verify onNext was called
      expect(defaultProps.onNext).toHaveBeenCalled();
    });

    it('should handle join request errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: false }),
      });

      // Mock failed join request
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'You already have a pending request' }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait and submit
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Request to Join/i }));

      // Should show error toast
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          message: 'You already have a pending request',
          severity: 'error',
          showIcon: true,
          duration: 5000,
        });
      });

      // Should not call onNext
      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });
  });

  describe('UI Interactions', () => {
    it('should allow switching from auto-join to request form', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: true }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait for auto-join UI
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Join ACME Corporation/i })).toBeInTheDocument();
      });

      // Click "Request to join instead"
      await user.click(screen.getByRole('button', { name: /Request to join instead/i }));

      // Should show request form
      expect(screen.getByText('Message to admin (optional)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
    });

    it('should call onSkip when skip button clicked', async () => {
      const user = userEvent.setup();
      
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: false }),
      });

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Wait and click skip
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Continue with personal workspace/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Continue with personal workspace/i }));

      expect(defaultProps.onSkip).toHaveBeenCalled();
    });

    it('should show loading state while checking eligibility', () => {
      // Mock pending eligibility check
      (global.fetch as any).mockImplementationOnce(() => new Promise(() => {}));

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      expect(screen.getByText('Checking organization settings...')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should default to request form if eligibility check fails', async () => {
      // Mock failed eligibility check
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...defaultProps} />
        </ToastProvider>
      );

      // Should show request form as fallback
      await waitFor(() => {
        expect(screen.getByText('Message to admin (optional)')).toBeInTheDocument();
      });
    });

    it('should not show skip button when onSkip prop is not provided', async () => {
      // Mock eligibility check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ canAutoJoin: false }),
      });

      const propsWithoutSkip = { ...defaultProps, onSkip: undefined };

      render(
        <ToastProvider>
          <OrganizationPreviewStep {...propsWithoutSkip} />
        </ToastProvider>
      );

      // Wait for form
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Request to Join/i })).toBeInTheDocument();
      });

      // Should not show skip button
      expect(screen.queryByRole('button', { name: /Continue with personal workspace/i })).not.toBeInTheDocument();
    });
  });
});