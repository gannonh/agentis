# Stripe

The Stripe plugin integrates Stripe's payment and subscription functionality with Better Auth. Since payment and authentication are often tightly coupled, this plugin simplifies the integration of stripe into your application, handling customer creation, subscription management, and webhook processing.

This plugin is currently in beta. We're actively collecting feedback and exploring additional features. If you have feature requests or suggestions, please join our [Discord community](https://discord.gg/better-auth) to discuss them.

## Features

* Create Stripe Customers automatically when users sign up
* Manage subscription plans and pricing
* Process subscription lifecycle events (creation, updates, cancellations)
* Handle Stripe webhooks securely with signature verification
* Expose subscription data to your application
* Support for trial periods and subscription upgrades
* Flexible reference system to associate subscriptions with users or organizations
* Team subscription support with seats management

## Installation

### Install the plugin

First, install the plugin:

```bash
npm install @better-auth/stripe
```

If you're using a separate client and server setup, make sure to install the plugin in both parts of your project.

### Install the Stripe SDK

Next, install the Stripe SDK on your server:

```bash
npm install stripe@^18.0.0
```

### Add the plugin to your auth config

**auth.ts**
```typescript
import { betterAuth } from "better-auth"
import { stripe } from "@better-auth/stripe"
import Stripe from "stripe"

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
})

export const auth = betterAuth({
    // ... your existing config
    plugins: [
        stripe({
            stripeClient,
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
            createCustomerOnSignUp: true,
        })
    ]
})
```

### Add the client plugin

**auth-client.ts**
```typescript
import { createAuthClient } from "better-auth/client"
import { stripeClient } from "@better-auth/stripe/client"

export const client = createAuthClient({
    // ... your existing config
    plugins: [
        stripeClient({
            subscription: true //if you want to enable subscription management
        })
    ]
})
```

### Migrate the database

Run the migration or generate the schema to add the necessary tables to the database.

```bash
npx @better-auth/cli migrate
```

