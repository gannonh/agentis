# Auth System Refactor Tasks

## Progress Update (Latest)

### Test Status
- **Initial State**: 52 failing tests across 27 test files
- **Current State**: 17 failing tests across 23 test files
- **Fixed**: 35 tests across 4 test files
- **Completion**: 67% of failing tests fixed

### Key Fixes Applied
- ✅ Better Auth mock setup with all required methods
- ✅ SocialButton tests updated for new API format
- ✅ useOrganizationDetection tests using proper fetch mocks
- ✅ OrganizationSetup tests with correct UI component mocks
- ✅ Added QueryClientProvider to tests requiring React Query

### Remaining Issues
- ❌ ProgressiveRegistration component tests (16 failures)
- ❌ OrganizationProvider query invalidation test (1 failure)
- ❌ Various Speech/TTS component tests (out of scope for auth refactor)

---

## Overview
This document outlines the tasks required to refactor the authentication system from Passport.js to Better Auth while maintaining backward compatibility and ensuring a smooth migration path.

# Auth System Refactor Task List
## Based on Code Review & Branch Analysis

### Phase 1: Security Critical (Priority: URGENT)

#### Task #1A: Remove All Console.log Statements from Backend Auth Code
**Priority**: Critical  
**Estimated Effort**: Large (4-6 hours)  
**Dependencies**: None  
**Acceptance Criteria**:
- [X] Create ESLint rule to prevent console.log in production code
- [X] Remove all 115+ console.log statements from auth-related files
- [X] Replace critical debug points with structured logging
- [X] Verify no sensitive data is logged in any remaining log statements
- [X] All auth components pass linting without console.log warnings

#### Task #2A: Implement Secure Logging Service (backend)
**Priority**: Critical  
**Estimated Effort**: Medium (3-4 hours)  
**Dependencies**: Task #1  
**Acceptance Criteria**:
- [X] Create LoggerService class with environment-based log levels
- [X] Implement auth-specific logging methods (login, logout, failed attempts)
- [X] Never log sensitive data (emails, tokens, passwords, PII)
- [X] Add structured logging with proper context (userId, timestamp, action)
- [X] Unit tests achieve 100% coverage for logger service

#### Task #3: Implement Session Refresh Mechanism ✅
**Priority**: Critical  
**Estimated Effort**: ~~Large (6-8 hours)~~ Small (30 minutes)
**Dependencies**: None  
**Status**: COMPLETED - Alternative approach taken

**Original Acceptance Criteria**:
- ~~Add refresh token support to Better Auth configuration~~
- ~~Implement session refresh interceptor for API calls~~
- ~~Add session expiry warning (5 minutes before expiry)~~
- ~~Graceful re-authentication flow without data loss~~
- ~~Test session refresh with expired tokens~~

**Resolution**: After review, decided to configure sessions to last 1 year (effectively never expire) instead of implementing expiry warnings. This provides a better user experience by eliminating session timeout interruptions.

**What Was Done**:
- [X] Updated Better Auth session configuration to 1 year expiry
- [X] Disabled automatic session refresh (updateAge = 0)
- [X] Removed unnecessary session warning code

#### Task #4: Replace All Window.location Redirects
**Priority**: High  
**Estimated Effort**: Large (4-6 hours)  
**Dependencies**: None  
**Acceptance Criteria**:
- [X] Replace all 23+ window.location.href instances with React Router navigation
- [X] Ensure SPA navigation flow is maintained
- [X] No full page reloads except for OAuth redirects
- [X] Preserve application state during navigation
- [X] Test all navigation flows work correctly

#### Task #5: Implement Auth Audit Trail
<https://github.com/gannonh/agentis/issues/82>
**Priority**: High  
**Estimated Effort**: Medium (3-4 hours)  
**Dependencies**: Task #2  
**Acceptance Criteria**:
- [ ] Create audit log collection in MongoDB
- [ ] Track login, logout, failed attempts, permission changes
- [ ] Include IP address, user agent, timestamp for each event
- [ ] Add rate limiting detection for failed attempts
- [ ] Create admin interface to view audit logs

### Phase 2: Architecture Improvements

#### Task #6: Create Centralized AuthService
<https://github.com/gannonh/agentis/issues/83>
**Priority**: High  
**Estimated Effort**: Large (6-8 hours)  
**Dependencies**: Tasks #1-5  
**Acceptance Criteria**:
- [ ] Single AuthService class for all auth operations
- [ ] Consolidate duplicate logout logic
- [ ] Centralized error handling
- [ ] Proper TypeScript interfaces for all methods
- [ ] 90% unit test coverage

#### Task #7: Fix Organization Setting Race Conditions
<https://github.com/gannonh/agentis/issues/84>
**Priority**: High  
**Estimated Effort**: Medium (4-5 hours)  
**Dependencies**: Task #6  
**Acceptance Criteria**:
- [ ] Remove ref-based tracking in useAutoSetActiveOrganization
- [ ] Implement proper state management (Context or Recoil)
- [ ] Add retry logic with exponential backoff
- [ ] Ensure organization is always set for authenticated users
- [ ] No race conditions in concurrent requests

