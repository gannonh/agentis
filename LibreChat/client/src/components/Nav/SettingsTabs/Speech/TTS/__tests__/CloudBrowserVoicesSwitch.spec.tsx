import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, fireEvent } from 'test/layout-test-utils';
import CloudBrowserVoicesSwitch from '../CloudBrowserVoicesSwitch';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';


describe('CloudBrowserVoicesSwitch', () => {
  /**
   * Mock function to set the cache-tts state.
   */
  let mockSetCloudBrowserVoices:
    | vi.Mock<void, [boolean]>
    | ((value: boolean) => void)
    | undefined;

  beforeEach(() => {
    mockSetCloudBrowserVoices = vi.fn();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <CloudBrowserVoicesSwitch />
      </RecoilRoot>,
    );

    expect(getByTestId('CloudBrowserVoices')).toBeInTheDocument();
  });

  it('calls onCheckedChange when the switch is toggled', () => {
    const { getByTestId } = render(
      <RecoilRoot>
        <CloudBrowserVoicesSwitch onCheckedChange={mockSetCloudBrowserVoices} />
      </RecoilRoot>,
    );
    const switchElement = getByTestId('CloudBrowserVoices');
    fireEvent.click(switchElement);

    expect(mockSetCloudBrowserVoices).toHaveBeenCalledWith(true);
  });
});
