# Code Review

- Conduct a comprehensive code review of the following: $ARGUMENTS
- Write the results of your review to a file here: `docs/ACTIVE/[PR#]-review.md`

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

#### Example

##### Issue: Incorrect React.lazy() Usage

> The `React.lazy()` call for `OrganizationPreviewStep` is incorrectly placed inside the `OrganizationDetectionStep` component's render function within a conditional block. This causes the component to be re-imported and re-initialized on every render, leading to unnecessary re-imports, potential state loss, and performance degradation. `React.lazy()` should be defined at the module level.
>
> `LibreChat/client/src/components/Auth/OrganizationDetectionStep.tsx#L216-L217`

### Review Checklist

- [ ] Tests fail appropriately when code is broken
- [ ] All paths have test coverage
- [ ] Issues include fix instructions
- [ ] Locations are precisely identified
