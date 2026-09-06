import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform";
import { CommandReceipt, CommandRequest, Health } from "./schema.js";
import { API_FAMILY } from "./versions.js";

export const AgentisApi = HttpApi.make(`agentis-${API_FAMILY}`).add(
  HttpApiGroup.make("v1")
    .add(
      HttpApiEndpoint.post("command", "/v1/commands")
        .setPayload(CommandRequest)
        .addSuccess(CommandReceipt),
    )
    .add(HttpApiEndpoint.get("health", "/v1/health").addSuccess(Health)),
);

export const openApiDocument = () => OpenApi.fromApi(AgentisApi);
