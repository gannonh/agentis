/**
 * @fileoverview Unit tests for TeamInvitation component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { TeamInvitation } from '../TeamInvitation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: ({ placeholder, ...props }: any) => <input placeholder={placeholder} {...props} />,
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

// Create a test wrapper with QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('TeamInvitation', () => {
  const mockOnInvitationsComplete = vi.fn();
  const mockOnSkip = vi.fn();
  const defaultProps = {
    organizationName: 'Acme Corp',
    onInvitationsComplete: mockOnInvitationsComplete,
    onSkip: mockOnSkip,
  };

  it('should render team invitation form', () => {
    render(<TeamInvitation {...defaultProps} />, { wrapper });

    expect(screen.getByText('Invite your team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
  });

  it('should render add button', () => {
    render(<TeamInvitation {...defaultProps} />, { wrapper });

    // Look for the button that contains the Plus icon (rendered as SVG)
    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find((button) => button.querySelector('svg'));
    expect(addButton).toBeInTheDocument();
  });

  it('should render skip button', () => {
    render(<TeamInvitation {...defaultProps} />, { wrapper });

    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('should render continue button', () => {
    render(<TeamInvitation {...defaultProps} />, { wrapper });

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<TeamInvitation {...defaultProps} className="custom-class" />, { wrapper });

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
