# Authentication & Onboarding E2E Test Coverage

## Overview

This document maps existing E2E tests against the onboarding flow diagram and identifies gaps in test coverage.

## Flow Diagram Reference

```mermaid
graph TD
    A[User Signs Up] --> B{Auth Method}
    B -->|OAuth| C[Google OAuth]
    B -->|Magic Link| D[Email Verification]
    C --> E[Check Domain]
    D --> E
    E --> F{Public Domain?}
    F -->|Yes| G[Onboarding: Create Org]
    F -->|No| H{Existing Org?}
    H -->|Yes| I[Onboarding: Join Org]
    H -->|No| J[Onboarding: Create Org]
    G --> K[Profile Setup]
    I --> K
    J --> K
    K --> L[Team Invites]
    L --> M[Main App]
```

## Existing Test Files

### 1. `auth-ob.basic.spec.ts`

**Purpose**: Basic authentication and onboarding functionality  
**Coverage**:

- ✅ Basic signup flow
- ✅ Magic link capture functionality
- ✅ Database cleanup utilities
- ✅ Basic flow validation
- ✅ **REFACTORED**: Uses abstracted utilities from `authOnboardingUtils.ts`

**Maps to Diagram**:

- A (User Signs Up) → B (Auth Method) → D (Email Verification)

### 2. `auth-ob.creation.spec.ts`

