[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeChatResponse

# Interface: ArcadeChatResponse

Chat response

## Table of contents

### Properties

- [id](ArcadeChatResponse.md#id)
- [object](ArcadeChatResponse.md#object)
- [created](ArcadeChatResponse.md#created)
- [model](ArcadeChatResponse.md#model)
- [system\_fingerprint](ArcadeChatResponse.md#system_fingerprint)
- [choices](ArcadeChatResponse.md#choices)
- [usage](ArcadeChatResponse.md#usage)

## Properties

### id

• **id**: `string`

Response ID

#### Defined in

[types/index.ts:461](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L461)

___

### object

• **object**: `string`

Object type

#### Defined in

[types/index.ts:463](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L463)

___

### created

• **created**: `number`

Creation timestamp

#### Defined in

[types/index.ts:465](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L465)

___

### model

• **model**: `string`

Model name

#### Defined in

[types/index.ts:467](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L467)

___

### system\_fingerprint

• `Optional` **system\_fingerprint**: `string`

System fingerprint

#### Defined in

[types/index.ts:469](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L469)

___

### choices

• **choices**: [`ArcadeChoice`](ArcadeChoice.md)[]

Choices

#### Defined in

[types/index.ts:471](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L471)

___

### usage

• **usage**: [`ArcadeUsage`](ArcadeUsage.md)

Token usage

#### Defined in

[types/index.ts:473](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L473)
