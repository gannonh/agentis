import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { LangSelector } from './General';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';


describe('LangSelector', () => {
  let mockOnChange;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  it('renders correctly', () => {
    global.ResizeObserver = class MockedResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    const { getByText, getByRole } = render(
      <RecoilRoot>
        <LangSelector langcode="en-US" onChange={mockOnChange} />
      </RecoilRoot>,
    );

    expect(getByText('com_nav_language')).toBeInTheDocument();
    const dropdownButton = getByRole('combobox');
    expect(dropdownButton).toHaveTextContent('com_nav_lang_english');
  });

  it('calls onChange when the select value changes', async () => {
    global.ResizeObserver = class MockedResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    const { getByRole, getByTestId } = render(
      <RecoilRoot>
        <LangSelector langcode="en-US" onChange={mockOnChange} />
      </RecoilRoot>,
    );

    expect(getByRole('combobox')).toHaveTextContent('com_nav_lang_english');

    const dropdownButton = getByTestId('dropdown-menu');

    fireEvent.click(dropdownButton);

    const italianOption = getByRole('option', { name: 'com_nav_lang_italian' });
    fireEvent.click(italianOption);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('it-IT');
    });
  });
});
