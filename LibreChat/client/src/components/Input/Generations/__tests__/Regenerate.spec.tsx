import { render, fireEvent } from 'test/layout-test-utils';
import Regenerate from '../Regenerate';
import { describe, expect, it, test, vi } from 'vitest';

describe('Regenerate', () => {
  it('should render the Regenerate button', () => {
    const { getByText } = render(
      <Regenerate
        onClick={() => {
          ('');
        }}
      />,
    );
    expect(getByText('com_ui_regenerate')).toBeInTheDocument();
  });

  it('should call onClick when the button is clicked', () => {
    const handleClick = vi.fn();
    const { getByText } = render(<Regenerate onClick={handleClick} />);
    fireEvent.click(getByText('com_ui_regenerate'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
