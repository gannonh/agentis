## Description

Build the team invitation step in the onboarding flow, allowing new organization owners to invite team members. This step should be skippable for users who want to explore first.

## Acceptance Criteria

- [ ] Email input for team invitations
- [ ] Bulk invite functionality
- [ ] Skip option for solo users
- [ ] Send invitation emails
- [ ] Track invitation metrics
- [ ] **NEW: Store invitation attribution (invitedBy field)**
- [ ] **NEW: Display inviter information during signup**
- [ ] **NEW: Track invitation chains for analytics**

## Technical Details

**Priority**: Medium  
**Estimated Size**: M  
**Dependencies**: Task #8 (Profile Setup)

## UI Design

### Invitation Form

```
┌─────────────────────────────────────────┐
│  Who else is on the [Org Name] team?   │
│                                         │
│  Add teammates by email:                │
│  ┌───────────────────────────────────┐ │
│  │ colleague@company.com             │ │
│  └───────────────────────────────────┘ │
│  + Add another                          │
│                                         │
│  [Skip for now]     [Send Invitations]  │
└─────────────────────────────────────────┘
```

### Features

1. **Email Input Fields**

   - Dynamic addition/removal of fields
   - Email validation
   - Duplicate detection
   - Max 10 invites in onboarding

2. **Bulk Operations**

   - Paste multiple emails (comma/newline separated)
   - Import from CSV option (future enhancement)

3. **Skip Option**
   - Clear "Skip for now" button
   - No penalty for skipping
   - Can invite later from settings

## Backend Implementation

```javascript
// Send invitations with full attribution
const invitations = await Promise.all(
  emails.map((email) =>
    auth.api.invitation.create({
      organizationId: org.id,
      email: email,
      role: "member",
      invitedBy: user.id, // User ID who sent invitation
      inviterName: user.name, // For display during signup
      inviterEmail: user.email, // For context
      invitedAt: new Date(), // Timestamp
      source: "onboarding", // Track invitation source
    })
  )
);

// Send email notifications
await sendInvitationEmails(invitations);
```

## Invitation Attribution Features

### Database Schema Enhancement

```javascript
// Add to organization membership/invitation table
{
  invitedBy: String,        // User ID of inviter
  inviterName: String,      // Display name for UX
  inviterEmail: String,     // For reference
  invitedAt: Date,          // Invitation timestamp
  joinedAt: Date,           // When they accepted (if they did)
  source: String,           // 'onboarding', 'dashboard', 'api', etc.
}
```

### Signup Experience Enhancement

When invited users sign up, show:

```
┌─────────────────────────────────────────┐
│  Join [Organization Name]               │
│                                         │
│  👋 John Doe (john@company.com)         │
│     invited you to join the team        │
│                                         │
│  [Continue with Google] [Continue with  │
│                         Email]          │
└─────────────────────────────────────────┘
```

## Email Template

- Personalized with inviter's name
- Organization name and description
- Clear CTA to join
- Expiration info (7 days)
- **NEW: "Join [Name]'s team at [Org]" subject line**

## Metrics to Track

- Number of invites sent during onboarding
- Skip rate
- Invitation acceptance rate
- Time to first team member joining
- **NEW: Invitation attribution analytics**
  - Most effective inviters
  - Invitation conversion by source
  - Team growth viral coefficient
  - Time from invite to signup

## Analytics Queries

```javascript
// Find most effective inviters
SELECT invitedBy, COUNT(*) as invites_sent,
       COUNT(joinedAt) as accepted_invites
FROM invitations
WHERE organizationId = ?
GROUP BY invitedBy;

// Track viral growth
SELECT source, COUNT(*) as invitations,
       AVG(DATEDIFF(joinedAt, invitedAt)) as avg_time_to_join
FROM invitations
WHERE joinedAt IS NOT NULL
GROUP BY source;
```

## Error Handling

- Invalid email formats
- Existing members
- Failed email sends
- Rate limiting (max 50 invites/hour)

## Related PRD

[Onboarding Flow Refactor PRD](/docs/ACTIVE/onboarding-flow-refactor-prd.md) - Task #9
