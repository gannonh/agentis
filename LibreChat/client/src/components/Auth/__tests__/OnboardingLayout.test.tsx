/**
 * @fileoverview Tests for OnboardingLayout component
 * @module components/Auth/__tests__/OnboardingLayout.test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import OnboardingLayout from '../OnboardingLayout';

describe('OnboardingLayout', () => {
  const mockProps = {
    title: 'Test Title',
    subtitle: 'Test Subtitle',
    children: <div>Test Content</div>
  };

  it('renders basic layout with title and content', () => {
    render(<OnboardingLayout {...mockProps} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders progress indicator when step prop is provided', () => {
    const propsWithStep = {
      ...mockProps,
      step: { current: 2, total: 4 }
    };

    render(<OnboardingLayout {...propsWithStep} />);

    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '2');
    expect(progressBar).toHaveAttribute('aria-valuemax', '4');
  });

  it('does not render progress indicator when step prop is not provided', () => {
    render(<OnboardingLayout {...mockProps} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Step \d+ of \d+/)).not.toBeInTheDocument();
  });

  it('applies correct max width class', () => {
    const { container } = render(
      <OnboardingLayout {...mockProps} maxWidth="xl" />
    );

    const contentCard = container.querySelector('.max-w-xl');
    expect(contentCard).toBeInTheDocument();
  });

  it('renders without subtitle when not provided', () => {
    const propsWithoutSubtitle = {
      title: 'Test Title',
      children: <div>Test Content</div>
    };

    render(<OnboardingLayout {...propsWithoutSubtitle} />);

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.queryByText('Test Subtitle')).not.toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <OnboardingLayout {...mockProps} className="custom-class" />
    );

    const contentCard = container.querySelector('.custom-class');
    expect(contentCard).toBeInTheDocument();
  });

  it('renders support message in footer', () => {
    render(<OnboardingLayout {...mockProps} />);

    expect(screen.getByText('Need help? Contact our support team')).toBeInTheDocument();
  });
});