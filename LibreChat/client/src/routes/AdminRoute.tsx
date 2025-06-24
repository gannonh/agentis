import { Outlet } from 'react-router-dom';
import AdminGuard from './AdminGuard';
import { AdminProvider } from '~/components/Admin/AdminProvider';

/**
 * Admin route wrapper that provides admin context and protection
 */
export default function AdminRoute() {
  return (
    <AdminGuard>
      <AdminProvider>
        <div className="flex h-screen w-full bg-white dark:bg-gray-900">
          <Outlet />
        </div>
      </AdminProvider>
    </AdminGuard>
  );
}