# Slack-Style Organization Assignment Implementation Guide

## Overview
This implementation guide provides a comprehensive approach to organization assignment following Slack's proven patterns, eliminating issues with public domain grouping while maintaining a clean user experience.

## 1. Public Domain Detection & Handling

### Public Domain Blacklist
```javascript
const publicDomains = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'yandex.com',
  'qq.com',
  '163.com',
  'me.com',
  'mac.com',
  'live.com',
  'msn.com',
  'fastmail.com',
  'gmx.com',
  'zoho.com'
];

function isPublicDomain(email) {
  const domain = email.split('@')[1].toLowerCase();
  return publicDomains.includes(domain);
}
```

### Organization Types
- **Business Domains** → Domain-based organizations (e.g., "Astrolabs")
- **Public Domains** → Personal organizations (e.g., "Gannon's Organization")

## 2. Organization Assignment Logic

```javascript
async function assignUserToOrganization(user) {
  const domain = user.email.split('@')[1].toLowerCase();
  
  if (isPublicDomain(domain)) {
    // Create personal organization
    return await createPersonalOrganization(user);
  } else {
    // Create or join domain-based organization
    return await createOrJoinDomainOrganization(user, domain);
  }
}

async function createPersonalOrganization(user) {
  const orgName = `${user.name.split(' ')[0]}'s Organization`;
  
  return await Organization.create({
    name: orgName,
    type: 'personal',
    ownerId: user.id,
    members: [user.id],
    settings: {
      allowInvites: true,
      requireInviteApproval: false
    }
  });
}

async function createOrJoinDomainOrganization(user, domain) {
  // Check if organization exists for this domain
  let org = await Organization.findOne({ domain: domain });
  
  if (!org) {
    // Create new domain organization
    const domainName = domain.split('.')[0];
    const orgName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
    
    org = await Organization.create({
      name: orgName,
      type: 'domain',
      domain: domain,
      members: [user.id],
      settings: {
        allowAutoJoin: true,
        domainRestricted: true
      }
    });
  } else {
    // Add user to existing organization
    org.members.push(user.id);
    await org.save();
  }
  
  return org;
}
```

## 3. UX Flow Updates

### Business Domain Onboarding
```jsx
// Component for business domain users
function BusinessDomainOnboarding({ domain, organization }) {
  return (
    <div className="onboarding-container">
      <h1 className="text-4xl font-bold mb-8">
        Welcome to {organization.name}
      </h1>
      
      <div className="domain-settings">
        <label className="flex items-center space-x-3">
          <input 
            type="checkbox" 
            defaultChecked 
            className="w-5 h-5"
          />
          <span className="text-lg">
            Let anyone with @{domain} join this organization
          </span>
        </label>
      </div>
      
      <button className="continue-btn">
        Continue to {organization.name}
      </button>
    </div>
  );
}
```

### Public Domain Onboarding
```jsx
// Component for public domain users
function PublicDomainOnboarding({ user }) {
  return (
    <div className="onboarding-container">
      <h1 className="text-4xl font-bold mb-8">
        Create an organization for your team
      </h1>
      
      <div className="org-creation">
        <input
          type="text"
          placeholder="Organization name"
          defaultValue={`${user.name.split(' ')[0]}'s Organization`}
          className="w-full text-xl p-4 border-2 rounded-lg"
        />
        
        <p className="text-gray-600 mt-4">
          You can invite teammates after creating your organization
        </p>
      </div>
      
      <button className="continue-btn">
        Create Organization
      </button>
    </div>
  );
}
```

### Invitation System
```javascript
// Generate shareable invite link
function generateInviteLink(organizationId) {
  const inviteCode = generateUniqueCode();
  
  InviteLink.create({
    organizationId,
    code: inviteCode,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  return `${process.env.APP_URL}/invite/${inviteCode}`;
}

// Handle cross-domain invitations
async function acceptInvitation(inviteCode, user) {
  const invite = await InviteLink.findOne({ 
    code: inviteCode,
    expiresAt: { $gt: new Date() }
  });
  
  if (!invite) {
    throw new Error('Invalid or expired invitation');
  }
  
  const organization = await Organization.findById(invite.organizationId);
  
  // Add user regardless of their email domain
  organization.members.push(user.id);
  await organization.save();
  
  return organization;
}
```

## 4. Implementation Steps

### Step 1: Database Schema Updates
```javascript
// Organization schema
const OrganizationSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['personal', 'domain'], required: true },
  domain: { type: String, sparse: true }, // Only for domain orgs
  ownerId: { type: ObjectId, ref: 'User' },
  members: [{ type: ObjectId, ref: 'User' }],
  settings: {
    allowAutoJoin: { type: Boolean, default: false },
    domainRestricted: { type: Boolean, default: false },
    allowInvites: { type: Boolean, default: true },
    requireInviteApproval: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now }
});
```

### Step 2: Auth Flow Updates
```javascript
// OAuth callback handler
async function handleOAuthCallback(profile) {
  const user = await User.findOrCreate({
    email: profile.email,
    name: profile.name,
    provider: profile.provider
  });
  
  // Assign to organization immediately
  const organization = await assignUserToOrganization(user);
  
  // Set organization in session
  req.session.organizationId = organization.id;
  
  return user;
}
```

### Step 3: UI Components
```css
/* Clean Slack-style design */
.onboarding-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 60px 20px;
}

