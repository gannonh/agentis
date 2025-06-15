import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import ConversationModeSwitch from './ConversationModeSwitch';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';


describe('ConversationModeSwitch', () => {
  /**
   * Mock function to set the auto-send-text state.
   */
  let mockSetConversationMode: vi.Mock<void, [boolean]> | ((value: boolean) => void) | undefined;

  beforeEach(() => {
    mockSetConversationMode = vi.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <ConversationModeSwitch />
      </RecoilRoot>,
    );

    expect(getByTestId('ConversationMode')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <ConversationModeSwitch onCheckedChange={mockSetConversationMode} />
      </RecoilRoot>,
    );
    const switchElement = getByTestId('ConversationMode');
    fireEvent.click(switchElement);

    expect(mockSetConversationMode).toHaveBeenCalledWith(true);
  });
});
