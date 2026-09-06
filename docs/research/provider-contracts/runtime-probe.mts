import assert from "node:assert/strict";
import { Effect, Layer, Schema } from "effect";
import {
	FetchHttpClient,
	HttpApi,
	HttpApiBuilder,
	HttpApiClient,
	HttpApiEndpoint,
	HttpApiGroup,
	OpenApi,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";

const Payload = Schema.Struct({ message: Schema.String });
const api = HttpApi.make("probe").add(
	HttpApiGroup.make("research").add(
		HttpApiEndpoint.post("echo", "/echo").setPayload(Payload).addSuccess(Payload),
	),
);
const handlers = HttpApiBuilder.group(api, "research", (group) =>
	group.handle("echo", ({ payload }) => Effect.succeed(payload)),
);
const { handler, dispose } = HttpApiBuilder.toWebHandler(
	Layer.mergeAll(
		HttpApiBuilder.api(api).pipe(Layer.provide(handlers)),
		NodeHttpServer.layerContext,
	),
);
try {
	const result = await Effect.runPromise(
		Effect.gen(function* () {
			const client = yield* HttpApiClient.make(api, { baseUrl: "http://probe.invalid" });
			return yield* client.research.echo({ payload: { message: "KAT3251_OK" } });
		}).pipe(
			Effect.provide(FetchHttpClient.layer),
			Effect.provideService(FetchHttpClient.Fetch, (input, init) =>
				handler(new Request(input, init)),
			),
		),
	);
	assert.deepEqual(result, { message: "KAT3251_OK" });
	const invalid = await handler(new Request("http://probe.invalid/echo", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ message: 3251 }),
	}));
	assert.equal(invalid.status, 400);
	const spec = OpenApi.fromApi(api);
	assert.ok(spec.paths["/echo"]?.post);
	console.log(JSON.stringify({
		node: process.version,
		validRoundTrip: result.message,
		invalidStatus: invalid.status,
		openApi: spec.openapi,
		transport: "in-process Web Request/Response through generated client and Node layer context",
	}));
} finally {
	await dispose();
}
