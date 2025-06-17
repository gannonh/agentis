import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import DialogTemplate from './DialogTemplate';
import { Dialog } from '@radix-ui/react-dialog';
import { RecoilRoot } from 'recoil';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';

describe('DialogTemplate', () => {
  let mockSelectHandler;

  beforeEach(() => {
    mockSelectHandler = vi.fn();
  });

  it('renders correctly with all props', () => {
    const { getByText } = render(
      <RecoilRoot>
        <Dialog
          open
          data-testid="test-dialog"
          onOpenChange={() => {
            return;
          }}
        >
          <DialogTemplate
            title="Test Dialog"
            description="Test Description"
            main={<div>Main Content</div>}
            buttons={<button>Button</button>}
            leftButtons={<button>Left Button</button>}
            selection={{ selectHandler: mockSelectHandler, selectText: 'Select' }}
          />
        </Dialog>
      </RecoilRoot>,
    );

    expect(getByText('Test Dialog')).toBeInTheDocument();
    expect(getByText('Test Description')).toBeInTheDocument();
    expect(getByText('Main Content')).toBeInTheDocument();
    expect(getByText('Button')).toBeInTheDocument();
    expect(getByText('Left Button')).toBeInTheDocument();
    expect(getByText('com_ui_cancel')).toBeInTheDocument(); // i18n key since we're mocking it
    expect(getByText('Select')).toBeInTheDocument();
  });

  it('renders correctly without optional props', () => {
    const { queryByText } = render(
      <RecoilRoot>
        <Dialog
          open
          onOpenChange={() => {
            return;
          }}
        ></Dialog>
      </RecoilRoot>,
    );

    expect(queryByText('Test Dialog')).toBeNull();
    expect(queryByText('Test Description')).not.toBeInTheDocument();
    expect(queryByText('Main Content')).not.toBeInTheDocument();
    expect(queryByText('Button')).not.toBeInTheDocument();
    expect(queryByText('Left Button')).not.toBeInTheDocument();
    expect(queryByText('com_ui_cancel')).not.toBeInTheDocument();
    expect(queryByText('Select')).not.toBeInTheDocument();
  });

  it('calls selectHandler when the select button is clicked', () => {
    const { getByText } = render(
      <RecoilRoot>
        <Dialog
          open
          onOpenChange={() => {
            return;
          }}
        >
          <DialogTemplate
            title="Test Dialog"
            selection={{ selectHandler: mockSelectHandler, selectText: 'Select' }}
          />
        </Dialog>
      </RecoilRoot>,
    );

    fireEvent.click(getByText('Select'));

    expect(mockSelectHandler).toHaveBeenCalled();
  });
});
