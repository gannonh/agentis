import { render, screen } from 'test/layout-test-utils';
import userEvent from '@testing-library/user-event';
import PluginAuthForm from '../PluginAuthForm';
import { describe, expect, it, test, vi } from 'vitest';


describe('PluginAuthForm', () => {
  const plugin = {
    pluginKey: 'test-plugin',
    authConfig: [
      {
        authField: 'key',
        label: 'Key',
      },
      {
        authField: 'secret',
        label: 'Secret',
      },
    ],
  };

  const onSubmit = vi.fn();

  it('renders the form with the correct fields', () => {
    //@ts-ignore - dont need all props of plugin
    render(<PluginAuthForm plugin={plugin} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Key')).toBeInTheDocument();
    expect(screen.getByLabelText('Secret')).toBeInTheDocument();
  });

  it('calls the onSubmit function with the form data when submitted', async () => {
    //@ts-ignore - dont need all props of plugin
    render(<PluginAuthForm plugin={plugin} onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Key'), '1234567890');
    await userEvent.type(screen.getByLabelText('Secret'), '1234567890');
    await userEvent.click(screen.getByRole('button', { name: 'com_ui_save' }));
    expect(onSubmit).toHaveBeenCalledWith({
      pluginKey: 'test-plugin',
      action: 'install',
      auth: {
        key: '1234567890',
        // file deepcode ignore HardcodedNonCryptoSecret/test: test
        secret: '1234567890',
      },
    });
  });
});
