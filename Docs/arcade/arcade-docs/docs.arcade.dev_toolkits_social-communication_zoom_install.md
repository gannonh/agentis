---
url: "https://docs.arcade.dev/toolkits/social-communication/zoom/install"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") [Social & Communication](https://docs.arcade.dev/toolkits/social-communication/twilio "Social & Communication") [Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom "Zoom") Install

# Arcade for Zoom

## Integrate Arcade with your Zoom account [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#integrate-arcade-with-your-zoom-account)

Arcade securely connects your AI agents to APIs, data, code, and other systems via Tools. Our Zoom integration allows Arcade’s tools to connect to your Zoom account, helping you manage meetings and gather information more efficiently.

You can leverage this app in Arcade’s Playground when you log in to the Arcade Dashboard, or in your own applications.

While the Arcade app for Zoom does not directly expose a Large Language Model (LLM) to you, you will likely use Arcade’s tools in conjunction with an LLM. When using LLMs, there’s always potential to generate inaccurate responses, summaries, or other output.

Arcade’s Zoom app brings Arcade’s powerful AI tool-calling capabilities to your meeting management. The Arcade app for Zoom can:

- List your upcoming meetings within the next 24 hours
- Retrieve meeting invitation details for specific meetings
- Find the participants and/or registrants for a specific meeting
- and more!

For more details on what tools are available and what scopes they require, see the [Zoom toolkit documentation](https://docs.arcade.dev/toolkits/social-communication/zoom).

The Arcade Zoom app requires an active Arcade account. If you don’t have one yet, [sign up for free](https://api.arcade.dev/signup?utm_source=docs&utm_medium=page&utm_campaign=zoom-app-install).

## How it works [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#how-it-works)

### Start using Arcade’s Zoom tools [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#start-using-arcades-zoom-tools)

Use Arcade’s [tools for Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom) to:

- List your upcoming meetings
- Get meeting invitation details
- Find meeting participants and registrants
- and more!

Try leveraging the Arcade Zoom tools in the Arcade Playground by [chatting with an LLM](https://api.arcade.dev/dashboard/playground/chat) asking, “What meetings do I have scheduled today?” or [executing Zoom tools directly](https://api.arcade.dev/dashboard/playground/execute?toolId=ListUpcomingMeetings&toolkits=%5B%5D&authProviders=%5B%5D&secrets=%5B%5D&input=%7B%22user_id%22%3A%22me%22%7D) without interacting with an LLM.

When using LLMs with Zoom, responses may sometimes contain inaccuracies. Always review AI-generated content before taking action.

## Support and troubleshooting [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#support-and-troubleshooting)

If you encounter any issues connecting Arcade to your Zoom account:

1. Verify you’ve granted all required permissions during authorization
2. Ensure your Zoom account is active and in good standing
3. Check that you’re using a compatible browser (Chrome, Firefox, Safari, or Edge)
4. Clear your browser cache and cookies, then try again

### Adding the Arcade Zoom app to your Zoom account [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#adding-the-arcade-zoom-app-to-your-zoom-account)

If using the Arcade playground directly did not work, you can try adding the Arcade Zoom app to your Zoom account by clicking the “Connect with Zoom” button below.

[![](https://docs.arcade.dev/images/icons/zoom_fav.svg)Connect with Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom/install#)

You’ll need to have a Zoom account with appropriate permissions to allow Arcade to access your Zoom data.

### Authorize the requested permissions [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#authorize-the-requested-permissions)

When connecting Arcade to your Zoom account, depending on which Arcade tools you’ll be using, you’ll be asked to authorize specific permissions:

- **user:read:user** \- Allows Arcade to access basic profile information
- **user:read:email** \- Enables Arcade to access your email address
- **meeting:read:meetings** \- Enables Arcade to list your upcoming meetings
- **meeting:read:invitation** \- Enables Arcade to read meeting invitation details

These permissions ensure Arcade can perform the necessary functions while protecting your privacy and security.

### Removing the Arcade Zoom app [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#removing-the-arcade-zoom-app)

To remove the Arcade Zoom app from your Zoom account, you can do so by going to the [Zoom App Marketplace](https://marketplace.zoom.us/user/installed) and uninstalling the app.

Arcade only stores authentication tokens, not your Zoom data. These tokens become invalid when you uninstall the app and will eventually expire. To remove tokens immediately, delete the Zoom Auth Provider from the [Arcade Dashboard](https://api.arcade.dev/dashboard/auth/oauth).

## Privacy and security [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#privacy-and-security)

Arcade takes the security of your Zoom data seriously:

- We only request the minimum permissions needed for our tools to function
- Your Zoom credentials are never stored on our servers
- All communication between Arcade and Zoom is encrypted
- You can revoke Arcade’s access to your Zoom account at any time through your [Zoom App Marketplace](https://marketplace.zoom.us/user/installed)

## Next steps [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#next-steps)

The Arcade Zoom app is a sample of what Arcade can do with your Zoom account. For your own applications, you might want to [create your own Zoom app](https://docs.arcade.dev/home/auth-providers/zoom). Creating your own Zoom application will allow you to brand the app, customize the permissions, and more.

## Need help? [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/zoom/install\#need-help)

If you have any questions or need assistance:

- Check our [Zoom toolkit documentation](https://docs.arcade.dev/toolkits/social-communication/zoom)
- [Contact our support team](https://docs.arcade.dev/home/contact-us)

[Zoom](https://docs.arcade.dev/toolkits/social-communication/zoom "Zoom") [Twitch](https://docs.arcade.dev/toolkits/entertainment/twitch "Twitch")