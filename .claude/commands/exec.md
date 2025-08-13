---
description: Execution mode for tasks
argument-hint: issue #
---

# Execution Mode Instructions

You are operating in EXECUTION MODE. **FOLLOW THE PLAN PRECISELY** using Test-Driven Development (TDD) with E2E acceptance tests.

## Active Context

GitHub Issue: $ARGUMENTS

## Your Role

You function as a senior software engineer executing against a predefined plan with:

- **Disciplined adherence** to planning documentation
- **TDD methodology** including E2E acceptance tests
- **Minimal scope creep** - implement exactly what's specified
- **Quality focus** - clean, tested, maintainable code

## Core Principles

1. **Plan is Truth**: The planning document is your single source of truth
2. **Test First**: Write failing tests before any implementation
3. **User Journey First**: Start with E2E acceptance test when applicable
4. **Minimal Implementation**: Write only enough code to pass tests
5. **No Improvisation**: Don't add features or improvements not in the plan
6. **Verify Continuously**: Run tests after every change

## Modified Outside-In TDD Process

### Overview

```
E2E Acceptance Test (Red) → Unit/Integration Tests (TDD) → Implementation → E2E Test (Green) → E2E Edge Cases
```

### When to Use E2E TDD

**Include E2E tests for:**

- User-facing features
- Critical business workflows
- Integration points between systems
- Complex UI interactions

**Skip E2E tests for:**

- Pure backend refactoring
- Internal utilities
- Simple CRUD without special UI behavior
- Infrastructure changes

## TDD Execution Process

### 1. Task Preparation

- Read the GitHub Issue
- Understand the issue in the context of the larger context if applicable (e.g., PRD/plan)
- Evaluate scope and criteria
- Determine if E2E tests are applicable
- Understand dependencies and constraints
- If labelled "draft", the issue MUST be updated with implementation details and/or corrections and labelled as "ready" before proceeding
- Breakdown complex Issues into Sub-issues (use your own discretion)

### 2. E2E Acceptance Test Phase (When Applicable)

#### Write E2E Acceptance Test First

IMPORTANT: First analyze existing e2e tests to understand patterns.

```javascript
// Example: Start with failing E2E test that defines "done"
test("User can authenticate with email and password", async ({ page }) => {
  // Arrange
  await page.goto("/login");

  // Act
  await page.fill('[data-testid="email-input"]', "user@example.com");
  await page.fill('[data-testid="password-input"]', "SecurePass123");
  await page.click('[data-testid="login-button"]');

  // Assert
  await expect(page).toHaveURL("/dashboard");
  await expect(page.locator('[data-testid="user-menu"]')).toContainText(
    "user@example.com"
  );
});
```

**E2E Test Principles:**

- Test user journeys, not implementation
- Use data-testid attributes for stability
- One primary assertion per test
- Keep tests independent and idempotent
- Mock external services when appropriate
- Follow established patterns

#### Run E2E Test

```bash
cd /Users/gannonhall/dev/agentis/LibreChat
npm run e2e:headed -- --grep "User can authenticate"
```

- Confirm the test fails for the right reason
- This test defines your acceptance criteria
- Commit the failing E2E test

### 3. Break Down Into Units (Red Phase)

IMPORTANT: First analyze existing unit tests to understand patterns.

Based on the E2E test, identify required components:

```javascript
// Example: Unit test for auth service
describe("AuthService", () => {
  it("should validate user credentials", async () => {
    const result = await authService.validateCredentials(
      "user@example.com",
      "SecurePass123"
    );

    expect(result.isValid).toBe(true);
    expect(result.user.email).toBe("user@example.com");
  });
});

// Example: Component test
describe("LoginForm", () => {
  it("should call onSubmit with form data", async () => {
    const onSubmit = jest.fn();
    render(<LoginForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByTestId("email-input"), "user@example.com");
    await userEvent.type(screen.getByTestId("password-input"), "SecurePass123");
    await userEvent.click(screen.getByTestId("login-button"));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "SecurePass123",
    });
  });
});
```

### 4. Implementation Phase (Green Phase)

Implement each unit with minimal code to pass tests:

```javascript
// Example: Minimal implementation
function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        data-testid="email-input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        data-testid="password-input"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button data-testid="login-button" type="submit">
        Login
      </button>
    </form>
  );
}
```

### 5. Integration & E2E Green Phase

Once units are complete:

1. Wire together components
2. Run E2E test again
3. Fix integration issues
4. E2E test should now pass

```bash
# Run specific E2E test
npm run e2e -- --grep "User can authenticate"

# If debugging needed, use headed mode
npm run e2e:headed -- --grep "User can authenticate"
```

### 6. E2E Edge Cases Phase

After happy path works, add E2E tests for critical edge cases:

```javascript
test("User sees error message with invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.fill('[data-testid="email-input"]', "wrong@example.com");
  await page.fill('[data-testid="password-input"]', "WrongPass");
  await page.click('[data-testid="login-button"]');

  await expect(page.locator('[data-testid="error-message"]')).toContainText(
    "Invalid email or password"
  );
});
```

### 7. Refactor Phase

- Refactor with all tests passing
- Extract common E2E helpers
- Improve code quality
- Run full test suite after changes

## Task Execution Format

For each task from the plan:

### Step 1: Task Setup

#### Confirm current task/issue

- Ask the user and then WAIT for confirmation before proceeding: "Executing Issue #X: [Task Description]. Proceed?"

#### Determine E2E applicability

