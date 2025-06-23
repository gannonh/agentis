# Implement Auth Audit Trail

## Overview

Implement a comprehensive authentication audit trail system to track and monitor all authentication-related events for security and compliance purposes.

## Priority
**High** - Critical for security monitoring and incident investigation

## Estimated Effort
**Medium** (3-4 hours)

## Dependencies
- Task #2 (Auth Event Logging) - ✅ **COMPLETED** 
  - Basic auth event logging already exists in `LibreChat/api/utils/authEvents.js`
  - Logging includes login, logout, failed attempts, and organization assignments
  - IP address and user agent tracking already implemented

## Current State Analysis

### ✅ Already Implemented
- **Auth Event Logging**: `authEvents.js` provides structured logging for:
  - User login attempts with method tracking
  - User logout events
  - Authentication failures with reason codes
  - Organization assignments
  - Session refresh events
- **Rate Limiting**: Comprehensive rate limiting exists for:
  - Login attempts (`loginLimiter.js`)
  - Registration attempts (`registerLimiter.js`) 
  - Password reset attempts (`resetPasswordLimiter.js`)
- **Admin Interface**: Admin dashboard structure exists in `AdminDashboard.tsx`
- **MongoDB Infrastructure**: Proper indexing and performance monitoring

### 🔄 Needs Implementation
- **Persistent Audit Log Collection**: Currently logs to Winston, need dedicated MongoDB collection
- **Enhanced Event Tracking**: Expand beyond basic auth events
- **Rate Limiting Detection**: Integrate with existing limiters to detect and log violations
- **Admin Audit Log Viewer**: UI component for viewing and filtering audit logs

## Acceptance Criteria

### 1. Create Audit Log Collection in MongoDB
- [ ] Create `AuthAuditLog` model with schema:
  ```javascript
  {
    userId: ObjectId,
    action: String, // 'login', 'logout', 'login_failed', 'permission_change', 'rate_limit_hit'
    method: String, // 'credentials', 'oauth', 'magic-link'
    ipAddress: String,
    userAgent: String,
    timestamp: Date,
    metadata: Object, // Additional context (reason, organizationId, etc.)
    sessionId: String,
    success: Boolean,
    riskScore: Number // 0-100 for suspicious activity detection
  }
  ```
- [ ] Add proper indexes for efficient querying:
  - `{ userId: 1, timestamp: -1 }`
  - `{ action: 1, timestamp: -1 }`
  - `{ ipAddress: 1, timestamp: -1 }`
  - `{ success: 1, timestamp: -1 }`

### 2. Track Comprehensive Authentication Events
- [ ] **Login Events**: Success/failure with method, IP, user agent
- [ ] **Logout Events**: Voluntary logout vs session expiration
- [ ] **Failed Attempts**: Invalid credentials, account locked, rate limited
- [ ] **Permission Changes**: Role modifications, organization assignments
- [ ] **Session Events**: Creation, refresh, expiration, revocation
- [ ] **Security Events**: Suspicious login patterns, multiple failed attempts

### 3. Enhance Existing Auth Event System
- [ ] Extend `authEvents.js` to write to both Winston logs AND audit collection
- [ ] Add risk scoring for suspicious activities:
  - Multiple failed logins from same IP
  - Login from new geographic location
  - Unusual login times
  - Rapid successive login attempts
- [ ] Include additional metadata:
  - Geographic location (if available)
  - Device fingerprinting
  - Referrer information

### 4. Integrate with Rate Limiting System
- [ ] Modify existing rate limiters to log violations to audit trail:
  - `loginLimiter.js` - Track failed login rate limit hits
  - `registerLimiter.js` - Track registration abuse attempts
  - `resetPasswordLimiter.js` - Track password reset abuse
- [ ] Add audit logging to `logViolation` function in cache system
- [ ] Create dedicated audit events for rate limiting violations

