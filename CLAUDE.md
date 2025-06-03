# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this monorepo.

@README.md
@LibreChat/README.devops.md

## Using Playwright MCP

- Make liberal use of Playwright MCP to understand features from a user perspective and to debug issues
- Create a new user when you need a fresh account

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
