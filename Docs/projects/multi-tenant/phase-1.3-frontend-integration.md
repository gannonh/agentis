# Phase 1.3: Better-Auth Frontend Integration

## Overview

This phase implements the frontend integration for the multi-tenant organization system that was built in the backend during issues #66 (Better-auth Setup) and #67 (Organization Plugin). The goal is to expose the existing backend functionality through a Slack-inspired user experience.

## Current State

### ✅ Already Working (Frontend + Backend)
- Better-auth basic integration with email/password authentication
- Google OAuth sign-in flow
- User session management via Better-auth
- Session-based authentication with secure HTTP-only cookie (not JWT tokens)

### ✅ Backend Complete (From Issue #67)
- Email domain-based organization assignment
- Automatic organization creation for new email domains
- Role assignment (account_owner, member)
- Organization membership management
- Multi-tenant data isolation
- Organization invitation system
- All organization CRUD operations via Better-auth API

### ❌ Missing (This Phase)
- Organization context in frontend UI
- Slack-style onboarding flow
- Organization management interface
- Admin plugin frontend integration
- User visibility of organization/role status
- Organization-aware navigation

## Implementation Plan (TDD Approach - Red, Green, Refactor)

### Phase 1: Foundation (Days 1-2)

#### Task 1.1: Better-Auth Client Enhancement
**TDD Steps:**
1. **Red**: Write tests for auth client with organization plugins
2. **Green**: Add organizationClient() and adminClient() to existing auth client  
3. **Refactor**: Ensure clean integration with existing auth flows

**File**: `LibreChat/client/src/config/betterAuth.ts`

Current client configuration needs enhancement:
```typescript
import { createAuthClient } from 'better-auth/react';
import { organizationClient, adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_HOST || 'http://localhost:3080',
  basePath: '/api/auth',
  plugins: [
    organizationClient(),  // Add organization support
    adminClient()          // Add admin capabilities
  ],
});
```

**New TypeScript Types**:
```typescript
export type User = NonNullable<Session>['user'];
export type Organization = NonNullable<Session>['session']['organization'];
export type UserRole = 'account_owner' | 'member';

export interface OrganizationMember {
  id: string;
  role: UserRole;
  userId: string;
  organizationId: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  metadata?: {
    domain: string;
    autoCreated: boolean;
    createdFromEmail: string;
  };
  createdAt: Date;
}
```

#### Task 1.2: Organization Context Provider
**TDD Steps:**
1. **Red**: Write tests for OrganizationProvider component
2. **Green**: Update existing provider using Better-auth's `useActiveOrganization`
3. **Refactor**: Integrate with existing app structure and error handling

**File**: `LibreChat/client/src/Providers/OrganizationProvider.tsx` (⚠️ Already exists - needs Better-auth integration)

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { authClient } from '~/config/betterAuth';

interface OrganizationContextType {
  organization: OrganizationData | null;
  userRole: UserRole | null;
  members: OrganizationMember[];
  isLoading: boolean;
  error: Error | null;
  // Organization management functions
  inviteMember: (email: string, role: UserRole) => Promise<void>;
  updateMemberRole: (memberId: string, role: UserRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { data: activeOrganization, isLoading: orgLoading } = authClient.useActiveOrganization();
  const { data: session } = authClient.useSession();
  const { data: members, isLoading: membersLoading } = authClient.useListOrganizationMembers();

  // Implementation...
  
  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
};
```

### Phase 2: Slack-Inspired Onboarding Flow (Days 3-7) - PRIORITY

#### Task 2.1: Email Domain Detection
**TDD Steps:**
1. **Red**: Write tests for email domain → organization detection
2. **Green**: Implement domain detection logic during signup
3. **Refactor**: Optimize performance and error handling

**Slack Reference Pattern:**
- Email entry screen with domain detection  
- Show "You'll be joining [Organization Name]" message
- Different paths for new vs existing organizations

#### Task 2.2: Progressive Onboarding Flow
**TDD Steps:**
1. **Red**: Write tests for multi-step onboarding components
2. **Green**: Implement step-by-step flow matching Slack patterns
3. **Refactor**: Smooth transitions and state management

#### 2.3 Onboarding Flow Architecture

**Flow Decision Tree**:
```mermaid
graph TD
    A[Email Entry] --> B[Email Verification]
    B --> C{Check Email Domain}
    C -->|Domain Exists| D[Show "Joining [Org]"]
    C -->|New Domain| E[Show "Creating [Org]"]
    D --> F[Profile Setup - Member]
    E --> G[Profile Setup - Owner]
    F --> H[Join Organization Welcome]
    G --> I[Organization Setup]
    I --> J[Team Creation]
    J --> K[Invite Members]
    H --> L[Team Assignment]
    K --> M[Dashboard]
    L --> M
```

#### 2.4 Onboarding Components (Existing Files to Enhance)

**Base Onboarding Layout**:
```typescript
// LibreChat/client/src/components/Auth/OnboardingLayout.tsx
interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
}
```

**Organization Detection Component**:
```typescript
// LibreChat/client/src/components/Auth/OnboardingFlow/OrganizationDetection.tsx (✅ EXISTS)
interface OrganizationDetectionProps {
  email: string;
  onOrganizationDetected: (org: OrganizationData | null) => void;
}

