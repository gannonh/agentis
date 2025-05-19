[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeChoice

# Interface: ArcadeChoice

Chat completion choice

## Table of contents

### Properties

- [message](ArcadeChoice.md#message)
- [finish\_reason](ArcadeChoice.md#finish_reason)
- [index](ArcadeChoice.md#index)
- [logprobs](ArcadeChoice.md#logprobs)
- [tool\_authorizations](ArcadeChoice.md#tool_authorizations)
- [tool\_messages](ArcadeChoice.md#tool_messages)

## Properties

### message

• **message**: [`ArcadeChatMessage`](ArcadeChatMessage.md)

Message

#### Defined in

[types/index.ts:431](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L431)

___

### finish\_reason

• `Optional` **finish\_reason**: `string`

Finish reason

#### Defined in

[types/index.ts:433](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L433)

___

### index

• **index**: `number`

Choice index

#### Defined in

[types/index.ts:435](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L435)

___

### logprobs

• `Optional` **logprobs**: `unknown`

Log probabilities

#### Defined in

[types/index.ts:437](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L437)

___

### tool\_authorizations

• `Optional` **tool\_authorizations**: [`ArcadeAuthResponse`](ArcadeAuthResponse.md)[]

Tool authorizations

#### Defined in

[types/index.ts:439](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L439)

___

### tool\_messages

• `Optional` **tool\_messages**: [`ArcadeChatMessage`](ArcadeChatMessage.md)[]

Tool messages

#### Defined in

[types/index.ts:441](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L441)
