## Summary

Implement the complete invitation acceptance workflow to allow invited users to join organizations via email invitations sent from the team invitation flow (#106).

## Background

Issue #106 implemented team invitation email sending during onboarding. Users can now send invitation emails, but there's no way for recipients to actually accept the invitations and join the organization.

## Requirements

### Core Functionality

- **Invitation Link Generation**: Generate secure, time-limited invitation acceptance links
- **Acceptance Landing Page**: Frontend page where invitees can accept/decline invitations
- **Account Integration**: Handle both existing users and new user registration
- **Organization Membership**: Automatically add accepted users to organization with specified role
- **Invitation Status Tracking**: Update invitation status (pending → accepted/declined/expired)

### User Experience Flow

1. **Email Receipt**: User receives invitation email with acceptance link
2. **Link Click**: Clicking link takes user to acceptance page
3. **Authentication Check**:
   - Existing user → Sign in and accept
   - New user → Sign up flow then accept
4. **Role Assignment**: User added to organization with invited role (member/admin)
5. **Redirect**: Take user to main application or onboarding

### Technical Implementation

- **Backend API Endpoints**:
  - `GET /api/invitations/verify/:token` - Validate invitation token
  - `POST /api/invitations/accept/:token` - Accept invitation
  - `POST /api/invitations/decline/:token` - Decline invitation
- **Frontend Pages**:
  - Invitation acceptance page with token validation
  - Error handling for expired/invalid invitations
  - Integration with existing auth flows
- **Database Updates**:
  - Track invitation status changes
  - Store acceptance timestamps
  - Handle invitation expiration

### Security Considerations

- **Token Security**: Use cryptographically secure invitation tokens
- **Expiration Handling**: Set reasonable expiration times (7-14 days)
- **Rate Limiting**: Prevent invitation token abuse
- **Validation**: Verify invitation is still valid and organization exists

### Testing Requirements

- **Unit Tests**: API endpoints, token generation/validation, business logic
- **Integration Tests**: Full acceptance workflow with Better Auth
- **E2E Tests**: Complete user journey from email click to organization membership
- **Edge Cases**: Expired tokens, invalid invitations, duplicate acceptance attempts

## Acceptance Criteria

- [ ] Users can click invitation email links to access acceptance page
- [ ] Existing users can sign in and accept invitations
- [ ] New users can create accounts and accept invitations in single flow
- [ ] Users are added to organization with correct role after acceptance
- [ ] Invitation status is properly tracked and updated
- [ ] Expired/invalid invitations show appropriate error messages
- [ ] Complete E2E test coverage for acceptance workflow
- [ ] Security best practices implemented for token handling

## Technical Notes

- Integrate with existing Better Auth organization plugin
- Use similar patterns as magic link authentication for token handling
- Consider invitation email template updates to include acceptance links
- Ensure invitation acceptance works with existing onboarding flow
- Follow same TDD methodology as #106

## Related Issues

- Depends on: #106 (Team Invitation Flow)
- Blocks: Future team management features
