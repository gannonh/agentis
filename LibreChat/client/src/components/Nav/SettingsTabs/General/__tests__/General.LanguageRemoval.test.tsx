import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { ThemeContext } from '~/hooks';
import General from '../General';

import { vi } from 'vitest';

// Mock localize function
const mockLocalize = (key: string) => key;
vi.mock('~/hooks/useLocalize', () => ({
  default: () => mockLocalize,
}));

// Mock theme context
const mockThemeContext = {
  theme: 'system',
  setTheme: vi.fn(),
};

const renderGeneral = () => {
  return render(
    <RecoilRoot>
      <ThemeContext.Provider value={mockThemeContext}>
        <General />
      </ThemeContext.Provider>
    </RecoilRoot>,
  );
};

describe('General Settings - Language Removal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not display language selector', () => {
    renderGeneral();

    // Language selector should not be present
    expect(screen.queryByText('com_nav_language')).not.toBeInTheDocument();
    expect(screen.queryByText('Language')).not.toBeInTheDocument();

    // Theme selector should still be present
    expect(screen.getByText('com_nav_theme')).toBeInTheDocument();
  });

  it('should display expected settings without language', () => {
    renderGeneral();

    // Verify theme selector is present
    expect(screen.getByText('com_nav_theme')).toBeInTheDocument();

    // Verify toggle switches are present
    expect(screen.getByText('com_nav_user_msg_markdown')).toBeInTheDocument();
    expect(screen.getByText('com_nav_auto_scroll')).toBeInTheDocument();
    expect(screen.getByText('com_nav_hide_panel')).toBeInTheDocument();

    // Verify archived chats section is present
    expect(screen.getByText('com_ui_manage')).toBeInTheDocument();
  });

  it('should not have any language-related functionality', () => {
    renderGeneral();

    // Ensure no language dropdowns or selectors exist
    const dropdowns = screen.getAllByRole('button');
    dropdowns.forEach((dropdown) => {
      expect(dropdown.textContent).not.toMatch(/english|auto|language/i);
    });
  });
});
