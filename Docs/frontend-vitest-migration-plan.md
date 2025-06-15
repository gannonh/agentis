# Frontend Vitest Migration & Better Auth Test Coverage Plan

## Current State Analysis
- **Frontend currently uses Jest** with comprehensive setup in `jest.config.cjs`
- **Backend has successfully migrated to Vitest** with clean ESM configuration
- **Existing test coverage** includes ~30 test files across components, hooks, and utilities
- **Better Auth integration complete** but lacks dedicated test coverage
- **ESM modules** already in use (`"type": "module"` in package.json)

## Phase 1: Vitest Setup & Jest Migration

### 1.1 Install Vitest Dependencies
```bash
cd client
npm install --save-dev vitest @vitest/ui @vitejs/plugin-react jsdom @testing-library/jest-dom
npm install --save-dev @vitest/coverage-v8  # for coverage reports
```

### 1.2 Create Vitest Configuration
**File: `client/vitest.config.ts`**
- Extend existing Vite config with test-specific settings
- Configure jsdom environment for React component testing
- Set up path aliases matching current Jest setup (`~/` -> `src/`)
- Configure coverage reporting with v8 provider
- Setup file transformations for CSS, images, etc.
- Include setup files for testing-library and mocks

### 1.3 Convert Test Setup Files
**Convert `test/setupTests.js` -> `test/setupTests.ts`**
- Update Jest-specific mocks to Vitest equivalents
- Maintain window.matchMedia mock for component compatibility
- Update react-i18next mock for Vitest syntax
- Add canvas mock for Lottie animations

