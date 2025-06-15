import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import AutoTranscribeAudioSwitch from '../AutoTranscribeAudioSwitch';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';


describe('AutoTranscribeAudioSwitch', () => {
  /**
   * Mock function to set the auto-send-text state.
   */
  let mockSetAutoTranscribeAudio:
    | vi.Mock<void, [boolean]>
    | ((value: boolean) => void)
    | undefined;

  beforeEach(() => {
    mockSetAutoTranscribeAudio = vi.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <AutoTranscribeAudioSwitch />
      </RecoilRoot>,
    );

    expect(getByTestId('AutoTranscribeAudio')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <AutoTranscribeAudioSwitch onCheckedChange={mockSetAutoTranscribeAudio} />
      </RecoilRoot>,
    );
    const switchElement = getByTestId('AutoTranscribeAudio');
    fireEvent.click(switchElement);

    expect(mockSetAutoTranscribeAudio).toHaveBeenCalledWith(true);
  });
});