// Shows:
// "You'll join the existing Acme Corp organization (25 members)"
// OR
// "You'll create a new organization for acme.com"
```

**Organization Setup Flow**:
```typescript
// LibreChat/client/src/components/Auth/OnboardingFlow/OrganizationSetup.tsx (✅ EXISTS)
interface OrganizationSetupData {
  name: string;
  description?: string;
  logo?: string;
  firstTeamName: string;
}

// For account_owners of new organizations
// Slack-style progressive setup
```

#### Task 2.3: Team Invitation Component Enhancement  
**TDD Steps:**
1. **Red**: Write tests for team invitation flow
2. **Green**: Enhance existing TeamInvitation component  
3. **Refactor**: Integration with Better-auth invitation system

**File**: `LibreChat/client/src/components/Auth/OnboardingFlow/TeamInvitation.tsx` (✅ EXISTS)

#### 2.5 Enhanced Registration Component

**File**: `LibreChat/client/src/components/Auth/Registration.tsx`

Enhanced to include organization flow:

```typescript
enum RegistrationStep {
  EMAIL = 'email',
  VERIFICATION = 'verification', 
  ORG_DETECTION = 'org-detection',
  PROFILE = 'profile',
  ORG_SETUP = 'org-setup',      // Only for account_owners
  TEAM_SETUP = 'team-setup',    // Only for account_owners
  INVITE_MEMBERS = 'invite',    // Only for account_owners
  WELCOME = 'welcome'
}

interface RegistrationState {
  step: RegistrationStep;
  email: string;
  organizationData: OrganizationData | null;
  userRole: UserRole;
  profileData: UserProfileData;
  organizationSetup: OrganizationSetupData;
}
```

### Phase 3: Core UI Integration (Days 8-10)

#### Task 3.1: Organization Header Display
**TDD Steps:**
1. **Red**: Write tests for organization header component
2. **Green**: Display organization name, role, member count
3. **Refactor**: Responsive design and accessibility

#### Task 3.2: Navigation Updates  
**TDD Steps:**
1. **Red**: Write tests for organization-aware navigation
2. **Green**: Update existing nav to show organization context
3. **Refactor**: Clean integration with existing components

### Phase 4: Organization Management UI (Days 11-15)

#### Task 4.1: Connect Existing Organization Components  
**TDD Steps:**
1. **Red**: Write integration tests for Better-auth hooks
2. **Green**: Connect existing components to Better-auth organization data
3. **Refactor**: Remove mock data, use real organization data

**Files to Enhance (✅ All exist with working tests):**
- `LibreChat/client/src/components/Organization/InvitationManager.tsx`
- `LibreChat/client/src/components/Organization/MemberManagement.tsx` 
- `LibreChat/client/src/components/Organization/OrganizationSettings.tsx`

#### Task 4.2: Session & Route Protection
**TDD Steps:**
1. **Red**: Write tests for organization-aware routes
2. **Green**: Implement permission-based routing  
3. **Refactor**: Clean middleware and HOC patterns

#### 4.3 Organization Header Component (New)
**File**: `LibreChat/client/src/components/Organization/OrganizationHeader.tsx`

```typescript
interface OrganizationHeaderProps {
  organization: OrganizationData;
  userRole: UserRole;
  memberCount: number;
}

