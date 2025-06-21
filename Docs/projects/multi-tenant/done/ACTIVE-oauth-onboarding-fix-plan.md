# Plan: Fix Google OAuth Integration with Onboarding Flow

## Goal

Ensure that new users who authenticate via Google OAuth are properly directed through the onboarding flow, including organization detection and setup.

## Implementation Steps

### 1. Update OAuth Callback Handling (Backend)

- Modify the OAuth callback in Better-auth to check if user is new
- For new users, redirect to `/register?oauth=true&step=org-detection` instead of `/c/new`
- Pass user data (email, name) via session to pre-populate the onboarding flow

### 2. Update ProgressiveRegistration Component (Frontend)

- Add logic to detect OAuth users via URL params
- Skip email and verification steps for OAuth users
- Start OAuth users directly at organization detection step
- Pre-populate profile data from OAuth provider

### 3. Handle OAuth User State

- Check for existing Better-auth session on registration page load
- If session exists but user hasn't completed onboarding, continue from appropriate step
- Store OAuth provider info to show in UI ("Signed in with Google")

### 4. Update Organization Assignment

- Ensure OAuth users get proper organization assignment based on email domain
- Create organization membership records for OAuth users

### 5. Test End-to-End Flow

- **New Google OAuth user** → Organization detection → Profile completion → Welcome
- **Existing domain OAuth user** → Organization join → Welcome
- **Return OAuth user** → Direct to app (no onboarding)

## Why This Approach?

1. **Minimal Changes**: Works with existing onboarding flow structure
2. **Consistent Experience**: All users go through same organization setup
3. **Flexible**: Easy to extend to other OAuth providers later
4. **User-Friendly**: OAuth users skip redundant steps (email verification)

