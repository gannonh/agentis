// useQueryParams.spec.ts
import { afterEach, beforeEach, describe, expect, it, test, vi } from 'vitest';

vi.mock('recoil', () => {
  const originalModule = vi.importActual('recoil');
  return {
    ...originalModule,
    atom: vi.fn().mockImplementation((config) => ({
      key: config.key,
      default: config.default,
    })),
    useRecoilValue: vi.fn(),
  };
});

// Move mock store definition after the mocks
vi.mock('~/store', async () => {
  return {
    default: {
      modularChat: { key: 'modularChat', default: false },
      availableTools: { key: 'availableTools', default: [] },
    },
    modularChat: { key: 'modularChat', default: false },
    availableTools: { key: 'availableTools', default: [] },
  };
});

import { renderHook, act } from '@testing-library/react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRecoilValue } from 'recoil';
import useQueryParams from './useQueryParams';
import { useChatContext, useChatFormContext } from '~/Providers';
import useSubmitMessage from '~/hooks/Messages/useSubmitMessage';
import useDefaultConvo from '~/hooks/Conversations/useDefaultConvo';
import store from '~/store';

// Other mocks
vi.mock('react-router-dom', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('~/Providers', () => ({
  useChatContext: vi.fn(),
  useChatFormContext: vi.fn(),
}));

vi.mock('~/hooks/Messages/useSubmitMessage', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('~/hooks/Conversations/useDefaultConvo', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('~/utils', () => ({
  getConvoSwitchLogic: vi.fn(() => ({
    template: {},
    shouldSwitch: false,
    isNewModular: false,
    newEndpointType: null,
    isCurrentModular: false,
    isExistingConversation: false,
  })),
  getModelSpecIconURL: vi.fn(() => 'icon-url'),
  removeUnavailableTools: vi.fn((preset) => preset),
  logger: { log: vi.fn() },
}));

// Mock the tQueryParamsSchema
vi.mock('librechat-data-provider', () => ({
  ...vi.importActual('librechat-data-provider'),
  tQueryParamsSchema: {
    shape: {
      model: { parse: vi.fn((value) => value) },
      endpoint: { parse: vi.fn((value) => value) },
      temperature: { parse: vi.fn((value) => value) },
      // Add other schema shapes as needed
    },
  },
  isAgentsEndpoint: vi.fn(() => false),
  isAssistantsEndpoint: vi.fn(() => false),
  QueryKeys: { startupConfig: 'startupConfig', endpoints: 'endpoints' },
  EModelEndpoint: { custom: 'custom', assistants: 'assistants', agents: 'agents' },
}));

// Mock global window.history
global.window = Object.create(window);
global.window.history = {
  replaceState: vi.fn(),
  pushState: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  length: 1,
  scrollRestoration: 'auto',
  state: null,
};

describe('useQueryParams', () => {
  // Setup common mocks before each test
  beforeEach(() => {
    vi.useFakeTimers();

    // Reset mock for window.history.replaceState
    vi.spyOn(window.history, 'replaceState').mockClear();

    // Create mocks for all dependencies
    const mockSearchParams = new URLSearchParams();
    (useSearchParams as vi.Mock).mockReturnValue([mockSearchParams, vi.fn()]);

    const mockQueryClient = {
      getQueryData: vi.fn().mockImplementation((key) => {
        if (key === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (key === 'endpoints') {
          return {};
        }
        return null;
      }),
    };
    (useQueryClient as vi.Mock).mockReturnValue(mockQueryClient);

    (useRecoilValue as vi.Mock).mockImplementation((atom) => {
      if (atom === store.modularChat) return false;
      if (atom === store.availableTools) return [];
      return null;
    });

    const mockConversation = { model: null, endpoint: null };
    const mockNewConversation = vi.fn();
    (useChatContext as vi.Mock).mockReturnValue({
      conversation: mockConversation,
      newConversation: mockNewConversation,
    });

    const mockMethods = {
      setValue: vi.fn(),
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: vi.fn((callback) => () => callback({ text: 'test message' })),
    };
    (useChatFormContext as vi.Mock).mockReturnValue(mockMethods);

    const mockSubmitMessage = vi.fn();
    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    const mockGetDefaultConversation = vi.fn().mockReturnValue({});
    (useDefaultConvo as vi.Mock).mockReturnValue(mockGetDefaultConversation);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // Helper function to set URL parameters for testing
  const setUrlParams = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value);
    });
    (useSearchParams as vi.Mock).mockReturnValue([searchParams, vi.fn()]);
  };

  // Test cases remain the same
  it('should process query parameters on initial render', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: vi.fn((callback) => () => callback({ text: 'test message' })),
    });

    // Mock startup config to allow processing
    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: vi.fn().mockReturnValue({ modelSpecs: { list: [] } }),
    });

    setUrlParams({ q: 'hello world' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('should auto-submit message when submit=true and no settings to apply', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockHandleSubmit = vi.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = vi.fn();
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    // Mock startup config to allow processing
    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: vi.fn().mockReturnValue({ modelSpecs: { list: [] } }),
    });

    setUrlParams({ q: 'hello world', submit: 'true' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // Advance timer to trigger interval
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(mockHandleSubmit).toHaveBeenCalled();
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should defer submission when settings need to be applied first', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockHandleSubmit = vi.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = vi.fn();
    const mockNewConversation = vi.fn();
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    // Mock getQueryData to return array format for startupConfig
    const mockGetQueryData = vi.fn().mockImplementation((key) => {
      if (Array.isArray(key) && key[0] === 'startupConfig') {
        return { modelSpecs: { list: [] } };
      }
      if (key === 'startupConfig') {
        return { modelSpecs: { list: [] } };
      }
      return null;
    });

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useChatContext as vi.Mock).mockReturnValue({
      conversation: { model: null, endpoint: null },
      newConversation: mockNewConversation,
    });

    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: mockGetQueryData,
    });

    setUrlParams({ q: 'hello world', submit: 'true', model: 'gpt-4' });

    // Execute
    const { rerender } = renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params but not submit
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert initial state
    expect(mockGetQueryData).toHaveBeenCalledWith(expect.anything());
    expect(mockNewConversation).toHaveBeenCalled();
    expect(mockSubmitMessage).not.toHaveBeenCalled(); // Not submitted yet

    // Now mock conversation update to trigger settings application check
    (useChatContext as vi.Mock).mockReturnValue({
      conversation: { model: 'gpt-4', endpoint: null },
      newConversation: mockNewConversation,
    });

    // Re-render to trigger the effect that watches for settings
    rerender();

    // Now the message should be submitted
    expect(mockSetValue).toHaveBeenCalledWith(
      'text',
      'hello world',
      expect.objectContaining({ shouldValidate: true }),
    );
    expect(mockHandleSubmit).toHaveBeenCalled();
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should submit after timeout if settings never get applied', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockHandleSubmit = vi.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = vi.fn();
    const mockNewConversation = vi.fn();
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    (useChatContext as vi.Mock).mockReturnValue({
      conversation: { model: null, endpoint: null },
      newConversation: mockNewConversation,
    });

    // Mock startup config to allow processing
    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: vi.fn().mockImplementation((key) => {
        if (Array.isArray(key) && key[0] === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        if (key === 'startupConfig') {
          return { modelSpecs: { list: [] } };
        }
        return null;
      }),
    });

    setUrlParams({ q: 'hello world', submit: 'true', model: 'non-existent-model' });

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params but not submit
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert initial state
    expect(mockSubmitMessage).not.toHaveBeenCalled(); // Not submitted yet

    // Let the timeout happen naturally
    act(() => {
      // Advance timer to trigger the timeout in the hook
      vi.advanceTimersByTime(3000); // MAX_SETTINGS_WAIT_MS
    });

    // Now the message should be submitted due to timeout
    expect(mockSubmitMessage).toHaveBeenCalled();
  });

  it('should mark as submitted when no submit parameter is present', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockHandleSubmit = vi.fn((callback) => () => callback({ text: 'test message' }));
    const mockSubmitMessage = vi.fn();
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    // Mock startup config to allow processing
    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: vi.fn().mockReturnValue({ modelSpecs: { list: [] } }),
    });

    setUrlParams({ model: 'gpt-4' }); // No submit=true

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    // First interval tick should process params
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert initial state - submission should be marked as handled
    expect(mockSubmitMessage).not.toHaveBeenCalled();

    // Try to advance timer past the timeout
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Submission still shouldn't happen
    expect(mockSubmitMessage).not.toHaveBeenCalled();
  });

  it('should handle empty query parameters', () => {
    // Setup
    const mockSetValue = vi.fn();
    const mockHandleSubmit = vi.fn();
    const mockSubmitMessage = vi.fn();

    // Force replaceState to be called
    window.history.replaceState = vi.fn();

    (useChatFormContext as vi.Mock).mockReturnValue({
      setValue: mockSetValue,
      getValues: vi.fn().mockReturnValue(''),
      handleSubmit: mockHandleSubmit,
    });

    (useSubmitMessage as vi.Mock).mockReturnValue({
      submitMessage: mockSubmitMessage,
    });

    // Mock startup config to allow processing
    (useQueryClient as vi.Mock).mockReturnValue({
      getQueryData: vi.fn().mockReturnValue({ modelSpecs: { list: [] } }),
    });

    setUrlParams({}); // Empty params
    const mockTextAreaRef = {
      current: {
        focus: vi.fn(),
        setSelectionRange: vi.fn(),
      } as unknown as HTMLTextAreaElement,
    };

    // Execute
    renderHook(() => useQueryParams({ textAreaRef: mockTextAreaRef }));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert
    expect(mockSetValue).not.toHaveBeenCalled();
    expect(mockHandleSubmit).not.toHaveBeenCalled();
    expect(mockSubmitMessage).not.toHaveBeenCalled();
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});
