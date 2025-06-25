import { Outlet } from 'react-router-dom';
import AdminGuard from './AdminGuard';
import { AdminProvider } from '~/components/Admin/AdminProvider';
import { AdminBreadcrumbs } from '~/components/Admin/AdminBreadcrumbs';

/**
 * Admin route wrapper that provides admin context and protection
 */
export default function AdminRoute() {
  return (
    <AdminGuard>
      <AdminProvider>
        <div className="flex h-screen w-full bg-white dark:bg-gray-900">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <AdminBreadcrumbs />
            <Outlet />
          </div>
        </div>
      </AdminProvider>
    </AdminGuard>
  );
}
