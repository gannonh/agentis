import { render, fireEvent } from 'test/layout-test-utils';
import Continue from '../Continue';
import { describe, expect, it, test, vi } from 'vitest';

describe('Continue', () => {
  it('should render the Continue button', () => {
    const { getByText } = render(
      <Continue
        onClick={() => {
          ('');
        }}
      />,
    );
    expect(getByText('com_ui_continue')).toBeInTheDocument();
  });

  it('should call onClick when the button is clicked', () => {
    const handleClick = vi.fn();
    const { getByText } = render(<Continue onClick={handleClick} />);
    fireEvent.click(getByText('com_ui_continue'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
