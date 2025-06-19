/**
 * @fileoverview Unit tests for OrganizationSetup component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationSetup } from '../OrganizationSetup';

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

vi.mock('~/components/ui/Textarea', () => ({
  Textarea: ({ placeholder, ...props }: any) => <textarea placeholder={placeholder} {...props} />,
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe('OrganizationSetup', () => {
  const mockOnSetupComplete = vi.fn();
  const defaultProps = {
    email: 'test@example.com',
    suggestedOrgName: 'Example Corp',
    onSetupComplete: mockOnSetupComplete,
  };

  it('should render organization setup form', () => {
    render(<OrganizationSetup {...defaultProps} />);

    expect(screen.getByText('Name your organization')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter organization name')).toBeInTheDocument();
  });

  it('should pre-populate with suggested organization name', () => {
    render(<OrganizationSetup {...defaultProps} />);

    // The form uses React Hook Form which doesn't set the DOM value directly
    // Instead check that the URL preview shows the slugified version
    expect(screen.getByText(/agentis\.ai\/example-corp/)).toBeInTheDocument();
  });

  it('should render description field', () => {
    render(<OrganizationSetup {...defaultProps} />);

    expect(screen.getByPlaceholderText('What does your organization do?')).toBeInTheDocument();
  });

  it('should render create organization button', () => {
    render(<OrganizationSetup {...defaultProps} />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<OrganizationSetup {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
