import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import {
  Login,
  Registration,
  VerifyEmail,
  ApiErrorWatcher,
  TwoFactorScreen,
  AcceptInvitation,
} from '~/components/Auth';
import { ProgressiveRegistration } from '~/components/Auth/ProgressiveRegistration';
import { OAuthOnboardingRedirect } from '~/components/Auth/OAuthOnboardingRedirect';
import { ComposioTestPage } from '~/components/Composio';
import { AdminDashboard } from '~/components/Admin/AdminDashboard';
import { UserManagement } from '~/components/Admin/UserManagement';
import { SessionManagement } from '~/components/Admin/SessionManagement';
import { OrganizationManagement } from '~/components/Admin/OrganizationManagement';
import { SystemSettings } from '~/components/Admin/SystemSettings';
import RouteErrorBoundary from './RouteErrorBoundary';
import StartupLayout from './Layouts/Startup';
import LoginLayout from './Layouts/Login';
import dashboardRoutes from './Dashboard';
import ShareRoute from './ShareRoute';
import ChatRoute from './ChatRoute';
import AdminRoute from './AdminRoute';
import Search from './Search';
import Root from './Root';
import AuthGuard from './AuthGuard';
import OnboardGuard from './OnboardGuard';
import OnboardingRoute from './OnboardingRoute';

const AuthLayout = () => (
  <>
    <Outlet />
    <ApiErrorWatcher />
  </>
);

export const router = createBrowserRouter([
  {
    path: 'share/:shareId',
    element: <ShareRoute />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: <StartupLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <AuthGuard>
            <OnboardGuard>
              <Navigate to="/c/new" replace={true} />
            </OnboardGuard>
          </AuthGuard>
        ),
      },
      {
        path: 'register',
        element: <Navigate to="/login" replace={true} />,
      },
      {
        path: 'onboarding',
        element: <OnboardingRoute />,
      },
    ],
  },
  {
    path: 'verify',
    element: <VerifyEmail />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: 'auth/accept-invitation/:invitationId',
        element: <AcceptInvitation />,
      },
      {
        path: '/',
        element: <LoginLayout />,
        children: [
          {
            path: 'login',
            element: <Login />,
          },
          {
            path: 'login/2fa',
            element: <TwoFactorScreen />,
          },
        ],
      },
      dashboardRoutes,
      {
        path: 'admin',
        element: <AdminRoute />,
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: 'users',
            element: <UserManagement />,
          },
          {
            path: 'sessions',
            element: <SessionManagement />,
          },
          {
            path: 'organizations',
            element: <OrganizationManagement />,
          },
          {
            path: 'settings',
            element: <SystemSettings />,
          },
        ],
      },
      {
        path: '/',
        element: (
          <AuthGuard>
            <OnboardGuard>
              <Root />
            </OnboardGuard>
          </AuthGuard>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="/c/new" replace={true} />,
          },
          {
            path: 'c/:conversationId?',
            element: (
              <OAuthOnboardingRedirect>
                <ChatRoute />
              </OAuthOnboardingRedirect>
            ),
          },
          {
            path: 'search',
            element: <Search />,
          },
          {
            path: 'composio-test',
            element: <ComposioTestPage />,
          },
        ],
      },
    ],
  },
]);
