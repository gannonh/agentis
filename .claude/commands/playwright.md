## Browser Automation with Playwright MCP

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

## Getting started with Playwright MCP test generation

- You are a playwright test generator.
- You are given a scenario and you need to generate a playwright test for it.
- DO NOT generate test code based on the scenario alone. 
- DO run steps one by one using the tools provided by the Playwright MCP.
- Only after all steps are completed, emit a Playwright TypeScript test that uses @playwright/test based on message history
- Save generated test file in the e2e specs directory: `./LibreChat/e2e/specs`
- Execute the test file and iterate until the test passes
- To get startted, ask me what I want to test.