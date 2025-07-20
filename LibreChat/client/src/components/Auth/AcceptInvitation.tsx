import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthContext } from '~/hooks';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { Spinner } from '~/components/svg';

interface InvitationDetails {
  id: string;
  organizationName: string;
  inviterName: string;
  role: string;
  status: string;
  expiresAt: string;
}

interface AcceptInvitationState {
  invitation: InvitationDetails | null;
  loading: boolean;
  error: string | null;
  accepting: boolean;
  declining: boolean;
  accepted: boolean;
}

function AcceptInvitation() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const localize = useLocalize();
  const { user, token } = useAuthContext();

  const [state, setState] = useState<AcceptInvitationState>({
    invitation: null,
    loading: true,
    error: null,
    accepting: false,
    declining: false,
    accepted: false,
  });

  // Fetch invitation details
  useEffect(() => {
    if (!invitationId) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Invalid invitation link',
      }));
      return;
    }

    const fetchInvitation = async () => {
      try {
        // Use public endpoint to get invitation details without authentication
        const response = await fetch(`/api/invitations/public/${invitationId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Invitation not found or has expired');
          }
          if (response.status === 409) {
            throw new Error('Invitation has already been accepted');
          }
          throw new Error('Failed to load invitation');
        }

        const data = await response.json();
        setState(prev => ({
          ...prev,
          invitation: data.data,
          loading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load invitation',
        }));
      }
    };

    fetchInvitation();
  }, [invitationId]);

  // Auto-accept invitation when user becomes authenticated
  useEffect(() => {
    const autoAcceptInvitation = async () => {
      // Only auto-accept if:
      // 1. User is authenticated
      // 2. We have an invitation
      // 3. We're not already accepting/accepted
      // 4. We don't have an error
      if (user && state.invitation && !state.accepting && !state.accepted && !state.error) {
        console.log('Auto-accepting invitation for authenticated user');
        try {
          setState(prev => ({ ...prev, accepting: true }));

          const { authClient } = await import('~/config/betterAuth');
          
          await authClient.organization.acceptInvitation({
            invitationId: invitationId!,
          });

          // Show success message first
          setState(prev => ({ ...prev, accepting: false, accepted: true }));

          // Redirect after a brief delay to show success message
          setTimeout(() => {
            navigate('/onboarding?step=welcome', { replace: true });
          }, 2000);
        } catch (error) {
          console.error('Auto-accept invitation failed:', error);
          setState(prev => ({
            ...prev,
            accepting: false,
            error: error instanceof Error ? error.message : 'Failed to accept invitation',
          }));
        }
      }
    };

    autoAcceptInvitation();
  }, [user, state.invitation, state.accepting, state.accepted, state.error, invitationId, navigate]);

  const handleAccept = async () => {
    if (!invitationId || !user) return;

    setState(prev => ({ ...prev, accepting: true }));

    try {
      // Use Better Auth directly for invitation acceptance
      const { authClient } = await import('~/config/betterAuth');
      
      await authClient.organization.acceptInvitation({
        invitationId,
      });

      // Show success message first
      setState(prev => ({ ...prev, accepting: false, accepted: true }));

      // Redirect after a brief delay to show success message
      setTimeout(() => {
        navigate('/onboarding?step=welcome', { replace: true });
      }, 2000);
    } catch (error) {
      setState(prev => ({
        ...prev,
        accepting: false,
        error: error instanceof Error ? error.message : 'Failed to accept invitation',
      }));
    }
  };

  const handleDecline = async () => {
    if (!invitationId || !user) return;

    setState(prev => ({ ...prev, declining: true }));

    try {
      // Use Better Auth directly for invitation rejection
      const { authClient } = await import('~/config/betterAuth');
      
      await authClient.organization.rejectInvitation({
        invitationId,
      });

      // Redirect to login with message
      navigate('/login?message=invitation-declined', { replace: true });
    } catch (error) {
      setState(prev => ({
        ...prev,
        declining: false,
        error: error instanceof Error ? error.message : 'Failed to decline invitation',
      }));
    }
  };

  const handleSignIn = () => {
    // Redirect to login with return URL that includes the invitation page
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    navigate(`/login?returnUrl=${returnUrl}`);
  };

  // Loading state
  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="flex items-center justify-center">
            <Spinner className="mr-2 h-6 w-6" />
            <span className="text-gray-700 dark:text-gray-300">Loading invitation...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-red-600 dark:text-red-400">
              Invitation Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{state.error}</p>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { invitation } = state;
  if (!invitation) {
    return null;
  }

  // Success state - show confirmation message
  if (state.accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
              Successfully joined the organization!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to <strong>{invitation.organizationName}</strong>! You'll be redirected to the main application shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
              You've been invited!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              You've been invited to join <strong>{invitation.organizationName}</strong>
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>{invitation.inviterName}</strong> has invited you to join their organization as a{' '}
                <strong>{invitation.role}</strong>.
              </p>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={handleSignIn}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                data-testid="sign-in-button"
              >
                Sign In to Accept
              </Button>
              
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Don't have an account? You'll be able to create one after signing in.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated state - show accept/decline options
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">
            You've been invited!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Join {invitation.organizationName}
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>{invitation.inviterName}</strong> has invited you to join{' '}
              <strong>{invitation.organizationName}</strong> as a <strong>{invitation.role}</strong>.
            </p>
          </div>

          {state.error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400">
              {state.error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleAccept}
              disabled={state.accepting || state.declining}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="accept-invitation-button"
            >
              {state.accepting ? (
                <div className="flex items-center justify-center">
                  <Spinner className="mr-2 h-4 w-4" />
                  Accepting...
                </div>
              ) : (
                'Accept Invitation'
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={state.accepting || state.declining}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              data-testid="decline-invitation-button"
            >
              {state.declining ? (
                <div className="flex items-center justify-center">
                  <Spinner className="mr-2 h-4 w-4" />
                  Declining...
                </div>
              ) : (
                'Decline'
              )}
            </button>
          </div>

          <div className="text-xs text-center text-gray-500 dark:text-gray-400">
            This invitation expires on{' '}
            {new Date(invitation.expiresAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcceptInvitation;