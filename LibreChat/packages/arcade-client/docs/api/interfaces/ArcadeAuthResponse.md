[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeAuthResponse

# Interface: ArcadeAuthResponse

Arcade authentication response

## Table of contents

### Properties

- [id](ArcadeAuthResponse.md#id)
- [status](ArcadeAuthResponse.md#status)
- [url](ArcadeAuthResponse.md#url)
- [provider\_id](ArcadeAuthResponse.md#provider_id)
- [user\_id](ArcadeAuthResponse.md#user_id)
- [context](ArcadeAuthResponse.md#context)

## Properties

### id

• **id**: `string`

Authorization ID

#### Defined in

[types/index.ts:56](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L56)

___

### status

• **status**: ``"pending"`` \| ``"completed"`` \| ``"failed"``

Authorization status

#### Defined in

[types/index.ts:58](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L58)

___

### url

• `Optional` **url**: `string`

Authorization URL (only for pending status)

#### Defined in

[types/index.ts:60](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L60)

___

### provider\_id

• `Optional` **provider\_id**: `string`

Provider ID

#### Defined in

[types/index.ts:62](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L62)

___

### user\_id

• `Optional` **user\_id**: `string`

User ID

#### Defined in

[types/index.ts:64](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L64)

___

### context

• `Optional` **context**: [`ArcadeAuthContext`](ArcadeAuthContext.md)

Authorization context

#### Defined in

[types/index.ts:66](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L66)
