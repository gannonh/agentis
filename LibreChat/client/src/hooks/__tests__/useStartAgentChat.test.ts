import { renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { Agent } from 'librechat-data-provider';
import useStartAgentChat from '../useStartAgentChat';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockSetConversation = jest.fn();
const mockSetSubmission = jest.fn();

jest.mock('recoil', () => ({
  useSetRecoilState: jest.fn(() => mockSetSubmission),
}));

jest.mock('~/Providers', () => ({
  useSetConvoContext: () => ({
    setConversation: mockSetConversation,
  }),
}));

jest.mock('~/store', () => ({
  submission: {},
  useCreateConversationAtom: jest.fn(() => ({
    setConversation: mockSetConversation,
  })),
}));

const mockAgent: Agent = {
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test description',
  instructions: 'Test instructions',
  avatar: null,
  provider: 'openAI',
  model: 'gpt-4',
  model_parameters: {},
  tools: ['execute_code'],
  created_at: Date.now(),
  featured: true,
};

describe('useStartAgentChat Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
  });

  it('should return a function to start chat with agent', () => {
    const { result } = renderHook(() => useStartAgentChat());

    expect(typeof result.current).toBe('function');
  });

  it('should create new conversation with agent configuration', () => {
    const { result } = renderHook(() => useStartAgentChat());

    result.current(mockAgent);

    // Should navigate to new conversation with agent_id
    expect(mockNavigate).toHaveBeenCalledWith('/c/new?agent_id=test-agent-1');
  });

  it('should set up conversation with agent endpoint', () => {
    const { result } = renderHook(() => useStartAgentChat());

    result.current(mockAgent);

    // Should set up the conversation with agents endpoint
    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'agents',
        agent_id: 'test-agent-1',
        model: 'gpt-4',
        agent: expect.objectContaining({
          id: 'test-agent-1',
          name: 'Test Agent',
        }),
      }),
    );
  });

  it('should clear previous conversation state', () => {
    const { result } = renderHook(() => useStartAgentChat());

    result.current(mockAgent);

    // Should clear any existing conversation data
    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: null,
        messages: [],
        agent_id: 'test-agent-1',
        endpoint: 'agents',
        model: 'gpt-4',
        tools: ['execute_code'],
      }),
    );
  });

  it('should set conversation title to agent name', () => {
    const { result } = renderHook(() => useStartAgentChat());

    result.current(mockAgent);

    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Agent',
      }),
    );
  });

  it('should handle agent without name gracefully', () => {
    const agentWithoutName = {
      ...mockAgent,
      name: null,
    };

    const { result } = renderHook(() => useStartAgentChat());

    result.current(agentWithoutName);

    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Agent Chat',
      }),
    );
  });

  it('should include agent tools in conversation setup', () => {
    const { result } = renderHook(() => useStartAgentChat());

    result.current(mockAgent);

    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: ['execute_code'],
      }),
    );
  });

  it('should set agent provider and model parameters', () => {
    const agentWithParams = {
      ...mockAgent,
      model_parameters: {
        temperature: 0.7,
        max_tokens: 1000,
      },
    };

    const { result } = renderHook(() => useStartAgentChat());

    result.current(agentWithParams);

    expect(mockSetConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'agents',
        model: 'gpt-4',
        modelDisplayLabel: 'Test Agent',
        temperature: 0.7,
        max_tokens: 1000,
      }),
    );
  });

  it('should generate unique conversation setup', () => {
    // Mock Date.now to return different values
    const originalDateNow = Date.now;
    let timestamp = 1000000000000; // Fixed base timestamp
    Date.now = jest.fn(() => {
      timestamp += 1000; // Increment by 1 second each call
      return timestamp;
    });

    const { result } = renderHook(() => useStartAgentChat());

    // Start first chat
    result.current(mockAgent);
    const firstCall = mockSetConversation.mock.calls[0][0];

    // Clear mocks but keep the Date mock
    mockSetConversation.mockClear();

    // Start second chat
    result.current(mockAgent);
    const secondCall = mockSetConversation.mock.calls[0][0];

    // Each should have different createdAt timestamps
    expect(firstCall.createdAt).not.toEqual(secondCall.createdAt);
    
    // But same basic structure
    expect(firstCall.conversationId).toBe(null);
    expect(secondCall.conversationId).toBe(null);
    expect(firstCall.agent_id).toBe(secondCall.agent_id);

    // Restore original Date.now
    Date.now = originalDateNow;
  });
});
