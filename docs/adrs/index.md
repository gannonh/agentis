# Architecture Decision Records

Durable architecture decisions for Agentis. Read ADRs that touch the area you are about to change before implementing.

## Accepted

| ADR | Title |
| --- | --- |
| [0001-sandboxed-workspace-execution.md](0001-sandboxed-workspace-execution.md) | Sandboxed workspace execution |
| [0002-version-native-tool-permissions-with-agent-configuration.md](0002-version-native-tool-permissions-with-agent-configuration.md) | Version native tool permissions with agent configuration |
| [0004-vercel-ai-gateway-runtime-boundary.md](0004-vercel-ai-gateway-runtime-boundary.md) | Configurable AI Gateway providers as the live runtime boundary |
| [0005-use-artifact-as-library-primitive.md](0005-use-artifact-as-library-primitive.md) | Use Artifact as the durable Library primitive |
| [0006-cloudflare-gateway-transport-routing.md](0006-cloudflare-gateway-transport-routing.md) | Route Cloudflare AI Gateway models by native REST transport |

## Superseded

| ADR | Title | Superseded by |
| --- | --- | --- |
| [0003-persistent-documents-library-primitive.md](0003-persistent-documents-library-primitive.md) | Use Document as the durable Library primitive | [0005](0005-use-artifact-as-library-primitive.md) |

## Related

- [Specs roadmap](../specs/index.md)
- [Domain docs for agents](../agents/domain.md)
- [ADR log](log.md)