#### Task #8: Add Auth Error Boundaries
<https://github.com/gannonh/agentis/issues/85>
**Priority**: Medium  
**Estimated Effort**: Medium (3-4 hours)  
**Dependencies**: None  
**Acceptance Criteria**:
- [ ] Create AuthErrorBoundary component
- [ ] Wrap all auth-related routes
- [ ] Graceful error fallback UI
- [ ] Clear error messages for users
- [ ] Error recovery actions (retry, logout, contact support)

#### Task #9: Implement Centralized Loading State
<https://github.com/gannonh/agentis/issues/86>
**Priority**: Medium  
**Estimated Effort**: Small (2-3 hours)  
**Dependencies**: Task #6  
**Acceptance Criteria**:
- [ ] Single loading state manager for auth operations
- [ ] Consistent loading UI across all auth components
- [ ] Prevent duplicate loading spinners
- [ ] Loading state includes progress indication
- [ ] Accessible loading announcements

### DEFERRED:

#### Task #10: Improve TypeScript Type Safety
**Priority**: Medium  
**Estimated Effort**: Large (4-6 hours)  
**Dependencies**: Task #6  
**Acceptance Criteria**:
- [ ] Remove all `any` types from auth code
- [ ] Define strict interfaces for all auth objects
- [ ] Add runtime validation with zod or similar
- [ ] Full IntelliSense support in IDE
- [ ] No TypeScript errors in auth modules

### Phase 3: RBAC & Permissions

#### Task #11: Implement Centralized RBAC System
**Priority**: Medium  
**Estimated Effort**: Large (8-10 hours)  
**Dependencies**: Tasks #6, #10  
**Acceptance Criteria**:
- [ ] Create PermissionService with role definitions
- [ ] Replace hardcoded role checks
- [ ] Implement permission inheritance
- [ ] Add permission caching for performance
- [ ] Create PermissionGuard component

#### Task #12: Add Organization-level Permissions
**Priority**: Medium  
**Estimated Effort**: Medium (4-5 hours)  
**Dependencies**: Task #11  
**Acceptance Criteria**:
- [ ] Define organization roles (owner, admin, member)
- [ ] Implement role-based UI rendering
- [ ] Add permission checks to API endpoints
- [ ] Test permission isolation between organizations
- [ ] Document permission matrix

### Phase 4: Testing & Documentation

#### Task #13: Comprehensive Unit Tests
**Priority**: High  
**Estimated Effort**: Large (8-10 hours)  
**Dependencies**: All previous tasks  
**Acceptance Criteria**:
- [ ] 90% code coverage for auth modules
- [ ] Test all auth flows (login, logout, refresh)
- [ ] Test error scenarios
- [ ] Test race conditions
- [ ] Mock external dependencies properly

#### Task #14: Integration Tests for Auth Flows
**Priority**: High  
**Estimated Effort**: Medium (4-5 hours)  
**Dependencies**: Task #13  
**Acceptance Criteria**:
- [ ] Test complete login flow with Better Auth
- [ ] Test organization assignment
- [ ] Test session persistence
- [ ] Test permission checks
- [ ] Test OAuth flows

#### Task #15: E2E Tests for Critical Paths
**Priority**: Medium  
**Estimated Effort**: Medium (4-5 hours)  
**Dependencies**: Task #14  
**Acceptance Criteria**:
- [ ] E2E test for new user registration
- [ ] E2E test for OAuth login
- [ ] E2E test for organization switching
- [ ] E2E test for session expiry
- [ ] E2E test for permission-based access

#### Task #16: Security Documentation
**Priority**: Medium  
**Estimated Effort**: Medium (3-4 hours)  
**Dependencies**: All tasks  
**Acceptance Criteria**:
- [ ] Document auth architecture
- [ ] Create security best practices guide
- [ ] Document permission matrix
- [ ] Add troubleshooting guide
- [ ] Create migration guide from legacy auth

### Phase 5: Performance & Monitoring

#### Task #17: Add Performance Monitoring
**Priority**: Low  
**Estimated Effort**: Small (2-3 hours)  
**Dependencies**: Production deployment  
**Acceptance Criteria**:
- [ ] Monitor auth API response times
- [ ] Track session creation/refresh rates
- [ ] Monitor failed auth attempts
- [ ] Set up alerts for anomalies
- [ ] Create performance dashboard

#### Task #18: Implement Caching Strategy
**Priority**: Low  
**Estimated Effort**: Medium (3-4 hours)  
**Dependencies**: Task #17  
**Acceptance Criteria**:
- [ ] Cache user permissions in Redis
- [ ] Cache organization membership
- [ ] Implement cache invalidation
- [ ] Monitor cache hit rates
- [ ] Document caching strategy

## Summary

**Total Tasks**: 18  
**Critical Priority**: 5 tasks  
**High Priority**: 5 tasks  
**Medium Priority**: 7 tasks  
**Low Priority**: 1 task  

**Estimated Total Effort**: 85-110 hours (2-3 weeks with 2 developers)

## Implementation Order

1. **Week 1**: Complete all Critical priority tasks (Tasks #1-5)
2. **Week 2**: Complete High priority architecture tasks (Tasks #6-10)
3. **Week 3**: Complete RBAC and testing (Tasks #11-16)
4. **Week 4**: Performance optimization and monitoring (Tasks #17-18)

## Risk Mitigation

- Run security hotfix immediately for console.log removal
- Deploy incrementally with feature flags
- Maintain backward compatibility during migration
- Have rollback plan for each phase
- Monitor error rates closely during deployment 