[Arcade Client API Documentation - v0.0.1](README.md) / Exports

# Arcade Client API Documentation - v0.0.1

## Table of contents

### Classes

- [ArcadeClient](classes/ArcadeClient.md)

### Interfaces

- [ArcadeConfig](interfaces/ArcadeConfig.md)
- [ArcadeToolkitConfig](interfaces/ArcadeToolkitConfig.md)
- [ArcadeAuthResponse](interfaces/ArcadeAuthResponse.md)
- [ArcadeAuthContext](interfaces/ArcadeAuthContext.md)
- [ArcadeAuthRequirement](interfaces/ArcadeAuthRequirement.md)
- [ArcadeOAuth2Requirement](interfaces/ArcadeOAuth2Requirement.md)
- [ArcadeToolAuthRequest](interfaces/ArcadeToolAuthRequest.md)
- [ArcadeAuthInitiationRequest](interfaces/ArcadeAuthInitiationRequest.md)
- [ArcadeValueSchema](interfaces/ArcadeValueSchema.md)
- [ArcadeParameter](interfaces/ArcadeParameter.md)
- [ArcadeInput](interfaces/ArcadeInput.md)
- [ArcadeOutput](interfaces/ArcadeOutput.md)
- [ArcadeRequirements](interfaces/ArcadeRequirements.md)
- [ArcadeSecretRequirement](interfaces/ArcadeSecretRequirement.md)
- [ArcadeToolkitResponse](interfaces/ArcadeToolkitResponse.md)
- [ArcadeToolResponse](interfaces/ArcadeToolResponse.md)
- [ArcadeExecuteToolRequest](interfaces/ArcadeExecuteToolRequest.md)
- [ArcadeExecuteToolResponse](interfaces/ArcadeExecuteToolResponse.md)
- [ArcadeToolOutput](interfaces/ArcadeToolOutput.md)
- [ArcadeToolError](interfaces/ArcadeToolError.md)
- [ArcadeToolLog](interfaces/ArcadeToolLog.md)
- [ArcadePaginationOptions](interfaces/ArcadePaginationOptions.md)
- [ArcadePaginatedResponse](interfaces/ArcadePaginatedResponse.md)
- [ArcadeToolListOptions](interfaces/ArcadeToolListOptions.md)
- [ArcadeFormattedToolOptions](interfaces/ArcadeFormattedToolOptions.md)
- [ArcadeChatMessage](interfaces/ArcadeChatMessage.md)
- [ArcadeToolCall](interfaces/ArcadeToolCall.md)
- [ArcadeToolFunctionCall](interfaces/ArcadeToolFunctionCall.md)
- [ArcadeChatRequest](interfaces/ArcadeChatRequest.md)
- [ArcadeResponseFormat](interfaces/ArcadeResponseFormat.md)
- [ArcadeChoice](interfaces/ArcadeChoice.md)
- [ArcadeUsage](interfaces/ArcadeUsage.md)
- [ArcadeChatResponse](interfaces/ArcadeChatResponse.md)
- [ArcadeHealthResponse](interfaces/ArcadeHealthResponse.md)
- [ArcadeErrorResponse](interfaces/ArcadeErrorResponse.md)

### Type Aliases

