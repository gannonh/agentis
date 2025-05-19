---
url: "https://docs.arcade.dev/toolkits/social-communication/twilio/reference"
title: "Arcade Docs"
---

[Integrations](https://docs.arcade.dev/toolkits "Integrations") Social & Communication [Twilio](https://docs.arcade.dev/toolkits/social-communication/twilio/readme "Twilio") Reference

# Twilio Toolkit

|  |  |
| --- | --- |
| Name | twilio |
| Package | [arcade\_twilio](https://pypi.org/project/arcade_twilio/0.1.0/) |
| Repository | [Github](https://github.com/sdserranog/arcade-twilio) |
| Install | `pip install arcade_twilio==0.1.0` |
| Description | A twilio integration to send SMS and WhatsApps. |
| Author | [sdserranog@gmail.com](mailto:sdserranog@gmail.com) |

| Tool Name | Description |
| --- | --- |
| [SendSms](https://docs.arcade.dev/toolkits/social-communication/twilio/reference#sendsms) | Send an SMS/text message to a phone number |
| [SendWhatsapp](https://docs.arcade.dev/toolkits/social-communication/twilio/reference#sendwhatsapp) | Send a WhatsApp message to a phone number |

### SendSms [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/twilio/reference\#sendsms)

Send an SMS/text message to a phone number

#### Parameters [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/twilio/reference\#parameters)

- `phone_number` _(string, required)_ The phone number to send the message to. Use ‘my\_phone\_number’ when a phone number is not specified or when the request implies sending to the user themselves
- `message` _(string, required)_ The text content to be sent via SMS

* * *

### SendWhatsapp [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/twilio/reference\#sendwhatsapp)

Send a WhatsApp message to a phone number

#### Parameters [Permalink for this section](https://docs.arcade.dev/toolkits/social-communication/twilio/reference\#parameters-1)

- `phone_number` _(string, required)_ The phone number to send the message to. Use ‘my\_phone\_number’ when a phone number is not specified or when the request implies sending to the user themselves
- `message` _(string, required)_ The text content to be sent via WhatsApp

[Readme](https://docs.arcade.dev/toolkits/social-communication/twilio/readme "Readme") [Discord](https://docs.arcade.dev/toolkits/social-communication/discord "Discord")