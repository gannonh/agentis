import { http, HttpResponse } from "msw"
import { demoWorkspace } from "@/fixtures/demo-workspace"

export const handlers = [
  http.get("/api/workspace", () => {
    return HttpResponse.json(demoWorkspace)
  }),
  http.get("/api/agents", () => {
    return HttpResponse.json(demoWorkspace.agents)
  }),
  http.get("/api/agents/:id", ({ params }) => {
    const agent = demoWorkspace.agents.find((item) => item.id === params.id)
    if (!agent) {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json(agent)
  }),
]
