import { http, HttpResponse } from "msw"
import { demoWorkspace } from "@/fixtures/demo-workspace"

export const handlers = [
  http.get("/api/workspace", () => {
    return HttpResponse.json(demoWorkspace)
  }),
]