- [ArcadeToolsResponse](modules.md#arcadetoolsresponse)

### Functions

- [createArcadeClient](modules.md#createarcadeclient)
- [isAuthCompleted](modules.md#isauthcompleted)
- [isAuthPending](modules.md#isauthpending)
- [isAuthFailed](modules.md#isauthfailed)
- [createCallbackUrl](modules.md#createcallbackurl)
- [findToolkitConfig](modules.md#findtoolkitconfig)
- [groupToolsByToolkit](modules.md#grouptoolsbytoolkit)
- [requiresAuth](modules.md#requiresauth)
- [getFullToolName](modules.md#getfulltoolname)
- [formatError](modules.md#formaterror)
- [createTimeout](modules.md#createtimeout)
- [isPlainObject](modules.md#isplainobject)
- [snakeToCamel](modules.md#snaketocamel)
- [transformKeysToCamelCase](modules.md#transformkeystocamelcase)

## Type Aliases

### ArcadeToolsResponse

Ƭ **ArcadeToolsResponse**: [`ArcadePaginatedResponse`](interfaces/ArcadePaginatedResponse.md)\<[`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md)\>

List tools response

#### Defined in

[types/index.ts:346](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/types/index.ts#L346)

## Functions

### createArcadeClient

▸ **createArcadeClient**(`config`, `userId`): [`ArcadeClient`](classes/ArcadeClient.md)

Create a client with validation

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `config` | [`ArcadeConfig`](interfaces/ArcadeConfig.md) | Arcade configuration |
| `userId` | `string` | User ID for authorization |

#### Returns

[`ArcadeClient`](classes/ArcadeClient.md)

Configured Arcade client

#### Defined in

[api/client.ts:337](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/api/client.ts#L337)

___

### isAuthCompleted

▸ **isAuthCompleted**(`response`): `boolean`

Checks if an auth response indicates a completed status

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `response` | [`ArcadeAuthResponse`](interfaces/ArcadeAuthResponse.md) | Auth response from the API |

#### Returns

`boolean`

True if auth is completed

#### Defined in

[auth/auth.ts:12](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/auth/auth.ts#L12)

___

### isAuthPending

▸ **isAuthPending**(`response`): `boolean`

Checks if an auth response indicates a pending status

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `response` | [`ArcadeAuthResponse`](interfaces/ArcadeAuthResponse.md) | Auth response from the API |

#### Returns

`boolean`

True if auth is pending

#### Defined in

[auth/auth.ts:22](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/auth/auth.ts#L22)

___

### isAuthFailed

▸ **isAuthFailed**(`response`): `boolean`

Checks if an auth response indicates a failed status

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `response` | [`ArcadeAuthResponse`](interfaces/ArcadeAuthResponse.md) | Auth response from the API |

#### Returns

`boolean`

True if auth has failed

#### Defined in

[auth/auth.ts:32](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/auth/auth.ts#L32)

___

### createCallbackUrl

▸ **createCallbackUrl**(`baseUrl`, `authId`, `toolkitId`): `string`

Helper to create a callback URL for authentication

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `baseUrl` | `string` | Base callback URL |
| `authId` | `string` | Authorization ID |
| `toolkitId` | `string` | Toolkit ID |

#### Returns

`string`

Complete callback URL

#### Defined in

[auth/auth.ts:44](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/auth/auth.ts#L44)

___

### findToolkitConfig

▸ **findToolkitConfig**(`toolkitId`, `toolkitConfigs`): `undefined` \| [`ArcadeToolkitConfig`](interfaces/ArcadeToolkitConfig.md)

Maps a toolkit ID to its configuration from the provided list

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `toolkitId` | `string` | Toolkit ID to find |
| `toolkitConfigs` | [`ArcadeToolkitConfig`](interfaces/ArcadeToolkitConfig.md)[] | List of toolkit configurations |

#### Returns

`undefined` \| [`ArcadeToolkitConfig`](interfaces/ArcadeToolkitConfig.md)

Toolkit configuration or undefined if not found

#### Defined in

[tools/index.ts:14](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/tools/index.ts#L14)

___

### groupToolsByToolkit

▸ **groupToolsByToolkit**(`tools`): `Map`\<`string`, [`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md)[]\>

Groups tools by their parent toolkit

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tools` | [`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md)[] | List of tools to group |

#### Returns

`Map`\<`string`, [`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md)[]\>

Map of toolkit ID to list of tools

#### Defined in

[tools/index.ts:27](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/tools/index.ts#L27)

___

### requiresAuth

▸ **requiresAuth**(`tool`): `boolean`

Checks if a tool requires authentication

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tool` | [`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md) | Tool to check |

#### Returns

`boolean`

True if the tool requires authentication

#### Defined in

[tools/index.ts:51](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/tools/index.ts#L51)

___

### getFullToolName

▸ **getFullToolName**(`tool`): `string`

Gets the fully qualified name of a tool (toolkit.tool)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `tool` | [`ArcadeToolResponse`](interfaces/ArcadeToolResponse.md) | Tool to get name for |

#### Returns

`string`

Fully qualified tool name

#### Defined in

[tools/index.ts:61](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/tools/index.ts#L61)

___

### formatError

▸ **formatError**(`error`): `string`

Formats error messages from the Arcade API

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `error` | `unknown` | Error object |

#### Returns

`string`

Formatted error message

#### Defined in

[utils/index.ts:11](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/utils/index.ts#L11)

___

### createTimeout

▸ **createTimeout**(`ms`): `Promise`\<`never`\>

Creates a timeout promise that rejects after specified milliseconds

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ms` | `number` | Timeout in milliseconds |

#### Returns

`Promise`\<`never`\>

Promise that rejects after timeout

#### Defined in

[utils/index.ts:29](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/utils/index.ts#L29)

___

### isPlainObject

▸ **isPlainObject**(`value`): value is Record\<string, unknown\>

Checks if a value is a plain object

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `unknown` | Value to check |

#### Returns

value is Record\<string, unknown\>

True if value is a plain object, false otherwise

#### Defined in

[utils/index.ts:41](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/utils/index.ts#L41)

___

### snakeToCamel

▸ **snakeToCamel**(`str`): `string`

Converts a snake_case string to camelCase

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `str` | `string` | Snake case string |

#### Returns

`string`

Camel case string

#### Defined in

[utils/index.ts:56](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/utils/index.ts#L56)

___

### transformKeysToCamelCase

▸ **transformKeysToCamelCase**\<`T`\>(`obj`): `Record`\<`string`, `unknown`\>

Transforms object keys from snake_case to camelCase recursively

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Record`\<`string`, `unknown`\> |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `obj` | `T` | Object with snake_case keys |

#### Returns

`Record`\<`string`, `unknown`\>

Object with camelCase keys

#### Defined in

[utils/index.ts:66](https://github.com/gannonh/agentis/blob/main/LibreChat/packages/arcade-client/src/utils/index.ts#L66)
