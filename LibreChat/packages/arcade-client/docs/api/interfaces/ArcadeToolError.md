[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeToolError

# Interface: ArcadeToolError

Tool error

## Table of contents

### Properties

- [message](ArcadeToolError.md#message)
- [developer\_message](ArcadeToolError.md#developer_message)
- [can\_retry](ArcadeToolError.md#can_retry)
- [retry\_after\_ms](ArcadeToolError.md#retry_after_ms)
- [additional\_prompt\_content](ArcadeToolError.md#additional_prompt_content)

## Properties

### message

• **message**: `string`

Error message

#### Defined in

[types/index.ts:278](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L278)

___

### developer\_message

• `Optional` **developer\_message**: `string`

Developer-facing error message

#### Defined in

[types/index.ts:280](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L280)

___

### can\_retry

• `Optional` **can\_retry**: `boolean`

Whether the tool can be retried

#### Defined in

[types/index.ts:282](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L282)

___

### retry\_after\_ms

• `Optional` **retry\_after\_ms**: `number`

Time to wait before retrying (ms)

#### Defined in

[types/index.ts:284](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L284)

___

### additional\_prompt\_content

• `Optional` **additional\_prompt\_content**: `string`

Additional prompt content

#### Defined in

[types/index.ts:286](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L286)
