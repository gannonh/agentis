# Plan: Refactor Login Page for Magic Link and Google OAuth Only

## Current State Analysis

1. Registration page (`/register`) already uses the new Better Auth implementation with magic link flow
2. Login page (`/login`) still shows legacy username/password fields
3. Magic link functionality is already implemented in Better Auth and working for registration
4. Google OAuth is already configured and available

## Changes Required

### 1. Create New MagicLinkLogin Component
**Location:** `client/src/components/Auth/MagicLinkLogin.tsx`

- Similar to the email step in ProgressiveRegistration
- Only email input field
- Sends magic link via `authClient.signIn.magicLink()`
- Shows confirmation message after sending
- Handles magic link verification when user returns

### 2. Update Login Component
**Location:** `client/src/components/Auth/Login.tsx`

- Remove LoginForm component usage
- Replace with new MagicLinkLogin component
- Keep Google OAuth button
- Remove password-related UI elements

### 3. Remove/Deprecate LoginForm Component
**Location:** `client/src/components/Auth/LoginForm.tsx`

- Mark as deprecated or remove entirely
- This component handles username/password which we're removing

### 4. Update Backend Login Route
**Location:** `api/server/routes/auth.js`

- The `/api/auth/login` endpoint can be deprecated
- Magic link requests go through Better Auth's `/api/auth/sign-in/magic-link` endpoint
- Keep Better Auth middleware handling

### 5. Update AuthContext
**Location:** `client/src/hooks/AuthContext.tsx`

- Remove or deprecate the login function that takes username/password
- Focus on session-based authentication via Better Auth

### 6. Clean Up Related Files

- Remove password reset components if not needed
- Update localization files to remove password-related strings
- Update tests to reflect new authentication flow

## Implementation Steps

1. Create the new MagicLinkLogin component
2. Update the Login page to use the new component
3. Test magic link flow end-to-end
4. Remove deprecated code
5. Update documentation

## Key Benefits

- **Consistent authentication experience** between registration and login
- **More secure** (no passwords to store or manage)
- **Simpler user experience**
- **Aligns with modern authentication practices**

---

*Would you like me to proceed with implementing these changes?*