// Displays:
// - Organization name and logo
// - User role badge (Owner, Member)
// - Member count
// - Quick settings access for owners
```

#### 3.2 Organization Settings Page
**File**: `LibreChat/client/src/routes/settings/Organization.tsx`

**Sections**:
1. **Organization Profile**: Name, logo, domain, description
2. **Members Management**: List, invite, role changes, removal
3. **Teams Management**: Create teams, assign members (future)
4. **Settings**: Organization policies, data retention
5. **Billing**: Subscription management (future)

#### 3.3 Member Management Components

**Member List Component**:
```typescript
// LibreChat/client/src/components/Organization/MemberList.tsx
interface MemberListProps {
  members: OrganizationMember[];
  currentUserRole: UserRole;
  onRoleChange: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
}
```

**Invite Member Component**:
```typescript
// LibreChat/client/src/components/Organization/InviteMember.tsx
interface InviteMemberProps {
  onInvite: (email: string, role: UserRole) => Promise<void>;
  isVisible: boolean;
  onClose: () => void;
}
```

### Phase 5: Admin Plugin Integration (Days 16-18)

#### Task 5.1: Admin Interface Integration
**TDD Steps:**
1. **Red**: Write tests for admin plugin integration  
2. **Green**: Implement cross-organization management
3. **Refactor**: Security and performance optimization

#### Task 5.2: End-to-End Testing
**TDD Steps:**
1. **Red**: Write E2E tests for complete auth + org flow
2. **Green**: Fix any integration issues
3. **Refactor**: Performance and UX improvements

#### 5.3 Admin Dashboard Routes
**File**: `LibreChat/client/src/routes/admin/Dashboard.tsx`

**Super Admin Features**:
- Platform-wide organization overview
- User management across all organizations  
- Organization creation/suspension/deletion
- Billing oversight and support tools
- Usage analytics and metrics
- User impersonation for support

#### 4.2 Admin Navigation Guards
```typescript
// LibreChat/client/src/hooks/useAdminAccess.ts
export const useAdminAccess = () => {
  const { data: session } = authClient.useSession();
  
  return {
    isAdmin: session?.user.role?.includes('admin'),
    isSuperAdmin: session?.user.role?.includes('super_admin'),
    canManageUsers: session?.user.role?.includes('admin'),
    canManageOrganizations: session?.user.role?.includes('super_admin')
  };
};
```

### Phase 5: Enhanced Authentication UX

#### 5.1 Login Flow Enhancement
**File**: `LibreChat/client/src/components/Auth/LoginForm.tsx`

**Enhancements**:
- Show organization context: "Sign in to Acme Corp"
- Organization-aware error messages
- Post-login organization confirmation
- Organization selection for multi-org users (future)

#### 5.2 Google OAuth Integration
- Single-click Google sign-in with organization detection
- Post-OAuth organization assignment flow
- Seamless organization creation/joining via OAuth
- Handle OAuth domain mismatches gracefully

## UX Design Patterns (Slack-Inspired)

### Onboarding Principles
1. **Progressive Disclosure**: One clear step at a time
2. **Context Awareness**: Always show what organization user is joining/creating
3. **Role-Based Flows**: Different experiences for owners vs members
4. **Celebration**: Acknowledge successful organization setup
5. **Team Building**: Encourage team creation and member invitation

### Visual Design Elements
- **Progress Indicators**: Clear step progression (1 of 5)
- **Organization Branding**: Show org name/logo throughout flow
- **Role Badges**: Visual indicators for user roles
- **Member Avatars**: Slack-style member grid displays
- **Invitation Cards**: Beautiful invitation preview/sending

### Interaction Patterns
- **Email-First Flow**: Start with email, detect organization
- **Smart Defaults**: Auto-generate org names from domains
- **Bulk Operations**: Multi-member invite and role management
- **Real-Time Updates**: Live member status and activity
- **Contextual Help**: Tooltips and guidance throughout

## Technical Architecture

### State Management
```typescript
// Organization state using Better-auth hooks
const { data: organization } = authClient.useActiveOrganization();
const { data: members } = authClient.useListOrganizationMembers();
const { data: invitations } = authClient.useListInvitations();

// Local state for complex flows
const [onboardingStep, setOnboardingStep] = useState<RegistrationStep>();
const [organizationSetup, setOrganizationSetup] = useState<OrganizationSetupData>();
```

### API Integration Patterns
```typescript
// Organization management
await authClient.organization.create({ name, slug });
await authClient.organization.inviteMember({ email, role });
await authClient.organization.updateMemberRole({ memberId, role });

// Admin operations
await authClient.admin.createUser({ email, role, organizationId });
await authClient.admin.listUsers({ organizationId });
```

### Error Handling
```typescript
interface OrganizationError {
  type: 'PERMISSION_DENIED' | 'ORGANIZATION_NOT_FOUND' | 'MEMBER_LIMIT_EXCEEDED';
  message: string;
  field?: string;
}

