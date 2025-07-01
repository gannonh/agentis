We're going to work on our onboarding flow and functionality. The areas we're going to focus on are:

1. Flow sequencing and logic
2. Org creation / public email domains

## Our current onboarding flow

- `/Users/gannonhall/dev/agentis/docs/design/ob/agentis-ob-gmail-oauth.png`
- As you can see we automatically create an org for the user when they sign up.
- This is convenient for corporate domains, but is highly problematic for personal/public domains.
- We have compiled a list of public email domains that we want to use to prevent org creation for these domains:/Users/gannonhall/dev/agentis/LibreChat/api/services/public-email-domains.txt

## Slack onboarding flow

- We want to use Slack as a guide
- In reviewing the flow, you will see that:
  - Slack does not automatically create an org for users based on their domain
  - This is true for public domains such as gmail oauth: `/Users/gannonhall/dev/agentis/docs/design/ob/slack-ob-gmail-oauth.png`
  - And corporate domains, as seen here: `/Users/gannonhall/dev/agentis/docs/design/ob/slack-ob-oauth.png`
    - In the case of corporate domains, in the org creation screen, there is a checkbox option: `[ ] Let anyone with an @astrolabs.com email join this workspace.`
  - Also in Slack's onboarding, the sequence is:
  - 1. User auth
  - 2. Org creation
  - 3. User creation
  - 4. Team invites

## Project scope

- We want to implement a similar flow to Slack's
- We want to prevent org creation for public domains
- We want to allow org creation for corporate domains, but with a checkbox option to allow anyone with that domain to join the org
- We want to implement slack's sequence flow in our onboarding process
