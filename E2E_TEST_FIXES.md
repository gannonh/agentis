# E2E Test Fixes Progress

This document tracks the progress of fixing non-auth e2e tests that are failing due to authentication system changes.

## Problem

Non-auth e2e tests are failing because they use the old authentication pattern (`createTestUserWithOrganization()`) which doesn't properly authenticate users in the new auth system.

## Strategy  

Fix the existing `createTestUserWithOrganization()` function to properly inject session state, rather than rewriting all tests to use the new magic link authentication flow.

## Progress

- [ ] Debug session injection issues
- [ ] Fix cookie format and authentication state
- [ ] Add onboarding completion bypass
- [ ] Test with agent-cta-display.spec.ts
- [ ] Apply to other failing tests

## Files to Modify

1. `/LibreChat/e2e/utils/testAuth.ts` - Core authentication utility
2. `/LibreChat/e2e/specs/agent-cta-display.spec.ts` - Primary test to validate fixes
3. Other failing test files as needed

## Notes

This approach maintains separation of concerns:
- Auth/onboarding tests use real authentication flow
- Feature tests bypass auth complexity for faster, focused testing