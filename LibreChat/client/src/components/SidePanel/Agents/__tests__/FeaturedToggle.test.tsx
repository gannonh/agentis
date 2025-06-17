import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import '@testing-library/jest-dom';
import FeaturedToggle from '../FeaturedToggle';
import type { AgentForm } from '~/common';

// Mock react-hook-form methods
import { beforeEach, describe, expect, it, test, vi } from 'vitest';

const mockSetValue = vi.fn();
const mockWatch = vi.fn();

vi.mock('react-hook-form', async () => {
  const actual = await vi.importActual('react-hook-form');
  return {
    ...actual,
    useFormContext: () => ({
      setValue: mockSetValue,
      watch: mockWatch,
    }),
  };
});

// Mock UI components
vi.mock('~/components/ui', () => ({
  Switch: ({ checked, onCheckedChange, 'data-testid': testId, id }: any) => (
    <button
      data-testid={testId || id}
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
  HoverCard: ({ children }: any) => <div>{children}</div>,
  HoverCardPortal: ({ children }: any) => <div>{children}</div>,
  HoverCardContent: ({ children }: any) => <div>{children}</div>,
  HoverCardTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock SVG components
vi.mock('~/components/svg', () => ({
  CircleHelpIcon: (props: any) => <div data-testid="help-icon" {...props} />,
}));

// Mock common constants
vi.mock('~/common', () => ({
  ...vi.importActual('~/common'),
  ESide: {
    Top: 'top',
  },
}));

// Mock localization
vi.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_agents_featured: 'Featured',
      com_agents_featured_description: 'Show this agent as a featured option for new conversations',
    };
    return translations[key] || key;
  },
}));

// Wrapper component to provide form context
const TestWrapper: React.FC<{ children: React.ReactNode; defaultValues?: Partial<AgentForm> }> = ({
  children,
  defaultValues = {},
}) => {
  const methods = useForm<AgentForm>({
    defaultValues: {
      id: 'test-agent',
      name: 'Test Agent',
      description: 'Test description',
      instructions: 'Test instructions',
      model: 'gpt-4',
      model_parameters: {},
      featured: false,
      ...defaultValues,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

describe('FeaturedToggle Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the featured toggle with label and help icon', () => {
    render(
      <TestWrapper>
        <FeaturedToggle />
      </TestWrapper>,
    );

    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(
      screen.getByText('Show this agent as a featured option for new conversations'),
    ).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByTestId('help-icon')).toBeInTheDocument();
  });

  it('should show toggle as off by default', () => {
    mockWatch.mockReturnValue(false);

    render(
      <TestWrapper>
        <FeaturedToggle />
      </TestWrapper>,
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveTextContent('Off');
  });

  it('should show toggle as on when featured is true', () => {
    mockWatch.mockReturnValue(true);

    render(
      <TestWrapper defaultValues={{ featured: true }}>
        <FeaturedToggle />
      </TestWrapper>,
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveTextContent('On');
  });

  it('should call setValue when toggle is clicked', () => {
    mockWatch.mockReturnValue(false);

    render(
      <TestWrapper>
        <FeaturedToggle />
      </TestWrapper>,
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockSetValue).toHaveBeenCalledWith('featured', true, { shouldDirty: true });
  });

  it('should toggle value from true to false when clicked', () => {
    mockWatch.mockReturnValue(true);

    render(
      <TestWrapper defaultValues={{ featured: true }}>
        <FeaturedToggle />
      </TestWrapper>,
    );

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(mockSetValue).toHaveBeenCalledWith('featured', false, { shouldDirty: true });
  });

  it('should have proper test id', () => {
    mockWatch.mockReturnValue(false);

    render(
      <TestWrapper>
        <FeaturedToggle />
      </TestWrapper>,
    );

    const toggle = screen.getByTestId('featured-toggle');
    expect(toggle).toBeInTheDocument();
  });
});
