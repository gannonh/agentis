import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecoilRoot } from 'recoil';
import type { TMessage } from 'librechat-data-provider';
import type { TAgentOption } from '~/common/agents-types';
import ProactiveMCPAuth from '../ProactiveMCPAuth';
import * as mcpAuth from '~/utils/mcpAuth';
import * as authHooks from '~/hooks/AuthContext';
import * as agentQueries from '~/data-provider/Agents/queries';
import { ChatContext } from '~/Providers/ChatContext';
import { AgentsMapContext } from '~/Providers/AgentsMapContext';

// Mock the ComposioAuthButton component
jest.mock('~/components/Composio/ComposioAuthButton', () => ({
  __esModule: true,
  default: ({ service, inline }: { service: string; inline?: boolean }) => (
    <button data-testid={`auth-button-${service}`} className="auth-button">
      Connect {service}
    </button>
  ),
}));

// Mock utilities
jest.mock('~/utils/mcpAuth');
const mockedMcpAuth = mcpAuth as jest.Mocked<typeof mcpAuth>;

// Mock hooks
jest.mock('~/hooks/AuthContext');
const mockedAuthHooks = authHooks as jest.Mocked<typeof authHooks>;

// Mock store selectors
jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilValue: jest.fn((atom) => {
    // Return null for ephemeral agents by default
    return null;
  }),
}));

// Mock agent queries
jest.mock('~/data-provider/Agents/queries');
const mockedAgentQueries = agentQueries as jest.Mocked<typeof agentQueries>;

// Get reference to the mocked useRecoilValue
import { useRecoilValue } from 'recoil';
const mockUseRecoilValue = useRecoilValue as jest.MockedFunction<typeof useRecoilValue>;

