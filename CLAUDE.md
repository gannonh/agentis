# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this monorepo.

@README.md

## Working w/ Packages & Libraries (e.g., Better Auth)

- Always check officialdocs FIRST before implementing anything
- Use standard methods unless there's a specific reason not to
- Avoid custom endpoints/logic when Bthe package/lib provides the functionality
- Ask if unsure rather than implementing custom solutions

## GitHub Markdown Nuances

- Be mindful that GitHub translates all #[number] to Issues; For example, this: `Issue #101` will render as this: `Issue Disable Auto-Organization Creation #101`

## New App Development Considerations

- We are developing a new app, therefore things like user migrations and backwards compatibility are both unnecessary and should be avoided

## Production App Code Quality

- This IS a production app and the future is now. Therefore, avoid placeholder code with comments like "If this were a production app we would" or "in an actual implementation we would"
- Temporary placeholders are acceptable only when explicitly marked with clear TODOs and/or logs
- Ensure user is made aware of any placeholder or mock aspects to prevent misunderstanding about completeness or data authenticity

## Code Review Quality Standards

### Test Coverage Requirements

- **Mandatory Coverage**: All code must include unit, integration, and E2E tests
- **Test Validity**: Every test MUST fail when the tested behavior is broken
  - No always-passing tests allowed
  - Tests must assert actual behavior, not just execute code
  - Include negative test cases and edge conditions

### Issue Reporting Format

For each identified issue, provide:

1. **Clear Problem Statement**: What's wrong and why it matters
2. **Specific Location**: File path and line numbers
3. **AI Assistant Instructions**: Actionable fix guidance

**Example:**

> The `React.lazy()` call for `OrganizationPreviewStep` is incorrectly placed inside the `OrganizationDetectionStep` component's render function within a conditional block. This causes the component to be re-imported and re-initialized on every render, leading to unnecessary re-imports, potential state loss, and performance degradation. `React.lazy()` should be defined at the module level.
>
> `LibreChat/client/src/components/Auth/OrganizationDetectionStep.tsx#L216-L217`

### Review Checklist

- [ ] Tests fail appropriately when code is broken
- [ ] All paths have test coverage
- [ ] Issues include fix instructions
- [ ] Locations are precisely identified

## E2E Testing

- e2e tests run against production frontend: 3080. so you need to build the front end before running e2e tests

## MongoDB Interactions

- When working with MongoDB, use `ObjectId` for ID handling in update operations
- Example of updating a user's role using ObjectId:
  ```javascript
  await database.db
    .collection("user")
    .updateOne(
      { _id: new database.mongoose.Types.ObjectId(testAuth.user.id) },
      { $set: { role: "admin" } }
    );
  ```

- Always run a test after making changes to it