import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import TextToSpeechSwitch from '../TextToSpeechSwitch';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';

describe('TextToSpeechSwitch', () => {
  /**
   * Mock function to set the text-to-speech state.
   */
  let mockSetTextToSpeech: vi.Mock<void, [boolean]> | ((value: boolean) => void) | undefined;

  beforeEach(() => {
    mockSetTextToSpeech = vi.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <TextToSpeechSwitch />
      </RecoilRoot>,
    );

    expect(getByTestId('TextToSpeech')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <TextToSpeechSwitch onCheckedChange={mockSetTextToSpeech} />
      </RecoilRoot>,
    );
    const switchElement = getByTestId('TextToSpeech');
    fireEvent.click(switchElement);

    expect(mockSetTextToSpeech).toHaveBeenCalledWith(false);
  });
});
