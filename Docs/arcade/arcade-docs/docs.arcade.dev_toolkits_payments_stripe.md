---
url: "https://docs.arcade.dev/toolkits/payments/stripe"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Payments & FinanceStripe

# Stripe

**Description:** Empower your agents to interact with the Stripe API.

**Author:** Arcade

**Code:** [GitHub](https://github.com/ArcadeAI/arcade-ai/tree/main/toolkits/stripe)

**Auth:** API Key

[![PyPI Version](https://img.shields.io/pypi/v/arcade_stripe)](https://pypi.org/project/arcade_stripe/)[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/arcadeai/arcade-ai/blob/main/LICENSE)[![Python Versions](https://img.shields.io/pypi/pyversions/arcade_stripe)](https://pypi.org/project/arcade_stripe/)[![Wheel Status](https://img.shields.io/pypi/wheel/arcade_stripe)](https://pypi.org/project/arcade_stripe/)[![Downloads](https://img.shields.io/pypi/dm/arcade_stripe)](https://pypi.org/project/arcade_stripe/)

The Arcade Stripe toolkit lets you interact with the Stripe API. Use these tools to build intelligent agents and applications that process payments, create invoices, and more.

## Available Tools [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#available-tools)

| Tool Name | Description |
| --- | --- |
| CreateCustomer | This tool will create a customer in Stripe. |
| ListCustomers | This tool will fetch a list of Customers from Stripe. |
| CreateProduct | This tool will create a product in Stripe. |
| ListProducts | This tool will fetch a list of Products from Stripe. |
| CreatePrice | This tool will create a price in Stripe. If a product has not already been |
| ListPrices | This tool will fetch a list of Prices from Stripe. |
| CreatePaymentLink | This tool will create a payment link in Stripe. |
| ListInvoices | This tool will list invoices in Stripe. |
| CreateInvoice | This tool will create an invoice in Stripe. |
| CreateInvoiceItem | This tool will create an invoice item in Stripe. |
| FinalizeInvoice | This tool will finalize an invoice in Stripe. |
| RetrieveBalance | This tool will retrieve the balance from Stripe. It takes no input. |
| CreateRefund | This tool will refund a payment intent in Stripe. |
| ListPaymentIntents | This tool will list payment intents in Stripe. |
| CreateBillingPortalSession | This tool will create a billing portal session. |

If you need an action that’s not listed here, please [contact us](mailto:contact@arcade.dev) to request a new tool, or [create your own tools](https://docs.arcade.dev/home/build-tools/create-a-toolkit).

## CreateCustomer [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createcustomer)

Create a customer in Stripe.

**Parameters**

- **`name`** _(string, required)_: The name of the customer.
- **`email`** _(string, optional)_: The email address of the customer.

See Example >

## ListCustomers [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#listcustomers)

Fetch a list of customers from Stripe.

**Parameters**

- **`limit`** _(int, optional, defaults to 10)_: A limit on the number of objects to be returned. Limit can range between 1 and 100.
- **`email`** _(string, optional)_: A case-sensitive filter on the list based on the customer’s email field.

See Example >

## CreateProduct [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createproduct)

Create a product in Stripe.

**Parameters**

- **`name`** _(string, required)_: The name of the product.
- **`description`** _(string, optional)_: The description of the product.

See Example >

## ListProducts [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#listproducts)

Fetch a list of products from Stripe.

**Parameters**

- **`limit`** _(int, optional, defaults to 10)_: A limit on the number of products returned. Limit can range between 1 and 100, and defaults to 10.

See Example >

## CreatePrice [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createprice)

Create a price in Stripe.

**Parameters**

- **`product`** _(string, required)_: The ID of the product to create the price for.
- **`unit_amount`** _(int, required)_: The unit amount of the price in cents.
- **`currency`** _(string, required)_: The currency of the price.

See Example >

## ListPrices [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#listprices)

Fetch a list of prices from Stripe.

**Parameters**

- **`product`** _(string, optional)_: The ID of the product to list prices for.
- **`limit`** _(int, optional, defaults to 10)_: A limit on the number of objects to be returned. Limit can range between 1 and 100, and defaults to 10.

See Example >

## CreatePaymentLink [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createpaymentlink)

Create a payment link in Stripe.

**Parameters**

- **`price`** _(string, required)_: The ID of the price to create the payment link for.
- **`quantity`** _(int, required)_: The quantity of the product to include.

See Example >

## ListInvoices [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#listinvoices)

List invoices in Stripe.

**Parameters**

- **`customer`** _(string, optional)_: The ID of the customer to list invoices for.
- **`limit`** _(int, optional, defaults to 10)_: A limit on the number of invoices returned. Limit can range between 1 and 100, and defaults to 10.

See Example >

## CreateInvoice [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createinvoice)

Create an invoice in Stripe.

**Parameters**

- **`customer`** _(string, required)_: The ID of the customer to create the invoice for.
- **`days_until_due`** _(int, optional)_: The number of days until the invoice is due.

See Example >

## CreateInvoiceItem [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createinvoiceitem)

Create an invoice item in Stripe.

**Parameters**

- **`customer`** _(string, required)_: The ID of the customer to create the invoice item for.
- **`price`** _(string, required)_: The ID of the price for the item.
- **`invoice`** _(string, required)_: The ID of the invoice to create the item for.

See Example >

## FinalizeInvoice [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#finalizeinvoice)

Finalize an invoice in Stripe.

**Parameters**

- **`invoice`** _(string, required)_: The ID of the invoice to finalize.

See Example >

## RetrieveBalance [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#retrievebalance)

Retrieve the balance from Stripe. This tool takes no inputs.

See Example >

## CreateRefund [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createrefund)

Refund a payment intent in Stripe.

**Parameters**

- **`payment_intent`** _(string, required)_: The ID of the PaymentIntent to refund.
- **`amount`** _(int, optional)_: The refund amount to refund in cents.

See Example >

## ListPaymentIntents [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#listpaymentintents)

List payment intents in Stripe.

**Parameters**

- **`customer`** _(string, optional)_: The ID of the customer to list payment intents for.
- **`limit`** _(int, optional)_: A limit on the number of payment intents returned. Limit can range between 1 and 100, and defaults to 10.

See Example >

## CreateBillingPortalSession [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#createbillingportalsession)

Create a billing portal session in Stripe.

**Parameters**

- **`customer`** _(string, required)_: The ID of the customer to create the billing portal session for.
- **`return_url`** _(string, optional)_: The default URL to return to afterwards.

See Example >

## Auth [Permalink for this section](https://docs.arcade.dev/toolkits/payments/stripe\#auth)

The Arcade Stripe toolkit uses the [Stripe Agent Toolkit](https://github.com/stripe/agent-toolkit) to interact with the Stripe API.

- **Required Secret:**
  - `STRIPE_SECRET_KEY`: Your Stripe API key.

## Get Building

[Use tools hosted on Arcade Cloud\\
\\
Arcade tools are hosted by our cloud platform and ready to be used in your agents. Learn how.](https://docs.arcade.dev/home/quickstart)

[Self Host Arcade tools\\
\\
Arcade tools can be self-hosted on your own infrastructure. Learn more about self-hosting.\\
\\
```\\
pip install arcade_stripe\\
```](https://docs.arcade.dev/home/install/overview)

[Code Sandbox](https://docs.arcade.dev/toolkits/development/code-sandbox "Code Sandbox") [Google Finance](https://docs.arcade.dev/toolkits/search/google_finance "Google Finance")