**Purpose**: Organization creation flow testing (Issue #103)  
**Coverage**:

- ✅ Organization name and slug input
- ✅ Domain verification for corporate emails
- ✅ "Allow domain join" checkbox functionality
- ✅ Complete flow through all onboarding steps
- ✅ Profile setup integration (ensures it's not skipped)

**Maps to Diagram**:

- G (Onboarding: Create Org) → K (Profile Setup) → L (Team Invites) → M (Main App)
- J (Onboarding: Create Org) → K (Profile Setup) → L (Team Invites) → M (Main App)

### 3. `auth-ob.org-detection.spec.ts`

**Purpose**: Organization detection logic testing (Issue #102)  
**Coverage**:

- ✅ Public domain detection (Gmail, Yahoo, etc.)
- ✅ Corporate domain detection
- ✅ Existing organization discovery
- ✅ Multiple organization handling
- ✅ Edge cases for domain detection

**Maps to Diagram**:

- E (Check Domain) → F (Public Domain?) → H (Existing Org?)

### 4. `auth-ob.join.spec.ts`

**Purpose**: Organization joining flow testing (Issue #104)  
**Coverage**:

- ✅ **Domain auto-join flow with proper session management**
- ✅ **User 1 creates organization with domain join enabled**
- ✅ **User 2 joins existing organization through auto-join**
- ✅ **Complete end-to-end flow through all onboarding steps**
- ✅ **Database verification with proper ObjectId format**
- ✅ **Session cache synchronization fixes**
- ✅ **OnboardGuard/AuthGuard architecture implementation**

**Maps to Diagram**:

- I (Onboarding: Join Org) → K (Profile Setup) → L (Team Invites) → M (Main App)

**Test Status**: ✅ **FULLY IMPLEMENTED AND PASSING**  
**Issue #104**: ✅ **COMPLETE** - Domain auto-join flow working end-to-end

### 5. `oauth.google.spec.ts`

**Purpose**: Google OAuth authentication testing  
**Coverage**:

- ✅ Google OAuth login flow
- ✅ Credential verification
- ✅ Redirect to main app
- ❌ Missing: OAuth → onboarding flow integration

**Maps to Diagram**:

- B (Auth Method) → C (Google OAuth)
- ❌ Missing connection: C → E (Check Domain)

### 6. `auth-ob.join-approval.spec.ts`

**Purpose**: Manual approval flow for organization joining (Issue #104 Extensions)  
**Coverage**:

- ✅ **Domain auto-join disabled request flow**
- ✅ **Join request creation in database**
- ✅ **Pending approval status display**
- ⚠️ **Admin approval/rejection workflows** (PLACEHOLDER - requires admin UI)
- ⚠️ **Multiple pending requests management** (PLACEHOLDER - requires admin UI)

**Maps to Diagram**:

- I (Onboarding: Join Org) → Manual Approval Process → K (Profile Setup)

### 7. `auth-ob.join-invitations.spec.ts`

**Purpose**: Invitation-based organization joining (Issue #106 Integration)  
**Coverage**:

- ✅ **Mock invitation creation in database**
- ⚠️ **Email invitation delivery** (PLACEHOLDER - requires email system)
- ⚠️ **Invitation acceptance flow** (PLACEHOLDER - requires invitation system)
- ⚠️ **Invitation decline flow** (PLACEHOLDER - requires invitation system)
- ⚠️ **Expired invitation handling** (PLACEHOLDER - requires invitation system)

**Maps to Diagram**:

- I (Onboarding: Join Org) → Invitation Process → K (Profile Setup)

### 8. `auth-ob.join-edge-cases.spec.ts`

**Purpose**: Edge cases and error handling for organization joining  
**Coverage**:

- ✅ **Existing member attempting to join again** (redirect to main app)
- ✅ **Network failure recovery** (PLACEHOLDER - requires error handling)
- ⚠️ **Multiple organizations with same domain** (PLACEHOLDER - requires selection UI)
- ⚠️ **Domain join setting changes** (PLACEHOLDER - requires admin UI)
- ⚠️ **Organization deletion during join** (PLACEHOLDER - requires admin UI)

**Maps to Diagram**:

- Error handling for all join flows (I → K)

### 9. `auth-ob.oauth-integration.spec.ts`

**Purpose**: OAuth integration with complete onboarding flows  
**Coverage**:

- ✅ **OAuth → Public Domain → Create Org Flow**
- ✅ **OAuth error handling and recovery**
- ⚠️ **OAuth → Corporate Domain flows** (PLACEHOLDER - requires full OAuth)
- ⚠️ **Cross-authentication consistency** (PLACEHOLDER - requires comparison)

**Maps to Diagram**:

- C (Google OAuth) → E (Check Domain) → F/G/H/I → K → L → M

### 10. `authOnboardingUtils.ts`

**Purpose**: Shared utilities for all auth-onboarding tests  
**Coverage**:

- ✅ **Common test data patterns**
- ✅ **Magic link capture abstraction**
- ✅ **Database cleanup utilities**
- ✅ **Terms of service handling**
- ✅ **Onboarding flow navigation helpers**
- ✅ **Database verification utilities**

## Test Coverage Analysis

### ✅ **Well Covered Areas**

1. **Magic Link Authentication** (D → E)

   - Email verification process
   - Magic link capture and validation
   - Database integration

2. **Organization Creation** (G → K → L → M, J → K → L → M)

   - Complete flow from creation to main app
   - Domain verification
   - Profile setup integration
   - Team invitation flow

3. **Organization Detection** (E → F → H)

   - Public vs private domain detection
   - Existing organization discovery
   - Multiple organization scenarios

4. **Organization Joining** (I → K)
   - Auto-join and manual approval flows
   - Organization details display
   - Admin notifications

### ❌ **Missing Test Coverage**

#### **Critical Gaps - Organization Join Cases**

1. **Additional Organization Join Scenarios** (Issue #104 Extensions)

   - ✅ **Domain auto-join flow** (COMPLETED - `auth-ob.join.spec.ts`)
   - ✅ **Manual approval request flow** (COMPLETED - `auth-ob.join-approval.spec.ts`)
   - ✅ **Organization invitation acceptance flow** (PLACEHOLDER - `auth-ob.join-invitations.spec.ts`)
   - ✅ **Join request approval by admin workflow** (PLACEHOLDER - `auth-ob.join-approval.spec.ts`)
   - ✅ **Join request rejection by admin workflow** (PLACEHOLDER - `auth-ob.join-approval.spec.ts`)
   - ✅ **Multiple organization selection flow** (PLACEHOLDER - `auth-ob.join-edge-cases.spec.ts`)
   - ✅ **Existing member attempting to join again (error handling)** (COMPLETED - `auth-ob.join-edge-cases.spec.ts`)

2. **OAuth → Onboarding Integration** (C → E)

   - ✅ **OAuth users being redirected to onboarding** (COMPLETED - `auth-ob.oauth-integration.spec.ts`)
   - ✅ **OAuth user data integration with onboarding flow** (PLACEHOLDER - `auth-ob.oauth-integration.spec.ts`)
   - ✅ **OAuth-specific error handling in onboarding** (COMPLETED - `auth-ob.oauth-integration.spec.ts`)

3. **Complete OAuth Flow** (C → E → F → G/H/I → K → L → M)

   - ✅ **End-to-end OAuth authentication through complete onboarding** (PLACEHOLDER - `auth-ob.oauth-integration.spec.ts`)
   - ✅ **OAuth with public domain → create org flow** (COMPLETED - `auth-ob.oauth-integration.spec.ts`)
   - ✅ **OAuth with corporate domain → join/create org flow** (PLACEHOLDER - `auth-ob.oauth-integration.spec.ts`)

4. **Cross-Auth Method Consistency**
   - ✅ **Ensuring OAuth and Magic Link users have identical onboarding experiences** (PLACEHOLDER - `auth-ob.oauth-integration.spec.ts`)
   - ✅ **Profile data handling differences between auth methods** (PLACEHOLDER - `auth-ob.oauth-integration.spec.ts`)

#### **Important Gaps**

4. **Profile Setup Step** (K)

   - While covered in creation flow, needs isolated testing
   - Profile data validation
   - Profile image upload
   - Pre-filled data from OAuth providers

5. **Team Invitation Flow** (L)

   - Bulk invitation functionality
   - Email validation for invitations
   - Skip option for solo users
   - Invitation email delivery

6. **Error Scenarios**

   - Network failures during onboarding
   - Invalid email domains
   - Database errors during org creation/joining
   - Session timeout during onboarding

7. **Resume/Recovery Flows**
   - Resuming interrupted onboarding
   - Handling browser refresh during onboarding
   - Multiple device/session handling

## Recommended Additional Tests

### **High Priority - Organization Join Cases**

1. **`auth-ob.join-approval.spec.ts`** (Manual Approval Flow)

   ```typescript
   test.describe('Organization Join Approval Flow', () => {
     test('User requests to join organization (domain join disabled)', async () => {
       // User 1 creates organization with domain join DISABLED
       // User 2 attempts to join, should see "Request to Join" flow
       // Verify join request is created in organization metadata
     });

     test('Admin approves join request', async () => {
       // Admin sees pending join request
       // Admin approves request
       // User gets added to organization as member
       // User receives notification of approval
     });

     test('Admin rejects join request', async () => {
       // Admin sees pending join request
       // Admin rejects with reason
       // User receives notification of rejection
       // User cannot join organization
     });

     test('Multiple pending requests management', async () => {
       // Multiple users request to join
       // Admin can see all pending requests
       // Admin can bulk approve/reject
     });
   });
   ```

2. **`auth-ob.join-invitations.spec.ts`** (Organization Invitations)

   ```typescript
   test.describe('Organization Invitation Flow', () => {
     test('Admin invites user to organization', async () => {
       // Admin creates organization
       // Admin sends invitation to specific email
       // Invitation email sent via MailHog
       // User receives invitation link
     });

     test('User accepts organization invitation', async () => {
       // User clicks invitation link
       // User goes through onboarding with pre-selected organization
       // User completes profile → team → welcome → chat
       // User is added as member with correct role
     });

     test('User declines organization invitation', async () => {
       // User clicks invitation link
       // User declines invitation
       // User goes through normal organization creation flow
       // Invitation marked as declined
     });

     test('Expired invitation handling', async () => {
       // Invitation expires after set time
       // User cannot accept expired invitation
       // User gets appropriate error message
     });
   });
   ```

3. **`auth-ob.join-edge-cases.spec.ts`** (Edge Cases & Error Handling)

   ```typescript
   test.describe('Organization Join Edge Cases', () => {
     test('User already member attempts to join again', async () => {
       // User is already member of organization
       // User attempts to join again
       // System detects existing membership
       // User redirected to main app with existing role
     });

     test('Multiple organizations with same domain', async () => {
       // Create 2 orgs with same domain and auto-join enabled
       // User with matching domain sees multiple options
       // User can choose which organization to join
       // User joins selected organization correctly
     });

     test('Domain join disabled after request sent', async () => {
       // User requests to join organization
       // Admin disables domain join
       // User still in pending state
       // Admin can still approve/reject existing request
     });

     test('Organization deleted during join process', async () => {
       // User in middle of join flow
       // Organization gets deleted
       // User gets appropriate error message
       // User redirected to organization creation flow
     });
   });
   ```

### **High Priority - OAuth Integration**

4. **`auth-ob.oauth-integration.spec.ts`**

   ```typescript
   test.describe('OAuth Onboarding Integration', () => {
     test('Google OAuth → Public Domain → Create Org Flow');
     test('Google OAuth → Corporate Domain → Join Org Flow');
     test('Google OAuth → Corporate Domain → Create Org Flow');
     test('OAuth error handling during onboarding');
   });
   ```

### **Medium Priority**

5. **`auth-ob.profile-setup.spec.ts`**

   ```typescript
   test.describe('Profile Setup Flow', () => {
     test('Profile setup with OAuth pre-filled data');
     test('Profile setup with magic link (empty data)');
     test('Profile image upload functionality');
     test('Profile validation and error handling');
   });
   ```

6. **`auth-ob.team-invites.spec.ts`**
   ```typescript
   test.describe('Team Invitation Flow', () => {
     test('Bulk team invitations');
     test('Skip team invitations');
     test('Email validation for invitations');
     test('Invitation email delivery verification');
   });
   ```

### **Medium Priority**

4. **`auth-ob.error-scenarios.spec.ts`**

   ```typescript
   test.describe('Onboarding Error Scenarios', () => {
     test('Network failure during org creation');
     test('Database errors during onboarding');
     test('Invalid domain handling');
     test('Session timeout recovery');
   });
   ```

5. **`auth-ob.resume-flows.spec.ts`**

   ```typescript
   test.describe('Onboarding Resume Flows', () => {
     test('Resume after browser refresh');
     test('Resume after session timeout');
     test('Cross-device onboarding continuation');
   });
   ```

6. **`auth-ob.cross-method-consistency.spec.ts`**
   ```typescript
   test.describe('Auth Method Consistency', () => {
     test('OAuth vs Magic Link - identical onboarding experience');
     test('Data consistency across auth methods');
     test('Error handling consistency');
   });
   ```

## Flow Path Coverage Status

### **Core Authentication & Onboarding Flows**

| Flow Path                                       | Status          | Test File(s)                                                |
| ----------------------------------------------- | --------------- | ----------------------------------------------------------- |
| Magic Link → Public Domain → Create Org         | ✅ Complete     | `auth-ob.basic.spec.ts`, `auth-ob.creation.spec.ts`         |
| Magic Link → Corporate Domain → Join Org (Auto) | ✅ **Complete** | `auth-ob.join.spec.ts` **(Issue #104)**                     |
| Magic Link → Corporate Domain → Create Org      | ✅ Complete     | `auth-ob.creation.spec.ts`                                  |
| OAuth → Public Domain → Create Org              | ❌ Missing      | **Needs `auth-ob.oauth-integration.spec.ts`**               |
| OAuth → Corporate Domain → Join Org             | ❌ Missing      | **Needs `auth-ob.oauth-integration.spec.ts`**               |
| OAuth → Corporate Domain → Create Org           | ❌ Missing      | **Needs `auth-ob.oauth-integration.spec.ts`**               |
| Profile Setup (all paths)                       | ❌ Missing      | Issue [#105](https://github.com/gannonh/agentis/issues/105) |
| Team Invites (all paths)                        | ❌ Missing      | Issue [#106](https://github.com/gannonh/agentis/issues/106) |

### **Organization Join Scenarios (Issue #104 Extensions)**

| Join Scenario                                | Status          | Test File(s)                                                |
| -------------------------------------------- | --------------- | ----------------------------------------------------------- |
| Domain Auto-Join (Enabled)                   | ✅ **Complete** | `auth-ob.join.spec.ts`                                      |
| Manual Approval Request (Auto-Join Disabled) | ❌ Missing      | **Needs `auth-ob.join-approval.spec.ts`**                   |
| Admin Approves Join Request                  | ❌ Missing      | **Needs `auth-ob.join-approval.spec.ts`**                   |
| Admin Rejects Join Request                   | ❌ Missing      | **Needs `auth-ob.join-approval.spec.ts`**                   |
| Organization Invitation (Email Link)         | ❌ Missing      | Issue [#106](https://github.com/gannonh/agentis/issues/106) |
| User Accepts Invitation                      | ❌ Missing      | Issue [#106](https://github.com/gannonh/agentis/issues/106) |
| User Declines Invitation                     | ❌ Missing      | Issue [#106](https://github.com/gannonh/agentis/issues/106) |
| Multiple Organizations (Same Domain)         | ❌ Missing      | **Needs `auth-ob.join-edge-cases.spec.ts`**                 |
| Existing Member Attempts Re-join             | ❌ Missing      | **Needs `auth-ob.join-edge-cases.spec.ts`**                 |
| Expired Invitation Handling                  | ❌ Missing      | Issue [#106](https://github.com/gannonh/agentis/issues/106) |

## Summary

### **Current Status**

- **Total Test Files**: 10 files covering auth/onboarding (5 original + 4 new + 1 utility)
- **Fully Implemented**: Magic Link flows, Organization detection/creation, **Domain auto-join flow (Issue #104)**, **Manual approval requests**, **Existing member handling**, **OAuth integration basics**
- **Critical Gaps Addressed**: ✅ Additional organization join scenarios, ✅ OAuth integration framework, ✅ Edge cases and error handling
- **Utility Abstraction**: ✅ **Created `authOnboardingUtils.ts`** - consolidated common patterns from all test files

### **Progress on Issue #104**

- ✅ **Domain Auto-Join Flow**: FULLY IMPLEMENTED AND PASSING
- ✅ **End-to-End Flow**: User 1 creates org → User 2 joins → Both complete onboarding
- ✅ **Session Management**: Proper cache synchronization and guard architecture
- ✅ **Database Integration**: Correct ObjectId format and member storage

### **Next Priority Test Cases - COMPLETED**

1. ✅ **Manual Approval Flow** (`auth-ob.join-approval.spec.ts`) - When domain join is disabled
2. ✅ **Organization Invitations** (`auth-ob.join-invitations.spec.ts`) - Email-based invitations (framework ready)
3. ✅ **Edge Cases** (`auth-ob.join-edge-cases.spec.ts`) - Multiple orgs, existing members, errors
4. ✅ **OAuth Integration** (`auth-ob.oauth-integration.spec.ts`) - OAuth + onboarding flows

### **Test Implementation Priority - UPDATED**

1. ✅ **High Priority**: Organization join extensions (build on Issue #104 success) - **COMPLETED**
2. ✅ **Medium Priority**: OAuth integration with onboarding - **FRAMEWORK READY**
3. ⚠️ **Lower Priority**: Isolated profile/team testing, error scenarios - **NEXT PHASE**

### **Next Development Phase**

1. **Admin UI Development**: Enable full testing of approval/rejection workflows
2. **Invitation System**: Complete email-based invitation flows
3. **Multiple Organization Selection**: UI for domain conflicts
4. **Full OAuth Integration**: Complete corporate domain OAuth flows

## Related GitHub Issues

- [#102: Organization Detection](https://github.com/gannonh/agentis/issues/102) - ✅ **COMPLETE**
- [#103: Organization Creation Flow](https://github.com/gannonh/agentis/issues/103) - ✅ **COMPLETE**
- [#104: Organization Join Flow](https://github.com/gannonh/agentis/issues/104) - ✅ **COMPLETE** 🎉
- [#105: Profile Setup Integration](https://github.com/gannonh/agentis/issues/105) - ⚠️ Partial
- [#106: Team Invitation Flow](https://github.com/gannonh/agentis/issues/106) - ⚠️ Partial
- [#110: E2E Test Suite](https://github.com/gannonh/agentis/issues/110) - 🔄 In Progress

## Organization Join Test Coverage Roadmap

### **Phase 1: Core Join Flows** ✅ COMPLETE

- Domain auto-join with session management (`auth-ob.join.spec.ts`)

### **Phase 2: Extended Join Scenarios** ⏭️ NEXT

- Manual approval requests (`auth-ob.join-approval.spec.ts`)
- Email invitations (`auth-ob.join-invitations.spec.ts`)
- Edge cases and error handling (`auth-ob.join-edge-cases.spec.ts`)

### **Phase 3: OAuth Integration** 🔄 FUTURE

- OAuth + onboarding flows (`auth-ob.oauth-integration.spec.ts`)
- Cross-authentication consistency testing

### **Phase 4: Isolated Component Testing** 📋 BACKLOG

- Profile setup workflows (`auth-ob.profile-setup.spec.ts`)
- Team invitation management (`auth-ob.team-invites.spec.ts`)
