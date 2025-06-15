import { renderHook } from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import { Agent } from 'librechat-data-provider';
import useStartAgentChat from '../useStartAgentChat';

// Mock dependencies
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

const mockNavigate = vi.fn();
const mockSetConversation = vi.fn();
const mockSetSubmission = vi.fn();

vi.mock('recoil', () => ({
  useSetRecoilState: vi.fn(() => mockSetSubmission),
}));

vi.mock('~/Providers', () => ({
  useSetConvoContext: () => ({
    setConversation: mockSetConversation,
  }),
}));

vi.mock('~/store', async () => {
  return {
    default: {
      submission: {},
      useCreateConversationAtom: vi.fn(() => ({
        setConversation: mockSetConversation,
      })),
    },
    submission: {},
    useCreateConversationAtom: vi.fn(() => ({
      setConversation: mockSetConversation,
    })),
  };
});

// Helper function for Date mocking
function createDateMock() {
  const OriginalDate = Date;
  let callCount = 0;

  const mockDate = vi.fn((...args: any[]) => {
    if (args.length === 0) {
      // Constructor called without arguments (new Date())
      callCount++;
      // Create dates 1 second apart
      return new OriginalDate(1000000000000 + callCount * 1000);
    }
    // Pass through for other Date constructor calls
    return new OriginalDate(...(args as ConstructorParameters<typeof Date>));
  }) as any;

  // Preserve static Date methods
  Object.setPrototypeOf(mockDate, OriginalDate);
  Object.getOwnPropertyNames(OriginalDate).forEach((prop) => {
    if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
      (mockDate as any)[prop] = (OriginalDate as any)[prop];
    }
  });

  return {
    mockDate,
    restore: () => {
      global.Date = OriginalDate;
    },
  };
}

const mockAgent: Agent = {
  id: 'test-agent-1',
  name: 'Test Agent',
  description: 'Test description',
  instructions: 'Test instructions',
  avatar: null,
  provider: 'openAI',
  model: 'gpt-4',
  model_parameters: {
    temperature: 0.7,
    maxContextTokens: 4096,
    max_context_tokens: 4096,
    max_output_tokens: 2048,
    top_p: 1.0,
    frequency_penalty: 0,
    presence_penalty: 0,
  },
  tools: ['execute_code'],
  created_at: Date.now(),
  featured: true,
};

describe('useStartAgentChat Hook', () => {
  let dateMockHelper: { mockDate: any; restore: () => void } | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as vi.Mock).mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    // Always restore Date mock if it was created
    if (dateMockHelper) {
      dateMockHelper.restore();
      dateMockHelper = null;
    }
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
        maxContextTokens: 4096,
        max_context_tokens: 4096,
        max_output_tokens: 1000,
        top_p: 1.0,
        frequency_penalty: 0,
        presence_penalty: 0,
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
        max_output_tokens: 1000,
      }),
    );
  });

  it('should generate unique conversation setup', () => {
    // Use the helper function to create Date mock
    dateMockHelper = createDateMock();
    global.Date = dateMockHelper.mockDate;

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

    // Date restoration will be handled by afterEach
  });
});
