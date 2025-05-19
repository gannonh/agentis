[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeChatRequest

# Interface: ArcadeChatRequest

Chat request

## Table of contents

### Properties

- [model](ArcadeChatRequest.md#model)
- [messages](ArcadeChatRequest.md#messages)
- [temperature](ArcadeChatRequest.md#temperature)
- [top\_p](ArcadeChatRequest.md#top_p)
- [max\_tokens](ArcadeChatRequest.md#max_tokens)
- [stream](ArcadeChatRequest.md#stream)
- [tools](ArcadeChatRequest.md#tools)
- [tool\_choice](ArcadeChatRequest.md#tool_choice)
- [stop](ArcadeChatRequest.md#stop)
- [presence\_penalty](ArcadeChatRequest.md#presence_penalty)
- [frequency\_penalty](ArcadeChatRequest.md#frequency_penalty)
- [response\_format](ArcadeChatRequest.md#response_format)
- [user](ArcadeChatRequest.md#user)

## Properties

### model

• **model**: `string`

Model name

#### Defined in

[types/index.ts:391](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L391)

___

### messages

• **messages**: [`ArcadeChatMessage`](ArcadeChatMessage.md)[]

Chat messages

#### Defined in

[types/index.ts:393](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L393)

___

### temperature

• `Optional` **temperature**: `number`

Temperature

#### Defined in

[types/index.ts:395](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L395)

___

### top\_p

• `Optional` **top\_p**: `number`

Top P

#### Defined in

[types/index.ts:397](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L397)

___

### max\_tokens

• `Optional` **max\_tokens**: `number`

Maximum tokens to generate

#### Defined in

[types/index.ts:399](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L399)

___

### stream

• `Optional` **stream**: `boolean`

Stream output

#### Defined in

[types/index.ts:401](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L401)

___

### tools

• `Optional` **tools**: `unknown`[]

Tools

#### Defined in

[types/index.ts:403](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L403)

___

### tool\_choice

• `Optional` **tool\_choice**: `unknown`

Tool choice

#### Defined in

[types/index.ts:405](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L405)

___

### stop

• `Optional` **stop**: `string`[]

Stop sequences

#### Defined in

[types/index.ts:407](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L407)

___

### presence\_penalty

• `Optional` **presence\_penalty**: `number`

Presence penalty

#### Defined in

[types/index.ts:409](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L409)

___

### frequency\_penalty

• `Optional` **frequency\_penalty**: `number`

Frequency penalty

#### Defined in

[types/index.ts:411](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L411)

___

### response\_format

• `Optional` **response\_format**: [`ArcadeResponseFormat`](ArcadeResponseFormat.md)

Response format

#### Defined in

[types/index.ts:413](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L413)

___

### user

• `Optional` **user**: `string`

User identifier

#### Defined in

[types/index.ts:415](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L415)
