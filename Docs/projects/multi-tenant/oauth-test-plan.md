# OAuth Onboarding Test Plan

## Test Scenarios

### 1. New Google OAuth User
**Steps:**
1. Click "Sign in with Google" on login page
2. Complete Google OAuth flow
3. Should be redirected to `/register?oauth=true&step=org-detection`
4. Should see organization detection with their email domain
5. Should see "Signed in with Google" indicator
6. Profile fields should be pre-populated from Google
7. Complete organization setup
8. Should be redirected to `/c/new`

**Expected:**
- User is created in database with `onboardingRequired: true`
- User goes through full onboarding flow
- Organization is created/joined based on email domain
- Onboarding flags are cleared after completion

### 2. Existing Domain OAuth User
**Steps:**
1. Use an email from a domain that already has an organization
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Should see organization join screen
5. Should automatically be assigned as member
6. Complete profile setup
7. Should be redirected to `/c/new`

**Expected:**
- User joins existing organization as member
- No organization creation step shown

### 3. Returning OAuth User
**Steps:**
1. Complete onboarding once
2. Sign out
3. Click "Sign in with Google" again
4. Should be redirected directly to `/c/new`

**Expected:**
- No onboarding flow
- Direct access to application

## Database Checks

After OAuth sign-in, verify:
1. User document has correct fields:
   - `email` from OAuth provider
   - `name` from OAuth provider
   - `onboardingRequired` flag (for new users)
   - `onboardingStep` (for new users)

2. After onboarding completion:
   - User is member of organization
   - `onboardingRequired` is removed
   - `onboardingStep` is removed
   - Session has `activeOrganizationId`

## Edge Cases to Test

1. **OAuth user with no name**: Should handle gracefully in profile step
2. **OAuth user changes email**: Should detect different organization
3. **Network failure during onboarding**: State should persist
4. **Direct navigation to `/register`**: Should resume from correct step

## Implementation Notes

The implementation uses:
- Database hooks to mark new OAuth users for onboarding
- URL parameters to identify OAuth users
- Session state to track authenticated users
- Frontend state management to handle the flow

## Known Limitations

1. Better-auth doesn't directly support custom OAuth redirect URLs
2. We use database flags to track onboarding state
3. OAuth redirect happens before we can check organization status