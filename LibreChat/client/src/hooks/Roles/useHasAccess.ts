import { useMemo, useCallback } from 'react';
import type { TUser, PermissionTypes, Permissions } from 'librechat-data-provider';
import { useAuthContext } from '~/hooks';

const useHasAccess = ({
  permissionType,
  permission,
}: {
  permissionType: PermissionTypes;
  permission: Permissions;
}) => {
  const authContext = useAuthContext();
  const user = authContext?.user;
  const roles = authContext?.roles;
  const isAuthenticated = authContext?.isAuthenticated || false;

  const checkAccess = useCallback(
    ({
      user,
      permissionType,
      permission,
    }: {
      user?: TUser | null;
      permissionType: PermissionTypes;
      permission: Permissions;
    }) => {
      if (isAuthenticated && user?.role != null && roles && roles[user.role]) {
        return roles[user.role]?.permissions?.[permissionType]?.[permission] === true;
      }
      return false;
    },
    [isAuthenticated, roles],
  );

  const hasAccess = useMemo(
    () => checkAccess({ user, permissionType, permission }),
    [user, permissionType, permission, checkAccess],
  );

  return hasAccess;
};

export default useHasAccess;
