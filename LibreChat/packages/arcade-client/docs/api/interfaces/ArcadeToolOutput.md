[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeToolOutput

# Interface: ArcadeToolOutput

Tool output

## Table of contents

### Properties

- [value](ArcadeToolOutput.md#value)
- [authorization](ArcadeToolOutput.md#authorization)
- [error](ArcadeToolOutput.md#error)
- [logs](ArcadeToolOutput.md#logs)

## Properties

### value

• `Optional` **value**: `unknown`

Output value

#### Defined in

[types/index.ts:264](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L264)

___

### authorization

• `Optional` **authorization**: [`ArcadeAuthResponse`](ArcadeAuthResponse.md)

Authorization response (if authorization required)

#### Defined in

[types/index.ts:266](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L266)

___

### error

• `Optional` **error**: [`ArcadeToolError`](ArcadeToolError.md)

Error information

#### Defined in

[types/index.ts:268](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L268)

___

### logs

• `Optional` **logs**: [`ArcadeToolLog`](ArcadeToolLog.md)[]

Execution logs

#### Defined in

[types/index.ts:270](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L270)
