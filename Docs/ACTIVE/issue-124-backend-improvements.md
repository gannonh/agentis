# Backend Improvements Needed for Team Invitations

## Current State

The backend invitation API currently only supports:
- `email` (required)
- `role` (optional, defaults to 'member')

## Recommended Improvements

### 1. Add Support for Resend Parameter

**Current**: Duplicate invitations require a separate `/resend` endpoint
**Proposed**: Support `resend: true` parameter in the main invitation endpoint

```javascript
// Proposed API change
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member",
  resend: true  // Gracefully handle duplicates
});
```

### 2. Server-Side Timestamp Generation

**Current**: No timestamp tracking for invitations
**Proposed**: Backend should automatically set `invitedAt` timestamp

Benefits:
- Consistent timezone handling (server timezone)
- Accurate audit logs
- Reliable expiration calculations

### 3. Invitation Source Attribution

**Current**: No tracking of where invitations originate
**Proposed**: Add `source` field to track invitation origin

```javascript
// Proposed sources
source: 'onboarding' | 'dashboard' | 'api' | 'bulk_import'
```

### 4. Enhanced Inviter Information

**Current**: Only `inviterId` is stored, requiring additional lookups
**Proposed**: Store denormalized inviter information for better UX

```javascript
{
  inviterId: "user-123",
  inviterName: "John Doe",      // For email personalization
  inviterEmail: "john@company.com"  // For reply-to headers
}
```

## Implementation Notes

1. Update `InvitationService.createInvitation()` to accept additional fields
2. Modify Better Auth integration to pass through these fields
3. Update invitation email template to use the new inviter information
4. Add database migrations for new fields if using custom storage

## Benefits

- Better user experience with personalized invitation emails
- Improved analytics on invitation sources
- Reduced client-side complexity
- More reliable timezone handling
- Better duplicate invitation handling