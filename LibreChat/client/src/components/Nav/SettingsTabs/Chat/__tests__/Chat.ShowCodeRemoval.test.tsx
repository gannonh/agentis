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
    </RecoilRoot>
  );
};

describe('Chat Settings - Show Code Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not display show code option', () => {
    renderChat();
    
    // Show code option should not be present
    expect(screen.queryByText('com_nav_show_code')).not.toBeInTheDocument();
    expect(screen.queryByText('Always show code when using code interpreter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('showCode')).not.toBeInTheDocument();
  });

  it('should display expected settings without show code', () => {
    renderChat();
    
    // Verify other settings are still present
    expect(screen.getByText('com_nav_font_size')).toBeInTheDocument();
    expect(screen.getByText('com_nav_enter_to_send')).toBeInTheDocument();
    expect(screen.getByText('com_nav_save_badges_state')).toBeInTheDocument();
    expect(screen.getByText('com_nav_show_thinking')).toBeInTheDocument();
  });

  it('should not have show code toggle switch', () => {
    renderChat();
    
    // Ensure no showCode switch exists
    expect(screen.queryByTestId('showCode')).not.toBeInTheDocument();
    
    // Check that showCode is not in any switch IDs
    const switches = screen.getAllByRole('switch');
    switches.forEach(switchElement => {
      expect(switchElement).not.toHaveAttribute('data-testid', 'showCode');
      expect(switchElement).not.toHaveAttribute('id', 'showCode');
    });
  });
});