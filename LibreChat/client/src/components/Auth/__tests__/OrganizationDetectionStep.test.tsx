/**
 * @fileoverview Tests for OrganizationCreationStep component
 * @module components/Auth/__tests__/OrganizationCreationStep.test
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
    useNavigate: () => vi.fn(),
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
  CheckCircle: () => <div data-testid="check-circle-icon" />,
}));

// Mock useLocalize hook
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

// Mock Button component
vi.mock('~/components/ui', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OrganizationCreationStep', () => {
  const mockOnNext = vi.fn();
  const defaultProps = {
    email: 'user@example.com',
    userName: 'Test User',
    onNext: mockOnNext,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('shows loading state initially', () => {
    // Mock pending fetch
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    expect(screen.getByText('Setting up your workspace...')).toBeInTheDocument();
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
          slug: 'test-company',
        },
      },
      organizations: [
        {
          _id: 'org-456',
          name: 'Test Company',
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockInvitation),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("You're invited!")).toBeInTheDocument();
      expect(screen.getByText(/You've been invited to join/)).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
    });

    const joinButton = screen.getByRole('button', { name: /Join Test Company/i });
    fireEvent.click(joinButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'invite',
      organizationId: 'org-456',
    });
  });

  it('shows organization creation form for public domains', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} email="user@gmail.com" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      // Should not show domain checkbox for public domains
      expect(screen.queryByText(/Let anyone with an @/)).not.toBeInTheDocument();
    });

    // Test organization creation
    const input = screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.');
    fireEvent.change(input, { target: { value: 'My Company' } });

    const createButton = screen.getByText('Next');
    fireEvent.click(createButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'create',
      organizationName: 'My Company',
      enableDomainJoin: false,
    });
  });

  it('handles skip for personal workspace', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });

    const skipButton = screen.getByText('Skip for now');
    fireEvent.click(skipButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'skip',
      organizationName: "Test's workspace",
      enableDomainJoin: false,
    });
  });

  it('blocks creation for corporate domain with existing organization', async () => {
    const mockResult = {
      isPublicDomain: false,
      domain: 'company.com',
      hasOrganization: true,
      organizations: [
        {
          _id: 'org-123',
          name: 'Company Inc',
          domain: 'company.com',
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} email="user@company.com" />);

    await waitFor(() => {
      expect(screen.getByText('Organization exists for company.com')).toBeInTheDocument();
      expect(
        screen.getByText(/An organization already exists for your domain/),
      ).toBeInTheDocument();
      expect(screen.getByText('Create personal workspace instead')).toBeInTheDocument();
    });

    // Can only create personal workspace
    const personalButton = screen.getByText('Create personal workspace instead');
    fireEvent.click(personalButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'skip',
      organizationName: "Test's workspace",
      enableDomainJoin: false,
    });
  });

  it('shows domain checkbox for corporate domains without existing org', async () => {
    const mockResult = {
      isPublicDomain: false,
      domain: 'newcompany.com',
      hasOrganization: false,
      organizations: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} email="user@newcompany.com" />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.')).toBeInTheDocument();
      expect(
        screen.getByText('Let anyone with an @newcompany.com email join this workspace'),
      ).toBeInTheDocument();
    });

    // Test with domain join enabled
    const input = screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.');
    fireEvent.change(input, { target: { value: 'New Company' } });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const createButton = screen.getByText('Next');
    fireEvent.click(createButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'create',
      organizationName: 'New Company',
      enableDomainJoin: true,
    });
  });

  it('validates organization name input', async () => {
    const mockResult = {
      isPublicDomain: true,
      domain: 'gmail.com',
      hasOrganization: false,
      organizations: [],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResult),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Next');
    const input = screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.');

    // Test empty name
    fireEvent.click(createButton);
    expect(mockOnNext).not.toHaveBeenCalled();

    // Test short name
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.click(createButton);
    await waitFor(() => {
      expect(
        screen.getByText('Organization name must be at least 2 characters'),
      ).toBeInTheDocument();
    });

    // Test valid name
    fireEvent.change(input, { target: { value: 'Valid Company Name' } });
    fireEvent.click(createButton);
    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'create',
      organizationName: 'Valid Company Name',
      enableDomainJoin: false,
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock fetch to fail
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    // Should show organization creation form as fallback
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Should still be able to create organization despite error
    const input = screen.getByPlaceholderText('Acme Inc., Marketing Team, etc.');
    fireEvent.change(input, { target: { value: 'Fallback Org' } });

    const createButton = screen.getByText('Next');
    fireEvent.click(createButton);

    expect(mockOnNext).toHaveBeenCalledWith({
      action: 'create',
      organizationName: 'Fallback Org',
      enableDomainJoin: false,
    });
  });

  it('includes invitation token in request when present in URL', async () => {
    // Set up search params with invitation token
    mockSearchParams = new URLSearchParams('invite=test-token-123');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          isPublicDomain: true,
          domain: 'gmail.com',
          hasOrganization: false,
          organizations: [],
          canAutoJoin: false,
        }),
    });

    renderWithRouter(<OrganizationDetectionStep {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/organization/detect-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          inviteToken: 'test-token-123',
        }),
      });
    });
  });
});
