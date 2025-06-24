import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import AdminGuard from '../AdminGuard';

// Mock Better Auth client
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

// Import the mocked module to get typed access to the mocks
const { authClient } = await import('~/config/betterAuth');
const mockUseSession = authClient.useSession as Mock;

// Mock Navigate component to track redirects
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => {
      mockNavigate({ to, replace });
      return null;
    },
  };
});

describe('AdminGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminGuard = (children: React.ReactNode = <div>Admin Content</div>) => {
    return render(
      <MemoryRouter>
        <AdminGuard>{children}</AdminGuard>
      </MemoryRouter>,
    );
  };

  describe('Loading State', () => {
    it('shows loading spinner when session is loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      renderAdminGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Admin Access', () => {
    it('renders children when user has admin role', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'admin-user', 
            email: 'admin@example.com',
            role: 'admin' 
          } 
        },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('allows access when user is in adminUserIds list', () => {
      // Better Auth admin plugin sets role to 'admin' for users in adminUserIds
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'special-admin-id', 
            email: 'special@example.com',
            role: 'admin' // Better Auth will set this for adminUserIds
          } 
        },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Non-Admin Access', () => {
    it('redirects to home when user is not admin', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'regular-user', 
            email: 'user@example.com',
            role: 'user' 
          } 
        },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/c/new',
        replace: true,
      });
    });

    it('redirects to login when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        replace: true,
      });
    });

    it('redirects to login when session has no user', () => {
      mockUseSession.mockReturnValue({
        data: { user: null },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        replace: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('handles undefined session data gracefully', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/login',
        replace: true,
      });
    });

    it('handles missing role property', () => {
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'user-without-role', 
            email: 'noRole@example.com'
            // No role property
          } 
        },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/c/new',
        replace: true,
      });
    });
  });

  describe('Multiple Admin Roles', () => {
    it('allows access for custom admin roles', () => {
      // If Better Auth is configured with adminRoles: ['admin', 'superadmin']
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'super-admin', 
            email: 'super@example.com',
            role: 'superadmin' // Better Auth supports custom admin roles
          } 
        },
        isPending: false,
      });

      renderAdminGuard();

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Component Mounting/Unmounting', () => {
    it('cleans up properly when unmounted during loading', () => {
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      const { unmount } = renderAdminGuard();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      unmount();

      // Should not throw any errors
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles rapid auth state changes', () => {
      const { rerender } = render(
        <MemoryRouter>
          <AdminGuard>
            <div>Admin Content</div>
          </AdminGuard>
        </MemoryRouter>,
      );

      // Start with loading
      mockUseSession.mockReturnValue({
        data: undefined,
        isPending: true,
      });

      rerender(
        <MemoryRouter>
          <AdminGuard>
            <div>Admin Content</div>
          </AdminGuard>
        </MemoryRouter>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Change to admin user
      mockUseSession.mockReturnValue({
        data: { 
          user: { 
            id: 'admin-user', 
            email: 'admin@example.com',
            role: 'admin' 
          } 
        },
        isPending: false,
      });

      rerender(
        <MemoryRouter>
          <AdminGuard>
            <div>Admin Content</div>
          </AdminGuard>
        </MemoryRouter>,
      );

      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });
});