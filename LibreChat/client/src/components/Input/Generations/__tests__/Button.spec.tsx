import { render, fireEvent } from '@testing-library/react';
import Button from '../Button';
import { describe, expect, it, vi } from 'vitest';

describe('Button', () => {
  it('renders with the correct type and children', () => {
    const { getByTestId, getByText } = render(
      <Button
        type="regenerate"
        onClick={() => {
          ('');
        }}
      >
        {}
        Regenerate
      </Button>,
    );
    expect(getByTestId('regenerate-generation-button')).toBeInTheDocument();
    expect(getByText('Regenerate')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    const { getByText } = render(
      <Button type="continue" onClick={handleClick}>
        {}
        Continue
      </Button>,
    );
    fireEvent.click(getByText('Continue'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
