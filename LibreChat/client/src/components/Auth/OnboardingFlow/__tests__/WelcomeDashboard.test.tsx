/**
 * @fileoverview Unit tests for WelcomeDashboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { WelcomeDashboard } from '../WelcomeDashboard';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('WelcomeDashboard', () => {
  const mockOnGetStarted = vi.fn();
  const mockOrganization = {
    id: 'org-123',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    createdAt: new Date('2023-01-01'),
  };

  const defaultProps = {
    organization: mockOrganization,
    userRole: 'owner' as const,
    memberCount: 1,
    onGetStarted: mockOnGetStarted,
  };

  it('should render welcome message with organization name', () => {
    render(<WelcomeDashboard {...defaultProps} />);

    expect(screen.getByText('Welcome to Acme Corporation!')).toBeInTheDocument();
  });

  it('should show member count', () => {
    render(<WelcomeDashboard {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Team Member')).toBeInTheDocument();
  });

  it('should show user role', () => {
    render(<WelcomeDashboard {...defaultProps} />);

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Your Role')).toBeInTheDocument();
  });

  it('should render get started button', () => {
    render(<WelcomeDashboard {...defaultProps} />);

    expect(screen.getByRole('button', { name: /get started with agentis/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<WelcomeDashboard {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});