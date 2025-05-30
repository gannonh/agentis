import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Agent } from 'librechat-data-provider';
import AgentDiscovery from '../AgentDiscovery';

// Mock the agents query hook
const mockUseListAgentsQuery = jest.fn();
jest.mock('~/data-provider', () => ({
  useListAgentsQuery: () => mockUseListAgentsQuery(),
}));

// Mock other dependencies
jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => {
    const translations: Record<string, string> = {
      com_agents_discovery_title: 'Discover Agents',
      com_agents_discovery_subtitle: 'Get started with these featured agents',
      com_ui_loading: 'Loading...',
      com_agents_no_featured: 'No featured agents available',
    };
    return translations[key] || key;
  },
}));

const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Code Assistant',
    description: 'Helps with coding tasks',
    instructions: 'You are a coding assistant',
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
    tools: ['execute_code'],
    created_at: Date.now(),
    featured: true,
  },
  {
    id: 'agent-2',
    name: 'Writing Helper',
    description: 'Assists with writing and editing',
    instructions: 'You are a writing assistant',
    avatar: null,
    provider: 'anthropic',
    model: 'claude-3',
    model_parameters: {
      temperature: 0.7,
      maxContextTokens: 4000,
      max_context_tokens: 4000,
      max_output_tokens: 1000,
      max_tokens: 1000,
      top_p: 1,
      top_k: 40,
    },
    tools: ['file_search'],
    created_at: Date.now(),
    featured: true,
  },
  {
    id: 'agent-3',
    name: 'Regular Agent',
    description: 'Not featured',
    instructions: 'Regular agent',
    avatar: null,
    provider: 'openAI',
    model: 'gpt-3.5',
    model_parameters: {
      temperature: 0.7,
      maxContextTokens: 4000,
      max_context_tokens: 4000,
      max_output_tokens: 1000,
      max_tokens: 1000,
      top_p: 1,
      top_k: 40,
    },
    tools: [],
    created_at: Date.now(),
    featured: false,
  },
];

const mockOnStartChat = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AgentDiscovery Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when agents are being fetched', () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render featured agents when data is loaded', () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: { data: mockAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Discover Agents')).toBeInTheDocument();
    expect(screen.getByText('Get started with these featured agents')).toBeInTheDocument();
    expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    expect(screen.getByText('Writing Helper')).toBeInTheDocument();
    expect(screen.queryByText('Regular Agent')).not.toBeInTheDocument(); // Not featured
  });

  it('should only display featured agents', () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: { data: mockAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    // Should show 2 featured agents
    const agentButtons = screen.getAllByRole('button');
    expect(agentButtons).toHaveLength(2);
  });

  it('should show message when no featured agents are available', () => {
    const nonFeaturedAgents = mockAgents.map((agent) => ({ ...agent, featured: false }));

    mockUseListAgentsQuery.mockReturnValue({
      data: { data: nonFeaturedAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('No featured agents available')).toBeInTheDocument();
  });

  it('should call onStartChat when an agent CTA is clicked', async () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: { data: mockAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    const codeAssistantButton = screen.getByLabelText('Start chat with Code Assistant');
    fireEvent.click(codeAssistantButton);

    await waitFor(() => {
      expect(mockOnStartChat).toHaveBeenCalledWith(mockAgents[0]);
    });
  });

  it('should handle API error gracefully', () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('No featured agents available')).toBeInTheDocument();
  });

  it('should be responsive and display agents in grid layout', () => {
    mockUseListAgentsQuery.mockReturnValue({
      data: { data: mockAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    const container = screen.getByTestId('agent-discovery-grid');
    expect(container).toHaveClass('grid');
  });

  it('should show maximum of 6 featured agents', () => {
    const manyAgents = Array.from({ length: 10 }, (_, i) => ({
      ...mockAgents[0],
      id: `agent-${i}`,
      name: `Agent ${i}`,
      featured: true,
    }));

    mockUseListAgentsQuery.mockReturnValue({
      data: { data: manyAgents },
      isLoading: false,
      error: null,
    });

    render(<AgentDiscovery onStartChat={mockOnStartChat} />, {
      wrapper: createWrapper(),
    });

    const agentButtons = screen.getAllByRole('button');
    expect(agentButtons).toHaveLength(6); // Should limit to 6
  });
});
