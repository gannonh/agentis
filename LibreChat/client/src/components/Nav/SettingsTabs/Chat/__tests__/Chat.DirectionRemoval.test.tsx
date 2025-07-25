import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { vi } from 'vitest';
import Chat from '../Chat';

// Mock localize function
const mockLocalize = (key: string) => key;
vi.mock('~/hooks/useLocalize', () => ({
  default: () => mockLocalize,
}));

const renderChat = () => {
  return render(
    <RecoilRoot>
      <Chat />
    </RecoilRoot>,
  );
};

describe('Chat Settings - Direction Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not display chat direction selector', () => {
    renderChat();

    // Chat direction should not be present
    expect(screen.queryByText('com_nav_chat_direction')).not.toBeInTheDocument();
    expect(screen.queryByText('Chat direction')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chatDirection')).not.toBeInTheDocument();
  });

  it('should display expected settings without chat direction', () => {
    renderChat();

    // Verify font size selector is present
    expect(screen.getByText('com_nav_font_size')).toBeInTheDocument();

    // Verify toggle switches are present
    expect(screen.getByText('com_nav_enter_to_send')).toBeInTheDocument();
    expect(screen.getByText('com_nav_save_badges_state')).toBeInTheDocument();
    expect(screen.getByText('com_nav_modular_chat')).toBeInTheDocument();
  });

  it('should not have any chat direction related functionality', () => {
    renderChat();

    // Ensure no direction-related elements exist
    expect(screen.queryByTestId('chatDirection')).not.toBeInTheDocument();

    // Ensure no chat direction labels or buttons exist
    expect(screen.queryByLabelText(/direction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ltr|rtl/i)).not.toBeInTheDocument();
  });
});