describe('ProactiveMCPAuth Component', () => {
  const mockMessages: TMessage[] = [
    {
      messageId: '1',
      conversationId: 'conv-1',
      parentMessageId: null,
      clientId: 'client-1',
      text: 'Hello',
      author: { role: 'user' },
      timestamp: new Date().toISOString(),
      isCreatedByUser: true,
      error: false,
      unfinished: false,
    } as unknown as TMessage,
  ];

  const mockAgent: TAgentOption = {
    id: 'agent-1',
    value: 'agent-1',
    label: 'Test Agent',
    name: 'Test Agent',
    tools: ['tool1_mcp_googlesheets', 'tool2_mcp_googledocs'],
  } as TAgentOption;

  const mockAllTools = [
    { pluginKey: 'tool1_mcp_googlesheets', name: 'Google Sheets Tool' },
    { pluginKey: 'tool2_mcp_googledocs', name: 'Google Docs Tool' },
    { pluginKey: 'tool3_mcp_gmail', name: 'Gmail Tool' },
    { pluginKey: 'regular-tool', name: 'Regular Tool' },
  ];

  const mockConversation = {
    conversationId: 'conv-1',
    agent_id: 'agent-1',
  };

  const defaultProps = {
    messages: mockMessages,
    conversationId: 'conv-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the useRecoilValue mock to default behavior
    mockUseRecoilValue.mockReturnValue(null);

    // Default mock implementations
    mockedAuthHooks.useAuthContext.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1' } as any,
      token: 'mock-token',
      logout: jest.fn(),
      login: jest.fn(),
      error: undefined,
      setError: jest.fn(),
    });

    mockedAgentQueries.useAvailableAgentToolsQuery.mockReturnValue({
      data: mockAllTools,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: jest.fn(),
    } as any);

    mockedMcpAuth.getConversationAuthServices.mockReturnValue(['googlesheets', 'googledocs']);
    mockedMcpAuth.shouldShowAuthUI.mockReturnValue(true);
  });

  const renderWithProviders = (ui: React.ReactElement, options = {}) => {
    const mockChatContext = {
      conversation: mockConversation,
      ...options,
    };

    const mockAgentsMap = {
      'agent-1': mockAgent,
    };

    return render(
      <RecoilRoot>
        <ChatContext.Provider value={mockChatContext as any}>
          <AgentsMapContext.Provider value={mockAgentsMap}>{ui}</AgentsMapContext.Provider>
        </ChatContext.Provider>
      </RecoilRoot>,
    );
  };

  describe('Rendering Tests', () => {
    it('should render when agent has MCP tools requiring auth', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(
        screen.getByText('This conversation uses tools that require authentication:'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-googlesheets')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-googledocs')).toBeInTheDocument();
    });

    it('should not render when agent has no MCP tools', () => {
      const agentWithoutMCPTools = {
        ...mockAgent,
        tools: ['regular-tool-1', 'regular-tool-2'],
      };

      mockedMcpAuth.getConversationAuthServices.mockReturnValue([]);
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(false);

      const mockAgentsMapNoMCP = {
        'agent-no-mcp': agentWithoutMCPTools,
      };

      render(
        <RecoilRoot>
          <ChatContext.Provider
            value={{ conversation: { conversationId: 'conv-1', agent_id: 'agent-no-mcp' } } as any}
          >
            <AgentsMapContext.Provider value={mockAgentsMapNoMCP}>
              <ProactiveMCPAuth {...defaultProps} />
            </AgentsMapContext.Provider>
          </ChatContext.Provider>
        </RecoilRoot>,
      );

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should not render when agent has only non-auth MCP tools', () => {
      mockedMcpAuth.getConversationAuthServices.mockReturnValue([]);
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(false);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });

  describe('Service Detection Tests', () => {
    it('should correctly identify required auth services', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalledWith(
        mockConversation,
        mockAgent,
        mockAllTools,
      );
    });

    it('should handle multiple services', () => {
      const multipleServices = ['googlesheets', 'googledocs', 'gmail'];
      mockedMcpAuth.getConversationAuthServices.mockReturnValue(multipleServices);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.getByTestId('auth-button-googlesheets')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-googledocs')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-gmail')).toBeInTheDocument();
    });

    it('should handle unknown services gracefully', () => {
      const servicesWithUnknown = ['googlesheets', 'unknown-service'];
      mockedMcpAuth.getConversationAuthServices.mockReturnValue(servicesWithUnknown);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.getByTestId('auth-button-googlesheets')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-unknown-service')).toBeInTheDocument();
    });
  });

  describe('UI Integration Tests', () => {
    it('should render correct number of ComposioAuthButton components', () => {
      const services = ['googlesheets', 'googledocs', 'gmail'];
      mockedMcpAuth.getConversationAuthServices.mockReturnValue(services);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      const authButtons = screen.getAllByRole('button');
      expect(authButtons).toHaveLength(services.length);
    });

    it('should pass correct service props to auth buttons', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.getByText('Connect googlesheets')).toBeInTheDocument();
      expect(screen.getByText('Connect googledocs')).toBeInTheDocument();
    });

    it('should apply correct styling and layout', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      const container = screen.getByText('Authentication Required').closest('div')
        ?.parentElement?.parentElement;
      expect(container).toHaveClass('rounded-lg', 'border', 'border-gray-200', 'bg-gray-50');
    });

    it('should use responsive grid layout for auth buttons', () => {
      const services = ['googlesheets', 'googledocs', 'gmail'];
      mockedMcpAuth.getConversationAuthServices.mockReturnValue(services);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      const gridContainer = screen.getByTestId('auth-button-googlesheets').parentElement;
      expect(gridContainer).toHaveClass('grid', 'gap-2');
      expect(gridContainer).toHaveStyle(
        'grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing agent data', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />, {
        conversation: { conversationId: 'conv-1' }, // No agent_id
      });

      // Should call getConversationAuthServices with null agent
      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalledWith(
        { conversationId: 'conv-1' },
        null,
        mockAllTools,
      );
    });

    it('should handle malformed tool configurations', () => {
      const malformedAgent = {
        ...mockAgent,
        tools: [null, undefined, '', 'valid_mcp_googlesheets'] as any,
      };

      const mockAgentsMapMalformed = {
        'agent-malformed': malformedAgent,
      };

      mockedMcpAuth.getConversationAuthServices.mockReturnValue(['googlesheets']);

      render(
        <RecoilRoot>
          <ChatContext.Provider
            value={
              { conversation: { conversationId: 'conv-1', agent_id: 'agent-malformed' } } as any
            }
          >
            <AgentsMapContext.Provider value={mockAgentsMapMalformed}>
              <ProactiveMCPAuth {...defaultProps} />
            </AgentsMapContext.Provider>
          </ChatContext.Provider>
        </RecoilRoot>,
      );

      expect(screen.getByTestId('auth-button-googlesheets')).toBeInTheDocument();
    });

    it('should handle empty tools array', () => {
      const emptyToolsAgent = {
        ...mockAgent,
        tools: [],
      };

      const mockAgentsMapEmpty = {
        'agent-empty': emptyToolsAgent,
      };

      mockedMcpAuth.getConversationAuthServices.mockReturnValue([]);
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(false);

      render(
        <RecoilRoot>
          <ChatContext.Provider
            value={{ conversation: { conversationId: 'conv-1', agent_id: 'agent-empty' } } as any}
          >
            <AgentsMapContext.Provider value={mockAgentsMapEmpty}>
              <ProactiveMCPAuth {...defaultProps} />
            </AgentsMapContext.Provider>
          </ChatContext.Provider>
        </RecoilRoot>,
      );

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should handle null conversation', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />, {
        conversation: null,
      });

      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalledWith(
        null,
        null,
        mockAllTools,
      );
    });

    it('should handle undefined messages', () => {
      renderWithProviders(
        <ProactiveMCPAuth {...{ ...defaultProps, messages: undefined as any }} />,
      );

      expect(mockedMcpAuth.shouldShowAuthUI).toHaveBeenCalledWith(undefined, expect.any(Array));
    });

    it('should handle empty messages array', () => {
      renderWithProviders(<ProactiveMCPAuth {...{ ...defaultProps, messages: [] }} />);

      expect(mockedMcpAuth.shouldShowAuthUI).toHaveBeenCalledWith([], expect.any(Array));
    });
  });

  describe('Ephemeral Agent Support', () => {
    it('should handle ephemeral agents with MCP servers', () => {
      const ephemeralAgent = {
        mcp: ['googlesheets', 'googledocs'],
      };

      // Mock useRecoilValue to return ephemeral agent for this test
      mockUseRecoilValue.mockReturnValue(ephemeralAgent);

      mockedMcpAuth.getConversationAuthServices.mockReturnValue(['googlesheets', 'googledocs']);

      // Render without agent_id in conversation
      render(
        <RecoilRoot>
          <ChatContext.Provider value={{ conversation: { conversationId: 'conv-1' } } as any}>
            <AgentsMapContext.Provider value={{}}>
              <ProactiveMCPAuth {...defaultProps} />
            </AgentsMapContext.Provider>
          </ChatContext.Provider>
        </RecoilRoot>,
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-googlesheets')).toBeInTheDocument();
      expect(screen.getByTestId('auth-button-googledocs')).toBeInTheDocument();
    });

    it('should construct proper tool keys for ephemeral agents', () => {
      const ephemeralAgent = {
        mcp: ['googlesheets'],
      };

      // Mock useRecoilValue to return ephemeral agent for this test
      mockUseRecoilValue.mockReturnValue(ephemeralAgent);

      mockedMcpAuth.getConversationAuthServices.mockReturnValue(['googlesheets']);

      render(
        <RecoilRoot>
          <ChatContext.Provider value={{ conversation: { conversationId: 'conv-1' } } as any}>
            <AgentsMapContext.Provider value={{}}>
              <ProactiveMCPAuth {...defaultProps} />
            </AgentsMapContext.Provider>
          </ChatContext.Provider>
        </RecoilRoot>,
      );

      // Verify the agent object passed to getConversationAuthServices has correct tool format
      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalledWith(
        { conversationId: 'conv-1' },
        expect.objectContaining({
          tools: ['tool1_mcp_googlesheets'], // Should find matching tool from allTools
        }),
        mockAllTools,
      );
    });
  });

  describe('shouldShowAuthUI Integration', () => {
    it('should respect shouldShowAuthUI return value when false', () => {
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(false);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should respect shouldShowAuthUI return value when true', () => {
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(true);
      mockedMcpAuth.getConversationAuthServices.mockReturnValue(['googlesheets']);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });

    it('should pass messages correctly to shouldShowAuthUI', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(mockedMcpAuth.shouldShowAuthUI).toHaveBeenCalledWith(mockMessages, expect.any(Array));
    });
  });

  describe('Loading States', () => {
    it('should handle loading state for available tools query', () => {
      mockedAgentQueries.useAvailableAgentToolsQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        isError: false,
        isSuccess: false,
        refetch: jest.fn(),
      } as any);

      // Should still attempt to render based on other data
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalled();
    });

    it('should handle error state for available tools query', () => {
      mockedAgentQueries.useAvailableAgentToolsQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load tools'),
        isError: true,
        isSuccess: false,
        refetch: jest.fn(),
      } as any);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      // Should still work with empty tools array (component defaults to [])
      expect(mockedMcpAuth.getConversationAuthServices).toHaveBeenCalledWith(
        mockConversation,
        mockAgent,
        [],
      );
    });
  });

  describe('Non-authenticated User', () => {
    it('should render auth UI even for non-authenticated users', () => {
      mockedAuthHooks.useAuthContext.mockReturnValue({
        isAuthenticated: false,
        user: undefined,
        token: undefined,
        logout: jest.fn(),
        login: jest.fn(),
        error: undefined,
        setError: jest.fn(),
      });

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      // Component should still render if auth services are detected
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should display info icon', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      const svg = screen.getByText('Authentication Required').previousSibling as Element;
      expect(svg).toBeInTheDocument();
      expect(svg?.tagName).toBe('svg');
    });

    it('should display descriptive text', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(
        screen.getByText('This conversation uses tools that require authentication:'),
      ).toBeInTheDocument();
    });

    it('should have proper container structure', () => {
      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      const outerContainer = screen.getByText('Authentication Required').closest('.w-full');
      expect(outerContainer).toHaveClass('w-full', 'py-3');

      const innerContainer = outerContainer?.querySelector('.mx-auto');
      expect(innerContainer).toHaveClass('mx-auto', 'max-w-4xl', 'px-4');
    });
  });

  describe('No Auth Services', () => {
    it('should not render when no auth services are detected', () => {
      mockedMcpAuth.getConversationAuthServices.mockReturnValue([]);
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(true);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should not render when shouldShow is true but authServices is empty', () => {
      mockedMcpAuth.getConversationAuthServices.mockReturnValue([]);
      mockedMcpAuth.shouldShowAuthUI.mockReturnValue(true);

      renderWithProviders(<ProactiveMCPAuth {...defaultProps} />);

      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });
  });
});