### 5. Create Admin Interface for Audit Logs
- [ ] Create `AuditLogViewer` component in admin dashboard
- [ ] **Filtering capabilities**:
  - Date range picker
  - User ID/email search
  - Event type filter (login, logout, failed, etc.)
  - IP address filter
  - Success/failure status
  - Risk score threshold
- [ ] **Display features**:
  - Paginated table with sortable columns
  - Event details modal with full metadata
  - Export functionality (CSV/JSON)
  - Real-time updates for new events
- [ ] **Security features**:
  - Admin-only access with proper role checking
  - Audit log access logging (audit the auditors)
  - Data retention controls

### 6. API Endpoints for Audit Log Management
- [ ] `GET /api/admin/audit-logs` - List audit logs with filtering
- [ ] `GET /api/admin/audit-logs/:id` - Get specific audit log details
- [ ] `GET /api/admin/audit-logs/export` - Export audit logs
- [ ] `GET /api/admin/audit-logs/stats` - Audit statistics for dashboard
- [ ] Add proper authentication and authorization middleware

## Technical Implementation Details

### Database Schema
```javascript
// LibreChat/api/models/AuthAuditLog.js
const authAuditLogSchema = new Schema({
  userId: { type: ObjectId, ref: 'User', index: true },
  action: { 
    type: String, 
    required: true,
    enum: ['login', 'logout', 'login_failed', 'register', 'permission_change', 'rate_limit_hit', 'session_expired']
  },
  method: { type: String, enum: ['credentials', 'oauth', 'magic-link', 'session'] },
  ipAddress: { type: String, required: true, index: true },
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
  metadata: Schema.Types.Mixed,
  sessionId: String,
  success: { type: Boolean, required: true, index: true },
  riskScore: { type: Number, min: 0, max: 100, default: 0 },
  geolocation: {
    country: String,
    region: String,
    city: String
  }
}, { timestamps: true });
```

### Integration Points
1. **Enhance `authEvents.js`** to write to audit collection
2. **Modify rate limiters** to include audit logging
3. **Update Better Auth middleware** to capture more detailed events
4. **Extend admin dashboard** with audit log viewer
5. **Add background jobs** for risk score calculation and cleanup

### Performance Considerations
- Use MongoDB TTL indexes for automatic log cleanup (90-day retention)
- Implement efficient pagination for large audit log datasets
- Consider archiving old logs to separate collection for compliance
- Add database indexes for common query patterns

### Security Considerations
- Encrypt sensitive metadata in audit logs
- Implement audit log integrity checks
- Log access to audit logs themselves
- Ensure GDPR compliance for user data in logs

## Testing Requirements
- [ ] Unit tests for audit log model and service
- [ ] Integration tests for auth event capture
- [ ] Admin interface tests for audit log viewer
- [ ] Performance tests for large audit log queries
- [ ] Security tests for unauthorized access attempts

## Success Metrics
- All authentication events are captured in audit logs
- Admin can investigate security incidents using audit trail
- Rate limiting violations are properly tracked
- Audit log queries perform under 500ms for typical filters
- Zero false positives in risk scoring for first week

## Files to Modify/Create
- `LibreChat/api/models/AuthAuditLog.js` (new)
- `LibreChat/api/utils/authEvents.js` (enhance)
- `LibreChat/api/server/middleware/limiters/*.js` (enhance)
- `LibreChat/api/server/routes/admin.js` (enhance)
- `LibreChat/api/server/controllers/admin/AuditLogController.js` (new)
- `LibreChat/client/src/components/Admin/AuditLogViewer.tsx` (new)
- `LibreChat/client/src/components/Admin/AdminDashboard.tsx` (enhance)

## Related Issues
- Depends on existing auth event logging system (completed)
- Integrates with existing rate limiting infrastructure
- Enhances admin dashboard functionality
- Supports security monitoring and compliance requirements

---

**Labels**: `enhancement`, `security`, `auth`, `admin`, `high-priority`
**Assignees**: TBD
**Milestone**: Auth System Refactor - Phase 1 