### 1.4 Update Package.json Scripts
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:ci": "vitest --run --coverage"
}
```

### 1.5 Remove Jest Dependencies
- Uninstall Jest-related packages: `jest`, `ts-jest`, `jest-environment-jsdom`, etc.
- Remove `jest.config.cjs`
- Update ESLint config to use `vitest` instead of `jest` plugin

## Phase 2: Better Auth Test Coverage

### 2.1 AuthGuard Component Tests
**File: `src/routes/__tests__/AuthGuard.test.tsx`**

**Test Cases:**
1. **Loading State Display**
   - Shows loading spinner when session query is loading
   - Displays correct loading message

2. **Authenticated User Redirect**
   - Redirects to `/c/new` when `isAuthenticated` is true
   - Uses `replace: true` navigation
   - Calls navigate with correct parameters

3. **Unauthenticated User Redirect**
   - Redirects to `/login` when session query completes with no session
   - Handles case where session data exists but user is null
   - Uses `replace: true` navigation

4. **Session Data Handling**
   - Waits for context update when session exists but `isAuthenticated` is false
   - Doesn't navigate prematurely during auth context updates
   - Handles session query errors gracefully

**Mock Strategy:**
- Mock `useAuthContext` hook
- Mock `useGetSessionQuery` with controllable loading/data states
- Mock `useNavigate` to verify navigation calls
- Test different combinations of auth states

### 2.2 SocialButton Component Tests
**File: `src/components/Auth/__tests__/SocialButton.test.tsx`**

**Test Cases:**
1. **Rendering Behavior**
   - Renders button when `enabled` is true
   - Returns null when `enabled` is false
   - Displays correct icon and label
   - Has proper accessibility attributes

2. **Social Login Flow**
   - Makes POST request to `/api/auth/sign-in/social` on click
   - Sends correct provider in request body
   - Includes proper headers (Content-Type, credentials)
   - Handles successful response with redirect URL

3. **Error Handling**
   - Logs error when fetch fails
   - Handles network errors gracefully
   - Handles invalid JSON responses
   - Doesn't crash on malformed response

4. **Navigation Behavior**
   - Redirects to returned URL when `redirect: true` and `url` provided
   - Calls `window.location.href` for external redirects
   - Prevents default form submission

**Mock Strategy:**
- Mock global `fetch` function
- Mock `window.location.href` assignment
- Create test fixtures for API responses
- Test with different provider values (`google`, `github`, etc.)

### 2.3 AuthContext Hook Tests
**File: `src/hooks/__tests__/AuthContext.test.tsx`**

**Test Cases:**
1. **Initial State Management**
   - Sets correct initial authentication state
   - Handles missing session data
   - Initializes user state properly

2. **Session Query Integration**
   - Triggers session query when not authenticated
   - Updates context when session data received
   - Handles session query errors appropriately
   - Respects `enabled` flag for session queries

3. **Login Flow**
   - Handles successful login with session data
   - Manages 2FA redirect scenarios
   - Updates authentication state correctly
   - Handles login errors with proper error setting

4. **Logout Flow**
   - Clears authentication state on logout
   - Navigates to correct redirect URL
   - Handles logout errors gracefully
   - Clears user and session data

5. **User Context Updates**
   - Updates user, session, and auth states together
   - Handles redirect logic correctly
   - Manages custom logout redirects
   - Maintains backward compatibility with legacy tokens

**Mock Strategy:**
- Mock all data-provider queries and mutations
- Create wrapper component with React Router
- Mock `useNavigate` hook
- Test with React Testing Library and act() for state updates

### 2.4 Route Configuration Tests
**File: `src/routes/__tests__/router.test.tsx`**

**Test Cases:**
1. **Root Path Routing**
   - AuthGuard renders at root path
   - No conflicting route definitions
   - Proper route priority handling

2. **Auth Route Structure**
   - Login routes properly nested
   - Protected routes require authentication
   - Public routes accessible without auth

3. **Error Boundary Integration**
   - Routes have proper error boundaries
   - Error states render correctly

**Mock Strategy:**
- Use `createMemoryRouter` for isolated route testing
- Mock AuthGuard component for focused route testing
- Test navigation between routes

### 2.5 Better Auth Integration Tests
**File: `src/data-provider/__tests__/auth-integration.test.ts`**

**Test Cases:**
1. **Session Management**
   - Session cookies properly included in requests
   - Session data correctly typed and handled
   - Session expiration handling

2. **API Integration**
   - Better Auth endpoints properly called
   - Correct request format for social login
   - Response parsing and error handling

3. **Event System**
   - Session update events properly dispatched
   - Cross-tab session synchronization
   - Event listener cleanup

**Mock Strategy:**
- Mock fetch/axios for API calls
- Mock browser storage APIs
- Create test fixtures for Better Auth responses

## Phase 3: Test Quality Standards

### 3.1 Coverage Requirements
- **Minimum 80% coverage** for new Better Auth components
- **100% coverage** for critical authentication flows
- **Branch coverage** for all conditional logic
- **Function coverage** for all exported functions

### 3.2 Test Quality Standards
- **No mocking shortcuts** - properly mock only external dependencies
- **Real user interactions** - use userEvent for all user interactions
- **Async handling** - proper await/waitFor for async operations
- **Error scenarios** - test both success and failure paths
- **Edge cases** - test boundary conditions and invalid inputs

### 3.3 Performance Testing
- **Render performance** - ensure components render quickly
- **Memory leaks** - verify proper cleanup in useEffect hooks
- **API call efficiency** - prevent unnecessary re-renders/requests

## Phase 4: Migration Execution

### 4.1 Pre-Migration Validation
1. Run existing Jest tests to ensure baseline functionality
2. Document any failing tests for post-migration verification
3. Create backup branch for rollback if needed

### 4.2 Migration Steps
1. Install Vitest dependencies
2. Create Vitest configuration
3. Convert setup files to TypeScript/Vitest syntax
4. Update package.json scripts
5. Run migration tests to verify existing functionality
6. Remove Jest dependencies and config files

### 4.3 Test Development
1. Implement AuthGuard tests (highest priority - prevents flashing)
2. Add SocialButton tests (user-facing component)
3. Create AuthContext tests (core authentication logic)
4. Add integration tests for complete auth flows
5. Verify coverage metrics meet requirements

### 4.4 Validation & Cleanup
1. Run full test suite with coverage reporting
2. Verify all Better Auth flows work correctly
3. Update CI/CD configuration for Vitest
4. Update documentation and README files
5. Remove any Jest-specific references in code comments

## Success Criteria
- ✅ All existing tests pass with Vitest
- ✅ Zero authentication regression bugs
- ✅ 80%+ test coverage for Better Auth components
- ✅ No login screen flashing for authenticated users
- ✅ Google OAuth flow fully tested and working
- ✅ CI/CD pipeline successfully runs Vitest
- ✅ Performance metrics maintained or improved