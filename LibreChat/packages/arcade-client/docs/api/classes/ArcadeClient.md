[Arcade Client API Documentation - v0.0.1](../README.md) / [Exports](../modules.md) / ArcadeClient

# Class: ArcadeClient

Main Arcade API client

## Table of contents

### Constructors

- [constructor](ArcadeClient.md#constructor)

### Methods

- [health](ArcadeClient.md#health)
- [getTools](ArcadeClient.md#gettools)
- [getTool](ArcadeClient.md#gettool)
- [getEnabledTools](ArcadeClient.md#getenabledtools)
- [executeTool](ArcadeClient.md#executetool)
- [authorizeToolkit](ArcadeClient.md#authorizetoolkit)
- [getAuthStatus](ArcadeClient.md#getauthstatus)
- [initiateAuth](ArcadeClient.md#initiateauth)
- [chat](ArcadeClient.md#chat)
- [mapToolkitToLibreChatTool](ArcadeClient.md#maptoolkittolibrechattool)

## Constructors

### constructor

• **new ArcadeClient**(`config`, `userId`): [`ArcadeClient`](ArcadeClient.md)

Create a new Arcade client

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`ArcadeConfig`](../interfaces/ArcadeConfig.md) | Arcade configuration |
| `userId` | `string` | User ID for authorization |

#### Returns

[`ArcadeClient`](ArcadeClient.md)

#### Defined in

[api/client.ts:73](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L73)

## Methods

### health

▸ **health**(): `Promise`\<[`ArcadeHealthResponse`](../interfaces/ArcadeHealthResponse.md)\>

Check the health of the Arcade API

#### Returns

`Promise`\<[`ArcadeHealthResponse`](../interfaces/ArcadeHealthResponse.md)\>

Health status response

#### Defined in

[api/client.ts:136](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L136)

___

### getTools

▸ **getTools**(`options?`): `Promise`\<[`ArcadeToolsResponse`](../modules.md#arcadetoolsresponse)\>

Get all available toolkits

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | [`ArcadeFormattedToolOptions`](../interfaces/ArcadeFormattedToolOptions.md) | Pagination and filtering options |

#### Returns

`Promise`\<[`ArcadeToolsResponse`](../modules.md#arcadetoolsresponse)\>

List of available toolkits

#### Defined in

[api/client.ts:152](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L152)

___

### getTool

▸ **getTool**(`toolName`): `Promise`\<[`ArcadeToolResponse`](../interfaces/ArcadeToolResponse.md)\>

Get a specific tool by name

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toolName` | `string` | The fully qualified tool name (toolkit.tool) |

#### Returns

`Promise`\<[`ArcadeToolResponse`](../interfaces/ArcadeToolResponse.md)\>

Tool details

#### Defined in

[api/client.ts:172](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L172)

___

### getEnabledTools

▸ **getEnabledTools**(): `Promise`\<[`ArcadeToolsResponse`](../modules.md#arcadetoolsresponse)\>

Get tools filtered by the enabled toolkits in configuration

#### Returns

`Promise`\<[`ArcadeToolsResponse`](../modules.md#arcadetoolsresponse)\>

Filtered list of tools based on enabled toolkits

#### Defined in

[api/client.ts:184](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L184)

___

### executeTool

▸ **executeTool**(`toolName`, `params`, `options?`): `Promise`\<[`ArcadeExecuteToolResponse`](../interfaces/ArcadeExecuteToolResponse.md)\>

Execute a tool

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toolName` | `string` | Tool name (toolkit.tool format) |
| `params` | `Record`\<`string`, `unknown`\> | Tool input parameters |
| `options?` | `Object` | Additional execution options |
| `options.runAt?` | `string` | - |
| `options.toolVersion?` | `string` | - |

#### Returns

`Promise`\<[`ArcadeExecuteToolResponse`](../interfaces/ArcadeExecuteToolResponse.md)\>

Tool execution result

#### Defined in

[api/client.ts:221](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L221)

___

### authorizeToolkit

▸ **authorizeToolkit**(`toolName`, `toolVersion?`): `Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Start tool authorization process

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toolName` | `string` | Tool name (toolkit.tool or toolkit.* for all tools in a toolkit) |
| `toolVersion?` | `string` | Optional tool version |

#### Returns

`Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Authorization response with URL for user to complete auth

#### Defined in

[api/client.ts:249](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L249)

___

### getAuthStatus

▸ **getAuthStatus**(`authId`): `Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Check authorization status

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `authId` | `string` | Authorization ID from previous authorize call |

#### Returns

`Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Current authorization status

#### Defined in

[api/client.ts:270](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L270)

___

### initiateAuth

▸ **initiateAuth**(`authRequirement`): `Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Initiate direct authorization with authorization requirement

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `authRequirement` | [`ArcadeAuthInitiationRequest`](../interfaces/ArcadeAuthInitiationRequest.md) | Authorization requirement details |

#### Returns

`Promise`\<[`ArcadeAuthResponse`](../interfaces/ArcadeAuthResponse.md)\>

Authorization response

#### Defined in

[api/client.ts:282](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L282)

___

### chat

▸ **chat**(`request`): `Promise`\<[`ArcadeChatResponse`](../interfaces/ArcadeChatResponse.md)\>

Complete chat with tools

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `request` | [`ArcadeChatRequest`](../interfaces/ArcadeChatRequest.md) | Chat request with optional tools |

#### Returns

`Promise`\<[`ArcadeChatResponse`](../interfaces/ArcadeChatResponse.md)\>

Chat completion response

#### Defined in

[api/client.ts:294](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L294)

___

### mapToolkitToLibreChatTool

▸ **mapToolkitToLibreChatTool**(`toolkitId`): `Record`\<`string`, `unknown`\>

Map Arcade toolkit to Agentis/LibreChat tool format

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toolkitId` | `string` | Toolkit ID to map |

#### Returns

`Record`\<`string`, `unknown`\>

Mapped tool definition in LibreChat format

#### Defined in

[api/client.ts:306](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L306)
