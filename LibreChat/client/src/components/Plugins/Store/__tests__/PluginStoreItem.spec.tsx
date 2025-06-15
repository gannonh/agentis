import { render, screen } from 'test/layout-test-utils';
import userEvent from '@testing-library/user-event';
import { TPlugin } from 'librechat-data-provider';
import PluginStoreItem from '../PluginStoreItem';
import { describe, expect, it, test, vi } from 'vitest';


const mockPlugin = {
  name: 'Test Plugin',
  description: 'This is a test plugin',
  icon: 'test-icon.png',
};

describe('PluginStoreItem', () => {
  it('renders the plugin name and description', () => {
    render(
      <PluginStoreItem
        plugin={mockPlugin as TPlugin}
        onInstall={() => {
          return;
        }}
        onUninstall={() => {
          return;
        }}
      />,
    );
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
    expect(screen.getByText('This is a test plugin')).toBeInTheDocument();
  });

  it('calls onInstall when the install button is clicked', async () => {
    const onInstall = vi.fn();
    render(
      <PluginStoreItem
        plugin={mockPlugin as TPlugin}
        onInstall={onInstall}
        onUninstall={() => {
          return;
        }}
      />,
    );
    await userEvent.click(screen.getByText('com_nav_plugin_install'));
    expect(onInstall).toHaveBeenCalled();
  });

  it('calls onUninstall when the uninstall button is clicked', async () => {
    const onUninstall = vi.fn();
    render(
      <PluginStoreItem
        plugin={mockPlugin as TPlugin}
        onInstall={() => {
          return;
        }}
        onUninstall={onUninstall}
        isInstalled
      />,
    );
    await userEvent.click(screen.getByText('com_nav_plugin_uninstall'));
    expect(onUninstall).toHaveBeenCalled();
  });
});
