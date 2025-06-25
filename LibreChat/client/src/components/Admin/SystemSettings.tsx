/**
 * @fileoverview System settings interface for admin panel
 * @module components/Admin/SystemSettings
 */

import React, { useState } from 'react';
import {
  Settings,
  Globe,
  Shield,
  Key,
  Database,
  Zap,
  Bell,
  Mail,
  Save,
  AlertTriangle,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { Switch } from '~/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/Tabs';

interface SystemSettingsProps {
  className?: string;
}

/**
 * System settings component for admin panel
 * Provides configuration options for platform-wide settings
 */
const SystemSettings: React.FC<SystemSettingsProps> = ({ className = '' }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Placeholder settings state
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Agentis',
      siteDescription: 'AI Conversations Platform',
      maintenanceMode: false,
      allowRegistration: true,
      requireEmailVerification: true,
    },
    security: {
      enableTwoFactor: true,
      sessionTimeout: 24,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      enableRateLimit: true,
    },
    api: {
      defaultModel: 'gpt-4',
      maxTokens: 4000,
      temperature: 0.7,
      enableStreaming: true,
      apiTimeout: 30,
    },
    notifications: {
      enableEmailNotifications: true,
      adminEmail: 'admin@example.com',
      sendWelcomeEmail: true,
      sendPasswordReset: true,
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  const updateSetting = (category: string, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value,
      },
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Settings</h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Configure platform-wide settings and preferences
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {saveMessage && (
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              <span className="text-sm">{saveMessage}</span>
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start space-x-3 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
        <div className="text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">Settings UI Preview</p>
          <p className="mt-1">
            This settings interface is a preview. Settings are not persisted to the backend yet.
            Full implementation requires backend API integration.
          </p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="rounded-lg bg-white shadow dark:bg-gray-800">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="border-b border-gray-200 bg-transparent p-0 dark:border-gray-700">
            <TabsTrigger
              value="general"
              className="border-b-2 border-transparent px-6 py-3 data-[state=active]:border-blue-600"
            >
              <Globe className="mr-2 h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="border-b-2 border-transparent px-6 py-3 data-[state=active]:border-blue-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="border-b-2 border-transparent px-6 py-3 data-[state=active]:border-blue-600"
            >
              <Zap className="mr-2 h-4 w-4" />
              API
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="border-b-2 border-transparent px-6 py-3 data-[state=active]:border-blue-600"
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.general.siteName}
                  onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  The name of your platform
                </p>
              </div>

              <div>
                <Label htmlFor="siteDescription">Site Description</Label>
                <Input
                  id="siteDescription"
                  value={settings.general.siteDescription}
                  onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Brief description of your platform
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Maintenance Mode</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Temporarily disable access for non-admin users
                  </p>
                </div>
                <Switch
                  checked={settings.general.maintenanceMode}
                  onCheckedChange={(checked) =>
                    updateSetting('general', 'maintenanceMode', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Allow Registration</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow new users to create accounts
                  </p>
                </div>
                <Switch
                  checked={settings.general.allowRegistration}
                  onCheckedChange={(checked) =>
                    updateSetting('general', 'allowRegistration', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Require Email Verification
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Users must verify their email before accessing the platform
                  </p>
                </div>
                <Switch
                  checked={settings.general.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    updateSetting('general', 'requireEmailVerification', checked)
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    updateSetting('security', 'sessionTimeout', parseInt(e.target.value))
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Automatically log out users after this period
                </p>
              </div>

              <div>
                <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                <Input
                  id="passwordMinLength"
                  type="number"
                  value={settings.security.passwordMinLength}
                  onChange={(e) =>
                    updateSetting('security', 'passwordMinLength', parseInt(e.target.value))
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Minimum number of characters for passwords
                </p>
              </div>

              <div>
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) =>
                    updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))
                  }
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Lock account after this many failed attempts
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Enable Two-Factor Authentication
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow users to enable 2FA for their accounts
                  </p>
                </div>
                <Switch
                  checked={settings.security.enableTwoFactor}
                  onCheckedChange={(checked) =>
                    updateSetting('security', 'enableTwoFactor', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Enable Rate Limiting
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Protect against abuse with request rate limits
                  </p>
                </div>
                <Switch
                  checked={settings.security.enableRateLimit}
                  onCheckedChange={(checked) =>
                    updateSetting('security', 'enableRateLimit', checked)
                  }
                />
              </div>
            </div>
          </TabsContent>

          {/* API Settings */}
          <TabsContent value="api" className="space-y-6 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="defaultModel">Default AI Model</Label>
                <Input
                  id="defaultModel"
                  value={settings.api.defaultModel}
                  onChange={(e) => updateSetting('api', 'defaultModel', e.target.value)}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Default model for new conversations
                </p>
              </div>

              <div>
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={settings.api.maxTokens}
                  onChange={(e) => updateSetting('api', 'maxTokens', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Maximum tokens per API request
                </p>
              </div>

              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={settings.api.temperature}
                  onChange={(e) => updateSetting('api', 'temperature', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Model creativity (0-2)
                </p>
              </div>

              <div>
                <Label htmlFor="apiTimeout">API Timeout (seconds)</Label>
                <Input
                  id="apiTimeout"
                  type="number"
                  value={settings.api.apiTimeout}
                  onChange={(e) => updateSetting('api', 'apiTimeout', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Maximum time to wait for API responses
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Enable Streaming</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Stream AI responses in real-time
                </p>
              </div>
              <Switch
                checked={settings.api.enableStreaming}
                onCheckedChange={(checked) => updateSetting('api', 'enableStreaming', checked)}
              />
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6 p-6">
            <div>
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.notifications.adminEmail}
                onChange={(e) => updateSetting('notifications', 'adminEmail', e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Email address for system notifications
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Enable Email Notifications
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Send email notifications to users
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.enableEmailNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting('notifications', 'enableEmailNotifications', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Send Welcome Email</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Send welcome email to new users
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.sendWelcomeEmail}
                  onCheckedChange={(checked) =>
                    updateSetting('notifications', 'sendWelcomeEmail', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Send Password Reset Email
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Allow users to reset their password via email
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.sendPasswordReset}
                  onCheckedChange={(checked) =>
                    updateSetting('notifications', 'sendPasswordReset', checked)
                  }
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Info Box */}
      <div className="flex items-start space-x-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">Configuration Note</p>
          <p className="mt-1">
            Some settings may require server restart to take effect. Advanced configuration options
            are available in the environment variables and librechat.yaml file.
          </p>
        </div>
      </div>
    </div>
  );
};

export { SystemSettings };
