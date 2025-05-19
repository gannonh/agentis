[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeToolResponse

# Interface: ArcadeToolResponse

Tool definition response

## Table of contents

### Properties

- [name](ArcadeToolResponse.md#name)
- [fully\_qualified\_name](ArcadeToolResponse.md#fully_qualified_name)
- [description](ArcadeToolResponse.md#description)
- [input](ArcadeToolResponse.md#input)
- [output](ArcadeToolResponse.md#output)
- [requirements](ArcadeToolResponse.md#requirements)
- [toolkit](ArcadeToolResponse.md#toolkit)

## Properties

### name

• **name**: `string`

Tool name

#### Defined in

[types/index.ts:206](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L206)

___

### fully\_qualified\_name

• `Optional` **fully\_qualified\_name**: `string`

Fully qualified name (toolkit.tool)

#### Defined in

[types/index.ts:208](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L208)

___

### description

• `Optional` **description**: `string`

Tool description

#### Defined in

[types/index.ts:210](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L210)

___

### input

• **input**: [`ArcadeInput`](ArcadeInput.md)

Tool input definition

#### Defined in

[types/index.ts:212](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L212)

___

### output

• `Optional` **output**: [`ArcadeOutput`](ArcadeOutput.md)

Tool output definition

#### Defined in

[types/index.ts:214](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L214)

___

### requirements

• `Optional` **requirements**: [`ArcadeRequirements`](ArcadeRequirements.md)

Tool requirements

#### Defined in

[types/index.ts:216](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L216)

___

### toolkit

• **toolkit**: [`ArcadeToolkitResponse`](ArcadeToolkitResponse.md)

Parent toolkit

#### Defined in

[types/index.ts:218](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L218)
