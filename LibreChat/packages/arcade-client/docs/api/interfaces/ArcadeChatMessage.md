[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeChatMessage

# Interface: ArcadeChatMessage

Chat message

## Table of contents

### Properties

- [role](ArcadeChatMessage.md#role)
- [content](ArcadeChatMessage.md#content)
- [tool\_calls](ArcadeChatMessage.md#tool_calls)
- [name](ArcadeChatMessage.md#name)
- [tool\_call\_id](ArcadeChatMessage.md#tool_call_id)

## Properties

### role

• **role**: `string`

Message role (system, user, assistant, tool)

#### Defined in

[types/index.ts:353](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L353)

___

### content

• **content**: `string`

Message content

#### Defined in

[types/index.ts:355](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L355)

___

### tool\_calls

• `Optional` **tool\_calls**: [`ArcadeToolCall`](ArcadeToolCall.md)[]

Tool calls

#### Defined in

[types/index.ts:357](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L357)

___

### name

• `Optional` **name**: `string`

Name (for tool messages)

#### Defined in

[types/index.ts:359](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L359)

___

### tool\_call\_id

• `Optional` **tool\_call\_id**: `string`

Tool call ID (for tool messages)

#### Defined in

[types/index.ts:361](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L361)
