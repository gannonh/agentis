# 1.2 Release

Stripe, Captcha, API Keys, Teams, Init CLI, and more.

Mar 1

---

## Better Auth 1.2 – Stripe, Captcha, API Keys, Teams, Init CLI, and more

To upgrade, run:

```bash
npm install better-auth@1.2.0
```

---

### Stripe Plugin (Beta)

Stripe integration for customer management, subscriptions, and webhooks.

```bash
npm install @better-auth/stripe
```

**auth.ts**
```typescript
import { stripe } from "@better-auth/stripe";

export const auth = betterAuth({
  plugins: [
    stripe({
      createCustomerOnSignup: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "pro",
            priceId: "price_1234567890",
          },
        ],
      },
    }),
  ],
});
```

Read the [Stripe Plugin docs](/docs/plugins/stripe) for more information.

### Captcha Plugin

Protect your authentication flows with Google reCAPTCHA and Cloudflare Turnstile. Works for signup, signin, and password resets.

**auth.ts**
```typescript
import { captcha } from "better-auth/plugins";

const auth = betterAuth({
  plugins: [
    captcha({
      provider: "cloudflare-turnstile", // or "google-recaptcha"
      secretKey: process.env.TURNSTILE_SECRET_KEY!,
    }),
  ],
});
```

Read the [Captcha Plugin docs](/docs/plugins/captcha) for more information.

### API Key Plugin

Generate and manage API keys with rate limiting, expiration, and metadata. Supports session creation from API keys.

**auth.ts**
```typescript
import { apiKey } from "better-auth/plugins";

const auth = betterAuth({
  plugins: [apiKey()],
});
```

Read the [API Key Plugin docs](/docs/plugins/api-key) for more information.

### Teams/Sub-Organizations

Organizations can now have teams or sub-organizations under them.

**auth.ts**
```typescript
const auth = betterAuth({
  plugins: [
    organization({
      teams: {
        enabled: true,
      },
    }),
  ],
});
```

Read the [Organization Plugin docs](/docs/plugins/organization#teams) for more information.

### Init CLI

The CLI now includes an `init` command to add Better Auth to your project.

```bash
npx @better-auth/cli init
```

### Username

* Added `displayName` for case-insensitive lookups while preserving original formatting.
* Built-in validation.

If you're using the Username plugin, make sure to add the `displayName` field to your schema.

### Organization

* **Multiple Roles per User** – Assign more than one role to a user.

### Admin Plugin

* Manage roles and permissions within the admin plugin. [Learn more](/docs/plugins/admin)
* `adminUserIds` option to grant specific users admin privileges. [Learn more](/docs/plugins/admin#usage)

---

## 🎭 New Social Providers

* [TikTok](/docs/authentication/tiktok)
* [Roblox](/docs/authentication/roblox)
* [VK](/docs/authentication/vk)

---

## ✨ Core Enhancements

* **Auto Cleanup** for expired verification data
* **Improved Google One Tap** integration with JWT verification and enhanced prompt handling
* **Phone-based Password Reset** functionality
* **Provider Control Options**:
  + Disable signups for specific providers
  + Disable implicit signups for specific providers
  + Control default scopes and allow custom scopes on request
* **Enhanced Database Hooks** with additional context information

---

## 🚀 Performance Boosts

We rewrote **better-call** (the core library behind Better Auth) to fix TypeScript editor lag. Your IDE should now feel much snappier when working with Better Auth.

---

## ⚡ CLI Enhancements

### `init` Command

The CLI now includes an `init` command to speed up setup:

* Scaffold new projects
* Generate schemas
* Run migrations

[Learn more](/docs/concepts/cli)

---

## 🛠 Bug Fixes & Stability Improvements

A lot of fixes and refinements to make everything smoother, faster, and more reliable. Check out the [changelog](https://github.com/better-auth/better-auth/releases/tag/v1.2.0) for more details.

---

```bash
npm install better-auth@1.2.0
```

**Upgrade now and take advantage of these powerful new features!** 🚀
