/**
 * @fileoverview Tests for OrganizationDetectionStep component
 * @module components/Auth/__tests__/OrganizationDetectionStep.test
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import OrganizationDetectionStep from '../OrganizationDetectionStep';

// Mock fetch
global.fetch = vi.fn();

// Mock useSearchParams
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    useNavigate: () => vi.fn()
  };
});

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Building2: () => <div data-testid="building-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />
}));

// Mock useLocalize hook
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key
}));

// Mock Button component
vi.mock('~/components/ui', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OrganizationDetectionStep', () => {
  const mockOnNext = vi.fn();
  const defaultProps = {
    email: 'user@example.com',
    onNext: mockOnNext
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('shows loading state initially', () => {
    // Mock pending fetch
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    expect(screen.getByText('Detecting your organization...')).toBeInTheDocument();
  });

  it('handles invitation flow correctly', async () => {
    const mockInvitation = {
      isInvited: true,
      invitation: {
        id: 'inv-123',
        email: 'user@example.com',
        organizationId: 'org-456',
        role: 'member',
        organization: {
          id: 'org-456',
          name: 'Test Company',
          domain: 'testcompany.com',
          slug: 'test-company'
        }
      },
      organizations: [{
        _id: 'org-456',
        name: 'Test Company'
      }]
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInvitation)
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("You're invited!")).toBeInTheDocument();
      expect(screen.getAllByText('Test Company')).toHaveLength(2); // Appears in subtitle and details
      expect(screen.getByText('member')).toBeInTheDocument();
    });

    const joinButton = screen.getByRole('button', { name: /Join Test Company/i });
    fireEvent.click(joinButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      selectedOrganization: { _id: 'org-456', name: 'Test Company' },
      action: 'invite'
    });
  });

  it('handles public domain flow', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult)
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} email="user@gmail.com" />);

    await waitFor(() => {
      expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
      expect(screen.getByText(/Since you're using a personal email \(gmail.com\)/)).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create New Organization');
    fireEvent.click(createButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      selectedOrganization: undefined,
      action: 'create'
    });
  });

  it('handles corporate domain with existing organization', async () => {
    const mockResult = {
      isPublicDomain: false,
      domain: 'company.com',
      hasOrganization: true,
      organizations: [{
        _id: 'org-123',
        name: 'Company Inc',
        domain: 'company.com',
        memberCount: 15
      }],
      canAutoJoin: true
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult)
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} email="user@company.com" />);

    await waitFor(() => {
      expect(screen.getByText('Join Your Organization')).toBeInTheDocument();
      expect(screen.getByText('Company Inc')).toBeInTheDocument();
    });

    // Select organization
    const orgCard = screen.getByText('Company Inc').closest('div');
    if (orgCard) {
      fireEvent.click(orgCard);
    }

    const joinButton = screen.getByText('Join Organization');
    fireEvent.click(joinButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      selectedOrganization: {
        _id: 'org-123',
        name: 'Company Inc',
        domain: 'company.com',
        memberCount: 15
      },
      action: 'join'
    });
  });

  it('handles invitation error correctly', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
      canAutoJoin: false,
      invitationError: 'Invalid or expired invitation'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult)
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Invitation Issue')).toBeInTheDocument();
      expect(screen.getByText('Invalid or expired invitation')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('includes invitation token in request when present in URL', async () => {
    // Set up search params with invitation token
    mockSearchParams = new URLSearchParams('invite=test-token-123');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        isPublicDomain: true,
        domain: 'gmail.com',
        hasOrganization: false,
        organizations: [],
        canAutoJoin: false
      })
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/organization/detect-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          inviteToken: 'test-token-123'
        })
      });
    });
  });
});