See the [Schema](#schema) section to add the tables manually.

### Set up Stripe webhooks

Create a webhook endpoint in your Stripe dashboard pointing to:

```
https://your-domain.com/api/auth/stripe/webhook
```

`/api/auth` is the default path for the auth server.

Make sure to select at least these events:

* `checkout.session.completed`
* `customer.subscription.updated`
* `customer.subscription.deleted`

Save the webhook signing secret provided by Stripe and add it to your environment variables as `STRIPE_WEBHOOK_SECRET`.

## Usage

### Customer Management

You can use this plugin solely for customer management without enabling subscriptions. This is useful if you just want to link Stripe customers to your users.

By default, when a user signs up, a Stripe customer is automatically created if you set `createCustomerOnSignUp: true`. This customer is linked to the user in your database.
You can customize the customer creation process:

**auth.ts**
```typescript
stripe({
    // ... other options
    createCustomerOnSignUp: true,
    onCustomerCreate: async ({ customer, stripeCustomer, user }, request) => {
        // Do something with the newly created customer
        console.log(`Customer ${customer.id} created for user ${user.id}`);
    },
    getCustomerCreateParams: async ({ user, session }, request) => {
        // Customize the Stripe customer creation parameters
        return {
            metadata: {
                referralSource: user.metadata?.referralSource
            }
        };
    }
})
```
### Subscription Management

#### Defining Plans

You can define your subscription plans either statically or dynamically:

**auth.ts**
```typescript
// Static plans
subscription: {
    enabled: true,
    plans: [
        {
            name: "basic", // the name of the plan, it'll be automatically lower cased when stored in the database
            priceId: "price_1234567890", // the price ID from stripe
            annualDiscountPriceId: "price_1234567890", // (optional) the price ID for annual billing with a discount
            limits: {
                projects: 5,
                storage: 10
            }
        },
        {
            name: "pro",
            priceId: "price_0987654321",
            limits: {
                projects: 20,
                storage: 50
            },
            freeTrial: {
                days: 14,
            }
        }
    ]
}

// Dynamic plans (fetched from database or API)
subscription: {
    enabled: true,
    plans: async () => {
        const plans = await db.query("SELECT * FROM plans");
        return plans.map(plan => ({
            name: plan.name,
            priceId: plan.stripe_price_id,
            limits: JSON.parse(plan.limits)
        }));
    }
}
```

see [plan configuration](#plan-configuration) for more.

#### Creating a Subscription

To create a subscription, use the `subscription.upgrade` method:

**client.ts**
```typescript
await client.subscription.upgrade({
    plan: "pro",
    successUrl: "/dashboard",
    cancelUrl: "/pricing",
    annual: true, // Optional: upgrade to an annual plan
    referenceId: "org_123" // Optional: defaults to the current logged in user ID
    seats: 5 // Optional: for team plans
});
```

This will create a Checkout Session and redirect the user to the Stripe Checkout page.

If the user already has an active subscription, you *must* provide the `subscriptionId` parameter. Otherwise, the user will be subscribed to (and pay for) both plans.

> **Important:** The `successUrl` parameter will be internally modified to handle race conditions between checkout completion and webhook processing. The plugin creates an intermediate redirect that ensures subscription status is properly updated before redirecting to your success page.

```typescript
const { error } = await client.subscription.upgrade({
    plan: "pro",
    successUrl: "/dashboard",
    cancelUrl: "/pricing",
});
if(error) {
    alert(error.message);
}
```

For each reference ID (user or organization), only one active or trialing subscription is supported at a time. The plugin doesn't currently support multiple concurrent active subscriptions for the same reference ID.

#### Switching Plans

To switch a subscription to a different plan, use the `subscription.upgrade` method:

**client.ts**
```typescript
await client.subscription.upgrade({
    plan: "pro",
    successUrl: "/dashboard",
    cancelUrl: "/pricing",
    subscriptionId: "sub_123", // the Stripe subscription ID of the user's current plan
});
```

This ensures that the user only pays for the new plan, and not both.

#### Listing Active Subscriptions

To get the user's active subscriptions:

**client.ts**
```typescript
const { data: subscriptions } = await client.subscription.list();

// get the active subscription
const activeSubscription = subscriptions.find(
    sub => sub.status === "active" || sub.status === "trialing"
);

// Check subscription limits
const projectLimit = subscriptions?.limits?.projects || 0;
```

#### Canceling a Subscription

To cancel a subscription:

**client.ts**
```typescript
const { data } = await client.subscription.cancel({
    returnUrl: "/account",
    referenceId: "org_123" // optional defaults to userId
});
```

This will redirect the user to the Stripe Billing Portal where they can cancel their subscription.

#### Restoring a Canceled Subscription

If a user changes their mind after canceling a subscription (but before the subscription period ends), you can restore the subscription:

**client.ts**
```typescript
const { data } = await client.subscription.restore({
    referenceId: "org_123" // optional, defaults to userId
});
```

This will reactivate a subscription that was previously set to cancel at the end of the billing period (`cancelAtPeriodEnd: true`). The subscription will continue to renew automatically.

> **Note:** This only works for subscriptions that are still active but marked to cancel at the end of the period. It cannot restore subscriptions that have already ended.
### Reference System

By default, subscriptions are associated with the user ID. However, you can use a custom reference ID to associate subscriptions with other entities, such as organizations:

**client.ts**
```typescript
// Create a subscription for an organization
await client.subscription.upgrade({
    plan: "pro",
    referenceId: "org_123456",
    successUrl: "/dashboard",
    cancelUrl: "/pricing",
    seats: 5 // Number of seats for team plans
});

// List subscriptions for an organization
const { data: subscriptions } = await client.subscription.list({
    query: {
        referenceId: "org_123456"
    }
});
```

#### Team Subscriptions with Seats

For team or organization plans, you can specify the number of seats:

```typescript
await client.subscription.upgrade({
    plan: "team",
    referenceId: "org_123456",
    seats: 10, // 10 team members
    successUrl: "/org/billing/success",
    cancelUrl: "/org/billing"
});
```

The `seats` parameter is passed to Stripe as the quantity for the subscription item. You can use this value in your application logic to limit the number of members in a team or organization.

To authorize reference IDs, implement the `authorizeReference` function:

**auth.ts**
```typescript
subscription: {
    // ... other options
    authorizeReference: async ({ user, session, referenceId, action }) => {
        // Check if the user has permission to manage subscriptions for this reference
        if (action === "upgrade-subscription" || action === "cancel-subscription" || action === "restore-subscription") {
            const org = await db.member.findFirst({
                where: {
                    organizationId: referenceId,
                    userId: user.id
                }
            });
            return org?.role === "owner"
        }
        return true;
    }
}
```

### Webhook Handling

The plugin automatically handles common webhook events:

* `checkout.session.completed`: Updates subscription status after checkout
* `customer.subscription.updated`: Updates subscription details when changed
* `customer.subscription.deleted`: Marks subscription as canceled

You can also handle custom events:

**auth.ts**
```typescript
stripe({
    // ... other options
    onEvent: async (event) => {
        // Handle any Stripe event
        switch (event.type) {
            case "invoice.paid":
                // Handle paid invoice
                break;
            case "payment_intent.succeeded":
                // Handle successful payment
                break;
        }
    }
})
```

### Subscription Lifecycle Hooks

You can hook into various subscription lifecycle events:

**auth.ts**
```typescript
subscription: {
    // ... other options
    onSubscriptionComplete: async ({ event, subscription, stripeSubscription, plan }) => {
        // Called when a subscription is successfully created
        await sendWelcomeEmail(subscription.referenceId, plan.name);
    },
    onSubscriptionUpdate: async ({ event, subscription }) => {
        // Called when a subscription is updated
        console.log(`Subscription ${subscription.id} updated`);
    },
    onSubscriptionCancel: async ({ event, subscription, stripeSubscription, cancellationDetails }) => {
        // Called when a subscription is canceled
        await sendCancellationEmail(subscription.referenceId);
    },
    onSubscriptionDeleted: async ({ event, subscription, stripeSubscription }) => {
        // Called when a subscription is deleted
        console.log(`Subscription ${subscription.id} deleted`);
    }
}
```

### Trial Periods

You can configure trial periods for your plans:

**auth.ts**
```typescript
{
    name: "pro",
    priceId: "price_0987654321",
    freeTrial: {
        days: 14,
        onTrialStart: async (subscription) => {
            // Called when a trial starts
            await sendTrialStartEmail(subscription.referenceId);
        },
        onTrialEnd: async ({ subscription, user }, request) => {
            // Called when a trial ends
            await sendTrialEndEmail(user.email);
        },
        onTrialExpired: async (subscription) => {
            // Called when a trial expires without conversion
            await sendTrialExpiredEmail(subscription.referenceId);
        }
    }
}
```
## Schema

The Stripe plugin adds the following tables to your database:

### User

Table Name: `user`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| stripeCustomerId | string | ? | The Stripe customer ID |

### Subscription

Table Name: `subscription`

| Field Name | Type | Key | Description |
| --- | --- | --- | --- |
| id | string | PK | Unique identifier for each subscription |
| plan | string | - | The name of the subscription plan |
| referenceId | string | - | The ID this subscription is associated with (user ID by default) |
| stripeCustomerId | string | ? | The Stripe customer ID |
| stripeSubscriptionId | string | ? | The Stripe subscription ID |
| status | string | - | The status of the subscription (active, canceled, etc.) |
| periodStart | Date | ? | Start date of the current billing period |
| periodEnd | Date | ? | End date of the current billing period |
| cancelAtPeriodEnd | boolean | ? | Whether the subscription will be canceled at the end of the period |
| seats | number | ? | Number of seats for team plans |
| trialStart | Date | ? | Start date of the trial period |
| trialEnd | Date | ? | End date of the trial period |

### Customizing the Schema

To change the schema table names or fields, you can pass a `schema` option to the Stripe plugin:

**auth.ts**
```typescript
stripe({
    // ... other options
    schema: {
        subscription: {
            modelName: "stripeSubscriptions", // map the subscription table to stripeSubscriptions
            fields: {
                plan: "planName" // map the plan field to planName
            }
        }
    }
})
```

## Options

### Main Options

**stripeClient**: `Stripe` - The Stripe client instance. Required.

**stripeWebhookSecret**: `string` - The webhook signing secret from Stripe. Required.

**createCustomerOnSignUp**: `boolean` - Whether to automatically create a Stripe customer when a user signs up. Default: `false`.

**onCustomerCreate**: `(data: { customer: Customer, stripeCustomer: Stripe.Customer, user: User }, request?: Request) => Promise<void>` - A function called after a customer is created.

**getCustomerCreateParams**: `(data: { user: User, session: Session }, request?: Request) => Promise<{}>` - A function to customize the Stripe customer creation parameters.

**onEvent**: `(event: Stripe.Event) => Promise<void>` - A function called for any Stripe webhook event.

### Subscription Options

**enabled**: `boolean` - Whether to enable subscription functionality. Required.

**plans**: `Plan[] | (() => Promise<Plan[]>)` - An array of subscription plans or a function that returns plans. Required if subscriptions are enabled.

**requireEmailVerification**: `boolean` - Whether to require email verification before allowing subscription upgrades. Default: `false`.

**authorizeReference**: `(data: { user: User, session: Session, referenceId: string, action: "upgrade-subscription" | "list-subscription" | "cancel-subscription" | "restore-subscription"}, request?: Request) => Promise<boolean>` - A function to authorize reference IDs.

### Plan Configuration

Each plan can have the following properties:

**name**: `string` - The name of the plan. Required.

**priceId**: `string` - The Stripe price ID. Required unless using `lookupKey`.

**lookupKey**: `string` - The Stripe price lookup key. Alternative to `priceId`.

**annualDiscountPriceId**: `string` - A price ID for annual billing.

**annualDiscountLookupKey**: `string` - The Stripe price lookup key for annual billing. Alternative to `annualDiscountPriceId`.

**limits**: `Record<string, number>` - Limits associated with the plan (e.g., `{ projects: 10, storage: 5 }`).

**group**: `string` - A group name for the plan, useful for categorizing plans.

**freeTrial**: Object containing trial configuration:

* **days**: `number` - Number of trial days.
* **onTrialStart**: `(subscription: Subscription) => Promise<void>` - Called when a trial starts.
* **onTrialEnd**: `(data: { subscription: Subscription, user: User }, request?: Request) => Promise<void>` - Called when a trial ends.
* **onTrialExpired**: `(subscription: Subscription) => Promise<void>` - Called when a trial expires without conversion.
## Advanced Usage

### Using with Organizations

The Stripe plugin works well with the organization plugin. You can associate subscriptions with organizations instead of individual users:

**client.ts**
```typescript
// Get the active organization
const { data: activeOrg } = client.useActiveOrganization();

// Create a subscription for the organization
await client.subscription.upgrade({
    plan: "team",
    referenceId: activeOrg.id,
    seats: 10,
    annual: true, // upgrade to an annual plan (optional)
    successUrl: "/org/billing/success",
    cancelUrl: "/org/billing"
});
```

Make sure to implement the `authorizeReference` function to verify that the user has permission to manage subscriptions for the organization:

**auth.ts**
```typescript
authorizeReference: async ({ user, referenceId, action }) => {
    const member = await db.members.findFirst({
        where: {
            userId: user.id,
            organizationId: referenceId
        }
    });

    return member?.role === "owner" || member?.role === "admin";
}
```

### Custom Checkout Session Parameters

You can customize the Stripe Checkout session with additional parameters:

**auth.ts**
```typescript
getCheckoutSessionParams: async ({ user, session, plan, subscription }, request) => {
    return {
        params: {
            allow_promotion_codes: true,
            tax_id_collection: {
                enabled: true
            },
            billing_address_collection: "required",
            custom_text: {
                submit: {
                    message: "We'll start your subscription right away"
                }
            },
            metadata: {
                planType: "business",
                referralCode: user.metadata?.referralCode
            }
        },
        options: {
            idempotencyKey: `sub_${user.id}_${plan.name}_${Date.now()}`
        }
    };
}
```

### Tax Collection

To enable tax collection:

**auth.ts**
```typescript
subscription: {
    // ... other options
    getCheckoutSessionParams: async ({ user, session, plan, subscription }, request) => {
        return {
            params: {
                tax_id_collection: {
                    enabled: true
                }
            }
        };
    }
}
```

## Troubleshooting

### Webhook Issues

If webhooks aren't being processed correctly:

1. Check that your webhook URL is correctly configured in the Stripe dashboard
2. Verify that the webhook signing secret is correct
3. Ensure you've selected all the necessary events in the Stripe dashboard
4. Check your server logs for any errors during webhook processing

### Subscription Status Issues

If subscription statuses aren't updating correctly:

1. Make sure the webhook events are being received and processed
2. Check that the `stripeCustomerId` and `stripeSubscriptionId` fields are correctly populated
3. Verify that the reference IDs match between your application and Stripe

### Testing Webhooks Locally

For local development, you can use the Stripe CLI to forward webhooks to your local environment:

```bash
stripe listen --forward-to localhost:3000/api/auth/stripe/webhook
```

This will provide you with a webhook signing secret that you can use in your local environment.
