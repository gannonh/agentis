Fix the following issue/bug:

$ARGUMENTS

Use the following TDD process:

1. Write a failing test to verify the issue/bug
2. Implement the fix
3. Verify fix with the passing test

Note: Reproducing the issue first with a test is crucial because the issue may have already been fixed/does not exist.

To run specific tests:

```bash
# backend aqpi
cd /Users/gannonhall/dev/agentis/LibreChat && npm run test:api -- path/to/test.vitest.js

# frontend client
cd /Users/gannonhall/dev/agentis/LibreChat && npm run test:client -- path/to/test.ts
```
