[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeConfig

# Interface: ArcadeConfig

Arcade configuration options

## Table of contents

### Properties

- [enabled](ArcadeConfig.md#enabled)
- [api\_key](ArcadeConfig.md#api_key)
- [callback\_url](ArcadeConfig.md#callback_url)
- [hosting](ArcadeConfig.md#hosting)
- [toolkits](ArcadeConfig.md#toolkits)
- [engine](ArcadeConfig.md#engine)
- [worker](ArcadeConfig.md#worker)

## Properties

### enabled

• **enabled**: `boolean`

Whether Arcade integration is enabled

#### Defined in

[types/index.ts:10](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L10)

___

### api\_key

• **api\_key**: `string`

Arcade API key

#### Defined in

[types/index.ts:12](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L12)

___

### callback\_url

• **callback\_url**: `string`

Callback URL for auth flows

#### Defined in

[types/index.ts:14](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L14)

___

### hosting

• **hosting**: ``"cloud"`` \| ``"hybrid"`` \| ``"self_hosted"``

Hosting mode

#### Defined in

[types/index.ts:16](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L16)

___

### toolkits

• **toolkits**: [`ArcadeToolkitConfig`](ArcadeToolkitConfig.md)[]

List of enabled toolkits

#### Defined in

[types/index.ts:18](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L18)

___

### engine

• `Optional` **engine**: `Object`

Self-hosted engine configuration

#### Type declaration

| Name | Type |
| :------ | :------ |
| `host` | `string` |
| `port` | `number` |

#### Defined in

[types/index.ts:21](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L21)

___

### worker

• `Optional` **worker**: `Object`

Worker configuration for hybrid/self-hosted deployment

#### Type declaration

| Name | Type |
| :------ | :------ |
| `enabled` | `boolean` |
| `host` | `string` |
| `port` | `number` |
| `image?` | `string` |

#### Defined in

[types/index.ts:27](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L27)
