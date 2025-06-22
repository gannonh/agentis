/**
 * @fileoverview Unit tests for OrganizationSetup component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationSetup } from '../OrganizationSetup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type = 'button', ...props }: any) => (
    <button type={type} onClick={onClick} disabled={disabled} {...props}>
      {/* Render children, handling React fragments and elements properly */}
      {React.Children.map(children, (child) => 
        typeof child === 'string' ? child : child
      )}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: React.forwardRef((props: any, ref) => <input ref={ref} {...props} />),
}));

vi.mock('~/components/ui/Textarea', () => ({
  Textarea: ({ placeholder, ...props }: any) => <textarea placeholder={placeholder} {...props} />,
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

// Mock Better Auth
vi.mock('~/config/betterAuth', () => ({
  authClient: {
    organization: {
      checkSlug: vi.fn().mockResolvedValue({ data: { status: true } }),
    },
  },
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

describe('OrganizationSetup', () => {
  const mockOnSetupComplete = vi.fn();
  const defaultProps = {
    email: 'test@example.com',
    suggestedOrgName: 'Test Organization',
    domain: 'test.com',
    onOrganizationCreated: () => {},
    onSetupComplete: mockOnSetupComplete,
  };

  it('should render organization setup form', () => {
    render(<OrganizationSetup {...defaultProps} />, { wrapper });

    expect(screen.getByText('Name your organization')).toBeInTheDocument();
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument();
  });

  it('should pre-populate with suggested organization name', () => {
    render(<OrganizationSetup {...defaultProps} />, { wrapper });

    const nameInput = screen.getByLabelText('Organization name') as HTMLInputElement;
    expect(nameInput.value).toBe('Test Organization');
  });

  it('should render description field', () => {
    render(<OrganizationSetup {...defaultProps} />, { wrapper });

    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
  });

  it('should render create organization button', () => {
    render(<OrganizationSetup {...defaultProps} />, { wrapper });

    // First step has "Continue" button
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<OrganizationSetup {...defaultProps} className="custom-class" />, { wrapper });

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