// Consistent error boundaries and user feedback
```

## Testing Strategy

### Unit Tests
- Organization context provider functionality
- Onboarding flow state management
- Member management operations
- Admin permission checking

### Integration Tests
- Complete organization signup flow
- Member invitation and acceptance
- Role assignment and changes
- Admin user management

### E2E Tests (Playwright)
- **Scenario 1**: New user creates organization (account_owner flow)
- **Scenario 2**: New user joins existing organization (member flow)  
- **Scenario 3**: Account owner invites and manages members
- **Scenario 4**: Admin manages users and organizations
- **Scenario 5**: Google OAuth with organization detection

## Success Criteria

### User Experience
- ✅ Slack-quality onboarding that feels intuitive and delightful
- ✅ Clear organization context visible throughout application
- ✅ Role-based UI that appropriately shows/hides features
- ✅ Seamless organization creation and member invitation flows

### Technical Integration  
- ✅ Organization client fully integrated with Better-auth backend
- ✅ Admin plugin providing comprehensive user management
- ✅ All organization features from backend accessible in frontend
- ✅ Email domain-based organization assignment working end-to-end

### Multi-Tenant Foundation
- ✅ All content properly scoped to organizations
- ✅ Permission system consistently enforced in UI
- ✅ Scalable foundation for future team and enterprise features
- ✅ Clean separation between organization and platform admin features

## Slack Onboarding Reference Analysis

Based on provided screenshots, the Slack onboarding follows these key patterns:

### UX Flow Pattern
1. **Email Entry**: Clean, focused email input with domain detection
2. **Verification**: Code entry with clear instructions and resend options  
3. **Welcome**: Branded welcome screen showing progression and next steps
4. **Company Setup**: Company/team name with smart suggestions and validation
5. **Profile Setup**: Personal information with optional photo upload
6. **Team Building**: Member invitation with role assignment and bulk invite
7. **Feature Introduction**: Product tour with upgrade options and onboarding completion

### Visual Design Elements  
- **Progress Indicators**: Clear step progression without overwhelming
- **Contextual Messaging**: "You'll be joining..." vs "You'll create..." based on email domain
- **Smart Defaults**: Auto-generate company names from email domains
- **Celebration**: Success states and positive reinforcement throughout
- **Consistent Branding**: Company logo and colors throughout flow

### Interaction Patterns
- **Email-First Flow**: Start with email, detect organization context
- **Progressive Disclosure**: One clear action per screen
- **Contextual Help**: Subtle guidance without cluttering interface
- **Smooth Transitions**: Maintain context and state between steps

## Implementation Timeline

### Week 1: Core Infrastructure
- Better-auth client enhancement
- Organization context provider
- Basic organization UI components

### Week 2: Onboarding Flow
- Slack-style registration flow
- Organization detection and creation
- Profile and organization setup components

### Week 3: Management Interface
- Organization settings page
- Member management functionality  
- Admin dashboard integration

### Week 4: Polish & Testing
- UX refinements and visual polish
- Comprehensive testing suite
- Documentation and deployment

## Immediate Next Steps (TDD Approach)

### Day 1: Better-auth Client Enhancement
1. **Red**: Write test for auth client with organization plugins
   - Test that organizationClient() and adminClient() are properly integrated
   - Test that existing auth flows continue working
   - Test that new organization hooks are available

2. **Green**: Add plugins to existing auth client
   - Locate current auth client configuration
   - Add organizationClient() and adminClient() imports and setup
   - Verify no breaking changes to existing authentication

3. **Refactor**: Clean integration
   - Ensure proper TypeScript types
   - Clean up any duplicate code
   - Document new organization client capabilities

### Day 2: Organization Context Provider
1. **Red**: Write tests for updated OrganizationProvider
   - Test integration with Better-auth hooks
   - Test error handling and loading states
   - Test context value structure matches expectations

2. **Green**: Update existing OrganizationProvider
   - Replace mock implementation with Better-auth hooks
   - Integrate with existing error handling patterns
   - Ensure context is available app-wide

3. **Refactor**: Performance and integration
   - Optimize re-renders and API calls
   - Clean integration with existing providers
   - Ensure proper TypeScript types throughout

### Current Status Check
✅ **103/103 Organization component tests passing**
✅ **Backend organization system complete**  
✅ **Basic auth flows working**

**Ready to Begin**: Foundation implementation using existing successful patterns

## Future Enhancements

### Teams Feature (Phase 2)
- Team creation and management within organizations
- Team-based content sharing and permissions
- Team-specific chat rooms and collaboration

### Enterprise Features (Phase 3)
- Advanced admin controls and policies
- SSO integration and directory sync
- Advanced billing and usage controls
- Custom branding and white-labeling

### Multi-Organization Support (Phase 4)
- Users belonging to multiple organizations
- Organization switching interface
- Cross-organization content sharing