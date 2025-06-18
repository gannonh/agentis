/**
 * @fileoverview Unit tests for ProfileSetup component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProfileSetup } from '../ProfileSetup';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Input', () => ({
  Input: ({ placeholder, ...props }: any) => (
    <input placeholder={placeholder} {...props} />
  ),
}));

vi.mock('~/components/ui/Label', () => ({
  Label: ({ children, ...props }: any) => (
    <label {...props}>{children}</label>
  ),
}));

describe('ProfileSetup', () => {
  const mockOnProfileComplete = vi.fn();
  const defaultProps = {
    email: 'test@example.com',
    onProfileComplete: mockOnProfileComplete,
  };

  it('should render profile setup form', () => {
    render(<ProfileSetup {...defaultProps} />);

    expect(screen.getByText('Set up your profile')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument();
  });

  it('should show user email', () => {
    render(<ProfileSetup {...defaultProps} />);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should render continue button', () => {
    render(<ProfileSetup {...defaultProps} />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ProfileSetup {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});