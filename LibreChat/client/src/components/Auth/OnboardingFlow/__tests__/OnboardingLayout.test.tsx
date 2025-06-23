/**
 * @fileoverview Unit tests for OnboardingLayout component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingLayout } from '../OnboardingLayout';

// Mock UI components to avoid ref issues
vi.mock('~/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/Progress', () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress-bar" aria-valuenow={value} role="progressbar">
      {value}%
    </div>
  ),
}));

describe('OnboardingLayout', () => {
  const defaultProps = {
    step: 2,
    totalSteps: 4,
    title: 'Test Step',
    children: <div>Test content</div>,
  };

  it('should render title and children', () => {
    render(<OnboardingLayout {...defaultProps} />);

    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should show step progress', () => {
    render(<OnboardingLayout {...defaultProps} />);

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('should render progress bar with correct value', () => {
    render(<OnboardingLayout {...defaultProps} />);

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 2/4 * 100 = 50%
  });

  it('should apply custom className', () => {
    const { container } = render(<OnboardingLayout {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