.continue-btn {
  background-color: #4a154b;
  color: white;
  font-size: 18px;
  font-weight: 600;
  padding: 14px 40px;
  border-radius: 8px;
  margin-top: 40px;
  width: 100%;
  transition: background-color 0.2s;
}

.continue-btn:hover {
  background-color: #611f69;
}

.domain-settings {
  background-color: #f8f8f8;
  padding: 24px;
  border-radius: 12px;
  margin: 32px 0;
}
```

### Step 4: Invitation Flow
```jsx
// Invite teammates component
function InviteTeammates({ organization }) {
  const [inviteLink, setInviteLink] = useState('');
  
  const generateLink = async () => {
    const link = await api.generateInviteLink(organization.id);
    setInviteLink(link);
  };
  
  return (
    <div className="invite-container">
      <h2 className="text-2xl font-bold mb-4">
        Invite teammates to {organization.name}
      </h2>
      
      <button onClick={generateLink} className="generate-btn">
        Generate Invite Link
      </button>
      
      {inviteLink && (
        <div className="invite-link-display">
          <input 
            value={inviteLink} 
            readOnly 
            className="link-input"
          />
          <button 
            onClick={() => navigator.clipboard.writeText(inviteLink)}
            className="copy-btn"
          >
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
}
```

## 5. Test Scenarios

### Test Case 1: Business Domain User
```javascript
// Input: gannon@astrolabs.llc
// Expected: Joins "Astrolabs" organization (domain-based)
test('Business domain user joins domain organization', async () => {
  const user = await createUser('gannon@astrolabs.llc');
  const org = await assignUserToOrganization(user);
  
  expect(org.name).toBe('Astrolabs');
  expect(org.type).toBe('domain');
  expect(org.domain).toBe('astrolabs.llc');
});
```

### Test Case 2: Public Domain User
```javascript
// Input: gannon@gmail.com
// Expected: Creates "Gannon's Organization" (personal)
test('Gmail user creates personal organization', async () => {
  const user = await createUser('gannon@gmail.com', 'Gannon Smith');
  const org = await assignUserToOrganization(user);
  
  expect(org.name).toBe("Gannon's Organization");
  expect(org.type).toBe('personal');
  expect(org.domain).toBeUndefined();
});
```

### Test Case 3: Cross-Domain Invitation
```javascript
// Gmail user invites corporate user
test('Cross-domain invitation works', async () => {
  const gmailUser = await createUser('admin@gmail.com');
  const personalOrg = await assignUserToOrganization(gmailUser);
  
  const inviteCode = await generateInviteLink(personalOrg.id);
  
  const corpUser = await createUser('employee@company.com');
  const updatedOrg = await acceptInvitation(inviteCode, corpUser);
  
  expect(updatedOrg.members).toContain(corpUser.id);
});
```

### Test Case 4: OAuth Integration
```javascript
// OAuth users properly assigned
test('OAuth users assigned to correct organization', async () => {
  const oauthProfile = {
    email: 'user@astrolabs.llc',
    name: 'OAuth User',
    provider: 'google'
  };
  
  const user = await handleOAuthCallback(oauthProfile);
  const org = await Organization.findOne({ members: user.id });
  
  expect(org.name).toBe('Astrolabs');
  expect(org.type).toBe('domain');
});
```

## Benefits of This Approach

1. **Eliminates Gmail Grouping**: Each Gmail user gets their own organization
2. **Maintains Corporate Unity**: Business domains automatically group together
3. **Flexible Invitations**: Cross-domain invitations enable collaboration
4. **Clean UX**: Following Slack's proven design patterns
5. **Scalable**: Works for any number of users and domains
6. **Industry Standard**: Matches expectations from other SaaS products

## Migration Strategy

For existing systems with Gmail groupi