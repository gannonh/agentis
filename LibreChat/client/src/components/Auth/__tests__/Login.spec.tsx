import reactRouter from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { getByTestId, render, waitFor } from 'test/layout-test-utils';
import type { TStartupConfig } from 'librechat-data-provider';
import * as endpointQueries from '~/data-provider/Endpoints/queries';
import * as miscDataProvider from '~/data-provider/Misc/queries';
import * as authMutations from '~/data-provider/Auth/mutations';
import * as authQueries from '~/data-provider/Auth/queries';
import AuthLayout from '~/components/Auth/AuthLayout';
import Login from '~/components/Auth/Login';
import { describe, expect, it, test, vi } from 'vitest';

vi.mock('librechat-data-provider/react-query');

// Mock AuthContext to prevent real API calls
vi.mock('~/hooks/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuthContext: () => ({
      error: null,
      setError: vi.fn(),
      login: vi.fn(),
    }),
    AuthContextProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

const mockStartupConfig = {
  isFetching: false,
  isLoading: false,
  isError: false,
  data: {
    socialLogins: ['google', 'facebook', 'openid', 'github', 'discord'],
    discordLoginEnabled: true,
    facebookLoginEnabled: true,
    githubLoginEnabled: true,
    googleLoginEnabled: true,
    openidLoginEnabled: true,
    openidLabel: 'Test OpenID',
    openidImageUrl: 'http://test-server.com',
    ldap: {
      enabled: false,
    },
    registrationEnabled: true,
    emailLoginEnabled: true,
    socialLoginEnabled: true,
    serverDomain: 'mock-server',
  },
};

const setup = ({
  useGetUserQueryReturnValue = {
    isLoading: false,
    isError: false,
    data: {},
  },
  useLoginUserReturnValue = {
    isLoading: false,
    isError: false,
    mutate: vi.fn(),
    data: {},
    isSuccess: false,
  },
  useRefreshTokenMutationReturnValue = {
    isLoading: false,
    isError: false,
    mutate: vi.fn(),
    data: {
      token: 'mock-token',
      user: {},
    },
  },
  useGetStartupConfigReturnValue = mockStartupConfig,
  useGetBannerQueryReturnValue = {
    isLoading: false,
    isError: false,
    data: {},
  },
} = {}) => {
  const mockUseLoginUser = vi
    .spyOn(authMutations, 'useLoginUserMutation')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useLoginUserReturnValue);
  const mockUseGetUserQuery = vi
    .spyOn(authQueries, 'useGetUserQuery')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetUserQueryReturnValue);
  const mockUseGetStartupConfig = vi
    .spyOn(endpointQueries, 'useGetStartupConfig')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetStartupConfigReturnValue);
  const mockUseRefreshTokenMutation = vi
    .spyOn(authMutations, 'useRefreshTokenMutation')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useRefreshTokenMutationReturnValue);
  const mockUseGetBannerQuery = vi
    .spyOn(miscDataProvider, 'useGetBannerQuery')
    //@ts-ignore - we don't need all parameters of the QueryObserverSuccessResult
    .mockReturnValue(useGetBannerQueryReturnValue);
  // Mock is already handled by vi.mock above
  const renderResult = render(
    <AuthLayout
      startupConfig={useGetStartupConfigReturnValue.data as TStartupConfig}
      isFetching={useGetStartupConfigReturnValue.isFetching}
      error={null}
      startupConfigError={null}
      header={'Welcome back'}
      pathname="login"
    >
      <Login />
    </AuthLayout>,
  );
  return {
    ...renderResult,
    mockUseLoginUser,
    mockUseGetUserQuery,
    mockUseGetStartupConfig,
    mockUseRefreshTokenMutation,
    mockUseGetBannerQuery,
  };
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useOutletContext: () => ({
      startupConfig: mockStartupConfig.data,
    }),
  };
});

test('renders login form', () => {
  const { getByLabelText, getByRole, getByTestId } = setup();
  
  // Check if login form is rendered
  expect(getByLabelText(/com_auth_email/i)).toBeInTheDocument();
  expect(getByLabelText(/com_auth_password/i)).toBeInTheDocument();
  expect(getByTestId('login-button')).toBeInTheDocument();
  expect(getByRole('link', { name: /com_auth_sign_up/i })).toBeInTheDocument();
  expect(getByRole('link', { name: /com_auth_sign_up/i })).toHaveAttribute('href', '/register');
  
  // Social login buttons are now button elements with aria-labels
  expect(getByTestId('google')).toBeInTheDocument();
  expect(getByTestId('facebook')).toBeInTheDocument();
  expect(getByTestId('github')).toBeInTheDocument();
  expect(getByTestId('discord')).toBeInTheDocument();
  expect(getByTestId('openid')).toBeInTheDocument();
});

test('calls loginUser.mutate on login', async () => {
  const mutate = vi.fn();
  const { getByLabelText } = setup({
    // @ts-ignore - we don't need all parameters of the QueryObserverResult
    useLoginUserReturnValue: {
      isLoading: false,
      mutate: mutate,
      isError: false,
    },
  });

  const emailInput = getByLabelText(/com_auth_email/i);
  const passwordInput = getByLabelText(/com_auth_password/i);
  const submitButton = getByTestId(document.body, 'login-button');

  await userEvent.type(emailInput, 'test@test.com');
  await userEvent.type(passwordInput, 'password');
  await userEvent.click(submitButton);

  waitFor(() => expect(mutate).toHaveBeenCalled());
});

test('Navigates to / on successful login', async () => {
  const { getByLabelText, history } = setup({
    // @ts-ignore - we don't need all parameters of the QueryObserverResult
    useLoginUserReturnValue: {
      isLoading: false,
      mutate: vi.fn(),
      isError: false,
      isSuccess: true,
    },
    useGetStartupConfigReturnValue: {
      ...mockStartupConfig,
      data: {
        ...mockStartupConfig.data,
        emailLoginEnabled: true,
        registrationEnabled: true,
      },
    },
  });

  const emailInput = getByLabelText(/com_auth_email/i);
  const passwordInput = getByLabelText(/com_auth_password/i);
  const submitButton = getByTestId(document.body, 'login-button');

  await userEvent.type(emailInput, 'test@test.com');
  await userEvent.type(passwordInput, 'password');
  await userEvent.click(submitButton);

  waitFor(() => expect(history.location.pathname).toBe('/'));
});
