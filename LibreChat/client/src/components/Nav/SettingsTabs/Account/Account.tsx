import React from 'react';
import { AccountProfileSetup } from './AccountProfileSetup';
import DeleteAccount from './DeleteAccount';
import { authClient } from '~/config/betterAuth';

function Account() {
  const { data: session } = authClient.useSession();

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="py-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your profile information and account preferences
        </p>
      </div>

      {/* Profile Settings */}
      <AccountProfileSetup />

      {/* Account Deletion */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Permanently delete your account and all associated data
          </p>
        </div>
        
        <DeleteAccount />
      </div>
    </div>
  );
}

export default React.memo(Account);
