import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Agent } from 'librechat-data-provider';
import AgentCTA from '../AgentCTA';

// Mock dependencies
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_agents_start_chat: 'Start chat with',
    };
    return translations[key] || key;
  },
}));

jest.mock('~/data-provider', () => ({
  useAvailableToolsQuery: () => ({
    data: [
      {
        name: 'Google Sheets',
        pluginKey: 'googlesheets',
        icon: '/assets/tools/google-sheets.svg',
        description: 'Google Sheets tool',
      },
      {
        name: 'Gmail',
        pluginKey: 'gmail',
        icon: '/assets/tools/gmail.svg',
        description: 'Gmail tool',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('~/utils', () => ({
  getIconKey: (provider: string) => provider,
}));

jest.mock('~/hooks/Endpoint/Icons', () => ({
  icons: {
    openAI: ({ className }: { className?: string }) => (
      <div className={className} data-testid="openai-icon">
        OpenAI
      </div>
    ),
    anthropic: ({ className }: { className?: string }) => (
      <div className={className} data-testid="anthropic-icon">
        Anthropic
      </div>
    ),
  },
}));

const mockAgent: Agent = {
  id: 'test-agent-1',
  name: 'Code Assistant',
  description: 'Helps with coding tasks and debugging',
  instructions: 'You are a helpful coding assistant',
  avatar: null,
  provider: 'openAI',
  model: 'gpt-4',
  model_parameters: {
    temperature: 0.7,
    maxContextTokens: 4000,
    max_context_tokens: 4000,
    max_output_tokens: 1000,
    max_tokens: 1000,
    top_p: 1,
    top_k: 40,
  },
  tools: ['googlesheets', 'gmail'],
  created_at: Date.now(),
  featured: true,
};

const mockOnStartChat = jest.fn();

describe('AgentCTA Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render agent CTA with name, description, and tools', () => {
    const { container } = render(<AgentCTA agent={mockAgent} onStartChat={mockOnStartChat} />);

    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    expect(screen.getByText('Helps with coding tasks and debugging')).toBeInTheDocument();
    // Should show tool icons
    expect(
      container.querySelector('img[src="/assets/tools/google-sheets.svg"]'),
    ).toBeInTheDocument();
  });

  it('should display single tool icon when agent has one tool', () => {
    const singleToolAgent = {
      ...mockAgent,
      tools: ['googlesheets'],
    };

    const { container } = render(
      <AgentCTA agent={singleToolAgent} onStartChat={mockOnStartChat} />,
    );

    // Should show the Google Sheets icon
    expect(
      container.querySelector('img[src="/assets/tools/google-sheets.svg"]'),
    ).toBeInTheDocument();
  });

  it('should display multiple tool icons with count when agent has multiple tools', () => {
    const multiToolAgent = {
      ...mockAgent,
      tools: ['googlesheets', 'gmail', 'googlesheets', 'gmail', 'gmail'], // 5 tools, 2 unique
    };

    const { container } = render(<AgentCTA agent={multiToolAgent} onStartChat={mockOnStartChat} />);

    // Should show unique tool icons
    expect(
      container.querySelector('img[src="/assets/tools/google-sheets.svg"]'),
    ).toBeInTheDocument();
    expect(container.querySelector('img[src="/assets/tools/gmail.svg"]')).toBeInTheDocument();
    // Should show tool count for additional tools
    expect(screen.getByText('+2 more tools')).toBeInTheDocument();
  });

  it('should call onStartChat when CTA is clicked', () => {
    render(<AgentCTA agent={mockAgent} onStartChat={mockOnStartChat} />);

    const ctaButton = screen.getByRole('button');
    fireEvent.click(ctaButton);

    expect(mockOnStartChat).toHaveBeenCalledWith(mockAgent);
  });

  it('should not render if agent is not featured', () => {
    const nonFeaturedAgent = {
      ...mockAgent,
      featured: false,
    };

    const { container } = render(
      <AgentCTA agent={nonFeaturedAgent} onStartChat={mockOnStartChat} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle agent without tools gracefully', () => {
    const noToolsAgent = {
      ...mockAgent,
      tools: undefined,
    };

    render(<AgentCTA agent={noToolsAgent} onStartChat={mockOnStartChat} />);

    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    expect(screen.queryByTestId('tool-icon-execute_code')).not.toBeInTheDocument();
  });

  it('should truncate long descriptions', () => {
    const longDescriptionAgent = {
      ...mockAgent,
      description:
        'This is a very long description that should be truncated when it exceeds the maximum character limit for display in the CTA component',
    };

    render(<AgentCTA agent={longDescriptionAgent} onStartChat={mockOnStartChat} />);

    const description = screen.getByText(/This is a very long description/);
    expect(description).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<AgentCTA agent={mockAgent} onStartChat={mockOnStartChat} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Start chat with Code Assistant');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should display fallback when agent name is missing', () => {
    const noNameAgent = {
      ...mockAgent,
      name: null,
    };

    render(<AgentCTA agent={noNameAgent} onStartChat={mockOnStartChat} />);

    expect(screen.getByText('Unnamed Agent')).toBeInTheDocument();
  });
});
