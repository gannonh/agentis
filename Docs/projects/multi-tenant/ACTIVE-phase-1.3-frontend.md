# Phase 1.3: Better-auth Frontend Integration [#68](https://github.com/gannonh/agentis/issues/68)

## Overview

Integrate Better-auth with the React frontend, exposing the multi-tenant organization system built in issues #66-67 through a Slack-inspired user experience.

## Current State

### ✅ Already Working (Frontend + Backend)
- Better-auth basic integration with email/password authentication
- Google OAuth sign-in flow  
- User session management via Better-auth (session-based with HTTP-only cookies, not JWT)
- User registration and login flows

### ✅ Backend Complete (From Issue #67)
- Email domain-based organization assignment
- Automatic organization creation for new email domains
- Role assignment (account_owner, member)
- Organization membership management
- Multi-tenant data isolation
- Organization invitation system
- All organization CRUD operations via Better-auth API

### ✅ Phase 1 Complete (Foundation)
- Organization context in frontend UI via OrganizationProvider
- Better-auth organization and admin client plugins integrated
- Comprehensive test coverage (287/287 tests passing)
- Organization context available throughout app

### ❌ Missing Frontend Implementation
- User visibility of organization/role status in UI
- Slack-style onboarding flow showing organization assignment
- Organization management interface for account_owners
- Organization-aware navigation and features

## Scope

### Client Setup
- [x] Install Better-auth React client package
- [x] Add organization and admin client plugins to existing auth client
- [x] Create organization context provider using Better-auth hooks
- [x] Set up organization session management
- [x] Configure organization-aware API integration

### Enhanced Onboarding Experience (Slack-Style)
- [x] Organization detection during signup (show which org user will join/create)
- [ ] Different onboarding flows for account_owners vs members
- [ ] Progressive organization setup for new domains
- [ ] Team invitation flow for account_owners
- [ ] Welcome experience showing organization context

### Organization Management UI
- [x] Organization header showing name, role, member count
- [ ] Organization settings page with member management
- [ ] Member invitation and role management (for account_owners)
- [ ] Organization profile and settings management
- [ ] Team creation and management interface (foundation)

### Admin Interface Integration
- [x] Admin plugin client integration
- [ ] Agentis staff admin dashboard for cross-organization management
- [ ] User management across organizations
- [ ] Organization oversight and analytics
- [ ] Platform administration tools

### Session Management Enhancement
- [x] Organization context in session data
- [ ] Organization-aware protected routes
- [x] Proper session refresh handling with organization data
- [ ] Organization switching preparation (future multi-org)

## Technical Requirements

### Dependencies
Better-auth package already installed, need to add plugins:
```typescript
// Add to existing client config
import { organizationClient, adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  // existing config
  plugins: [
    organizationClient(),
    adminClient()
  ]
})
```

### React Integration
- Organization context provider using Better-auth `useActiveOrganization`
- Integration with existing error handling and loading states
- Organization-aware components and routing

## UI/UX Requirements

### Slack-Inspired Onboarding
- Email entry → Organization detection → Profile setup → Organization/Team setup
- Clear messaging about organization assignment during signup
- Progressive disclosure of organization features
- Celebration of successful organization creation

### Organization Management
- Clean organization header with name, logo, member count
- Intuitive member management with role assignment
- Beautiful invitation flow with email preview
- Organization settings with clear permission boundaries

## Acceptance Criteria

- [x] Better-auth organization client is properly integrated
- [ ] Users see their organization name and role throughout the app
- [ ] Signup flow detects email domains and shows organization assignment
- [ ] Account owners can manage organization members and roles
- [ ] New domain signups create organizations with proper role assignment
- [ ] Existing domain signups join organizations as members
- [ ] Admin plugin provides Agentis staff management interface
- [x] Organization context is available throughout app via React context
- [x] Session management works with organization data across page refreshes
- [ ] Protected routes work with organization-aware permissions
- [x] No authentication errors in browser console
- [x] Smooth integration with existing auth system (no breaking changes)

## Migration Considerations

- Maintain compatibility with existing auth flows during implementation
- Gradual rollout of organization features with feature flags
- Clear error handling for organization-related failures
- Fallback mechanisms for users without organization context
- Seamless integration with existing UI components and styling

## References

- Backend implementation: Issues #66 (Better-auth Setup), #67 (Organization Plugin)
- Documentation: `/docs/projects/multi-tenant/`
- [Better-auth React Client](https://www.better-auth.com/docs/frameworks/react)
- [Better-auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better-auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- Current auth components in `client/src/components/Auth/`

## Dependencies

- ✅ Requires completion of #66 (Better-auth Setup)
- ✅ Requires completion of #67 (Organization Plugin)

## Next Steps

- Content isolation by organization (Phase 2)
- Team features and management (Phase 2)
- Enterprise features and billing integration (Phase 3) 