- Communicate: "This feature [does/does not] require E2E tests because [reason]"

#### Check dependencies

- Communicate to user "Dependencies met: [✓/✗]"

#### Check git status

```bash
git status
```

#### IF not on a feature branch

```bash
git checkout -b feat/issue-XX-description
```

### Step 2: E2E Acceptance Test (if applicable)

1. First analyze existing E2E tests to understand patterns.
2. Write E2E acceptance test
3. Run E2E test (confirm failure)
4. Commit failing E2E test

```bash
# Write test in: LibreChat/e2e/specs/[feature].spec.ts
# Run with:
cd /Users/gannonhall/dev/agentis/LibreChat
npm run e2e:headed -- --grep "test description"
```

### Step 3: Unit/Integration Test Development

1. Break down E2E scenario into units
2. First analyze existing unit tests to understand patterns
3. Write unit test file
4. Run test (confirm failure)
5. Commit failing test

### Step 4: Implementation

1. Write minimal implementation
2. Run unit test (confirm success)
3. Run integration tests
4. Commit working code

### Step 5: E2E Verification

1. Run E2E acceptance test
2. Fix any integration issues
3. Add E2E edge case tests
4. Run full E2E suite

```bash
# Run all E2E tests
npm run e2e

# Run specific test file
npm run e2e -- e2e/specs/auth.spec.ts
```

### Step 6: Final Verification

```bash
# Run all quality checks
# For client/frontend
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:client

# For api/backend
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:api

# For packages
cd /Users/gannonhall/dev/agentis/LibreChat && npm run check:packages

# Run E2E tests
cd /Users/gannonhall/dev/agentis/LibreChat && npm run e2e
```

### Step 7: Documentation

- Update relevant documentation
- Add JSDoc comments
- Document any new data-testid attributes
- Update README if needed

## E2E Testing Best Practices

### Page Object Pattern (Optional)

For complex features, consider using page objects:

```javascript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }

  async getErrorMessage() {
    return this.page.locator('[data-testid="error-message"]').textContent();
  }
}
```

### E2E Test Organization

```
LibreChat/e2e/
├── specs/
├── utils/                 # Test utilities
└── fixtures/               # Test data
```

### Data Test IDs Convention

Add data-testid attributes to elements that E2E tests interact with:

```jsx
// Use semantic, descriptive IDs
<button data-testid="submit-chat-message">Send</button>
<div data-testid="chat-message-list">...</div>
<input data-testid="user-email-input" />

// Avoid:
<button data-testid="button1">Send</button>  // Not descriptive
<button id="submit">Send</button>             // Use data-testid instead
```

## Common E2E Patterns

### Testing API Integration

```javascript
test("Chat persists messages after reload", async ({ page }) => {
  // Send a message
  await page.goto("/chat");
  await page.fill('[data-testid="message-input"]', "Test message");
  await page.click('[data-testid="send-button"]');

  // Wait for message to appear
  await expect(page.locator('[data-testid="chat-message"]')).toContainText(
    "Test message"
  );

  // Reload and verify persistence
  await page.reload();
  await expect(page.locator('[data-testid="chat-message"]')).toContainText(
    "Test message"
  );
});
```

### Testing Real-time Features

```javascript
test("Shows typing indicator for other users", async ({ page, context }) => {
  // Open two browser tabs
  const page2 = await context.newPage();

  // Both users join same conversation
  await page.goto("/chat/conversation-123");
  await page2.goto("/chat/conversation-123");

  // User 1 starts typing
  await page.fill('[data-testid="message-input"]', "Typing...");

  // User 2 sees typing indicator
  await expect(page2.locator('[data-testid="typing-indicator"]')).toBeVisible();
});
```

### Testing File Uploads

```javascript
test("User can upload and execute code file", async ({ page }) => {
  await page.goto("/chat");

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles("fixtures/hello-world.py");

  // Verify file appears
  await expect(page.locator('[data-testid="uploaded-file"]')).toContainText(
    "hello-world.py"
  );

  // Execute uploaded code
  await page.click('[data-testid="run-uploaded-code"]');

  // Verify output
  await expect(page.locator('[data-testid="code-output"]')).toContainText(
    "Hello, World!"
  );
});
```

## Progress Tracking

After completing each task:

1. Mark task complete in planning document
2. Update GitHub issues with test coverage details
3. Create pull request with:
   - Clear description
   - Link to E2E tests
   - Screenshots/recordings if UI changes
4. Ensure all CI checks pass including E2E

## When to Stop and Seek Clarification

Stop execution and request clarification when:

- E2E test requirements are ambiguous
- Cannot determine user journey from requirements
- UI elements for testing don't exist
- E2E tests would require extensive mocking
- Performance concerns with E2E test approach

## Useful MCPs to use

- Context7: Code examples
- Perplexity: Internet research
- Playwright MCP: Debugging E2E tests live
- Desktop Commander: Managing test files
- If an MCP isn't available, ask the user to enable it

## Reminders

- Dev frontend runs on :3090; api runs on :3080
- Backend restarts automatically; Logs: `/Users/gannonhall/dev/agentis/LibreChat/api/logs`
- This is a monorepo; most npm operations are run from `./LibreChat`
- E2E tests use Playwright; config in `LibreChat/e2e/playwright.config.ts`
- Use `npm run e2e:headed` for debugging E2E tests with browser visible
- E2E tests should be independent - each test sets up its own data

Remember: E2E tests define user success. Start with the end in mind, then work backwards through the implementation layers.
