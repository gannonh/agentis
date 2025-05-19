[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeExecuteToolResponse

# Interface: ArcadeExecuteToolResponse

Tool execution response

## Table of contents

### Properties

- [id](ArcadeExecuteToolResponse.md#id)
- [success](ArcadeExecuteToolResponse.md#success)
- [execution\_type](ArcadeExecuteToolResponse.md#execution_type)
- [status](ArcadeExecuteToolResponse.md#status)
- [run\_at](ArcadeExecuteToolResponse.md#run_at)
- [finished\_at](ArcadeExecuteToolResponse.md#finished_at)
- [duration](ArcadeExecuteToolResponse.md#duration)
- [output](ArcadeExecuteToolResponse.md#output)

## Properties

### id

• `Optional` **id**: `string`

Execution ID

#### Defined in

[types/index.ts:242](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L242)

___

### success

• **success**: `boolean`

Whether the request was successful

#### Defined in

[types/index.ts:244](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L244)

___

### execution\_type

• `Optional` **execution\_type**: `string`

Execution type

#### Defined in

[types/index.ts:246](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L246)

___

### status

• `Optional` **status**: `string`

Execution status

#### Defined in

[types/index.ts:248](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L248)

___

### run\_at

• `Optional` **run\_at**: `string`

Time the tool was/will be run

#### Defined in

[types/index.ts:250](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L250)

___

### finished\_at

• `Optional` **finished\_at**: `string`

Time the tool execution finished

#### Defined in

[types/index.ts:252](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L252)

___

### duration

• `Optional` **duration**: `number`

Execution duration in seconds

#### Defined in

[types/index.ts:254](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L254)

___

### output

• `Optional` **output**: [`ArcadeToolOutput`](ArcadeToolOutput.md)

Output from tool execution

#### Defined in

[types/index.ts:256](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L256)
