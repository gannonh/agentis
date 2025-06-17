import { render, fireEvent } from 'test/layout-test-utils';
import Stop from '../Stop';
import { describe, expect, it, test, vi } from 'vitest';

describe('Stop', () => {
  it('should render the Stop button', () => {
    const { getByText } = render(
      <Stop
        onClick={() => {
          ('');
        }}
      />,
    );
    expect(getByText('com_ui_stop')).toBeInTheDocument();
  });

  it('should call onClick when the button is clicked', () => {
    const handleClick = vi.fn();
    const { getByText } = render(<Stop onClick={handleClick} />);
    fireEvent.click(getByText('com_ui_stop'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
