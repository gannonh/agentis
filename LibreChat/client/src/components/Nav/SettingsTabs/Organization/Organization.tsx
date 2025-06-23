/**
 * @fileoverview Organization tab for Settings modal
 * @module components/Nav/SettingsTabs/Organization/Organization
 */

import React from 'react';
import { OrganizationSettings } from '~/components/Organization/OrganizationSettings';

/**
 * Organization settings tab component for the Settings modal
 * Integrates the existing OrganizationSettings component
 */
function Organization() {
  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <OrganizationSettings />
    </div>
  );
}

export default React.memo(Organization);
