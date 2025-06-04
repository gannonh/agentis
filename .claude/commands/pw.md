## Browser Automation with Playwright MCP

Test Scenario: $ARGUMENTS

## Getting started with Playwright MCP test generation

- You are a playwright test generator.
- You are given a scenario and you need to generate a playwright test for it.
- DO NOT generate test code based on the scenario alone. 
- DO run steps one by one using the tools provided by the Playwright MCP.
- Only after all steps are completed, emit a Playwright TypeScript test that uses @playwright/test based on message history
- Save generated test file in the e2e specs directory: `./LibreChat/e2e/specs`
- Execute the test file and iterate until the test passes

**Best Practices for Playwright MCP Usage:**

1. **Always Use Accessibility Snapshots Over Screenshots**
   - Use `mcp__playwright__browser_snapshot` to get structured page content
   - Avoid `mcp__playwright__browser_take_screenshot` unless specifically requested
   - Accessibility snapshots provide semantic element references (e.g., `ref=e26`) for reliable interactions

2. **Element Interaction Pattern**
   - First capture snapshot to see page structure
   - Use element descriptions and ref IDs for precise targeting
   - Example: `mcp__playwright__browser_click` with `element="Sign up link"` and `ref="e35"`

3. **Form Testing Workflow**
   - Fill forms systematically: `mcp__playwright__browser_type` with element description and ref
   - Capture snapshots between interactions to verify state changes
   - Test form validation by attempting submission with incomplete data

4. **Navigation and State Management**
   - Use `mcp__playwright__browser_navigate` for direct URLs
   - Use `mcp__playwright__browser_navigate_back`/`forward` for browser navigation
   - Tab management: `browser_tab_new`, `browser_tab_select`, `browser_tab_close`
   - Window resizing: `browser_resize` for responsive testing

5. **Debugging and Monitoring**
   - Use `mcp__playwright__browser_console_messages` to check for errors/logs
   - Network requests available but may be large - use carefully
   - Hover effects: `mcp__playwright__browser_hover` for UI state testing

6. **Key Benefits Over Traditional Automation**
   - No visual processing delays
   - Semantic element targeting (more reliable than CSS selectors)
   - Real-time state capture in structured format
   - Built-in accessibility compliance checking

**Common Use Cases:**
- E2E testing of web applications
- Form validation testing
- Theme/UI state verification
- Multi-tab workflow testing
- Responsive design testing



## CRITICAL: Before Debugging Tests

**ALWAYS read the complete test file first** before attempting any debugging or manual testing:

1. **Read the entire test file** - Understand all tests, their sequence, and what each expects
2. **Identify data dependencies** - Map which tests create data and which tests consume it
3. **Understand the data contract** - What specific data does each test expect to exist?
4. **Check test sequence** - Tests often have dependencies (Test 1 creates data, Tests 2-N use it, Last test cleans up)
5. **Never manually create test data** - The tests themselves should create the data they need

Common test patterns:
- Test 1: Verify clean state (no data)
- Test 2: Create test data (specific entities with specific names/properties)
- Tests 3-N: Use the data created in Test 2
- Last test: Clean up all test data

**Manual testing through the UI is NOT equivalent to what automated tests expect.**

## Things to remember

  - Playwright tests **run** on port 3080 because Playwright uses its own webserver (config in `./LibreChat/e2e/playwright.config.ts`)
  - This also means that e2e tests **will NOT** pick up changes to client app without building first. To ensure changes are picked up, do a full **clean rebuild when testing e2e** after making changes to packages or client: `./scripts/dev.sh --clean`.
  - However, when using `playwright:browser_navigate (MCP)` to access the app to run through user flows, make sure the dev servers are running (`./scripts/dev.sh --all`), and access on **PORT 3090 (not 3080!)**.
  - Here is a typical run command from package.json: `../scripts/dev.sh --stop && cross-env PWDEBUG=0 npx playwright test --config=e2e/playwright.config.ts e2e/specs/agent-cta-display.spec.ts --headed0`
  - Typically in a test suite, we set up the data in the first test and then cleanup in the last test. This allows the data to persist through all tests in the suite:
    ```js
    // Cleanup
    const testUserEmail = process.env.GOOGLE_TEST_ACCOUNT_1_EMAIL || 'agentis.test@gmail.com';
    await cleanupAgents(testUserEmail);
    await cleanupChats(testUserEmail);
    logProgress('✅ Cleaned up test data');
    ```

### Setup & Teardown

- Setup registers a new test user and logs him in: `LibreChat/e2e/specs/auth.setup.ts`
- Teardown: deletes the user

### Auth Accounts

- Create a new user when you need a fresh account, otherwise use an existing agentis test account:
  - Test Account 1 (populated with several custom agents)
    - gannonhall@gmail.com
    - 999999999
  - Test Account 2 (populated with some though fewer content)
    - gannon@astro-labs.app
    - 111111111
  - Test Account 3 (best to use for destructive tests)
    - test@test111.com
    - 111111111
  - Google Auth Accounts (use the follow to authenticate for Google service; these are also .env vars)
    - GOOGLE_TEST_ACCOUNT_1_EMAIL="agentis.test@gmail.com"
    - GOOGLE_TEST_ACCOUNT_1_PASSWORD="KJHkh97HKH87jjfU"
