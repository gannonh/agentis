# Proposed runtime pins

Checked September 6, 2026 for [KAT-3251](https://linear.app/kata-sh/issue/KAT-3251). These are research pins. No application dependencies or engine API are introduced.

| Package | Exact version | Role |
| --- | --- | --- |
| Node | 24.20.0 | Node 24 LTS patch published August 26, 2026 |
| `effect` | 3.22.1 | Stable Effect 3 family, including `effect/Schema` |
| `@effect/platform` | 0.97.1 | `HttpApi`, server, derived client, OpenAPI |
| `@effect/platform-node` | 0.108.1 | Node platform services |
| `@effect/rpc` | 0.76.2 | Published platform-node peer dependency |
| `@effect/sql` | 0.52.1 | Published platform-node peer dependency |
| `@effect/cluster` | 0.60.2 | Published platform-node peer dependency |
| TypeScript | 7.0.2 | Compiler used for the disposable check |
| `@types/node` | 24.13.3 | Node 24 declaration family |
| `@types/ws` | 8.18.1 | Required by platform-node-shared declarations under full library checking |

The platform packages have 0.x version numbers but are regular published releases, not prereleases. Their published peer ranges accept Effect 3.22.1 and each other. Use the [Effect v3 platform documentation](https://effect.website/docs/v3/platform/introduction) and the declarations shipped with these versions. Do not mix Effect 4 examples into this family. No RC exception is proposed. `effect/Schema` is canonical; do not add the obsolete standalone `@effect/schema` package. External provider SDK schemas remain boundary schemas.

The rpc, sql, and cluster packages are the dependency closure required for this probe's Node platform package. Their presence does not authorize Agentis RPC, clustering, or additional product modules. The first implementation should import only services used by its vertical slice.

[Node release](https://nodejs.org/en/blog/release/v24.20.0), [official checksum file](https://nodejs.org/dist/v24.20.0/SHASUMS256.txt), [published package metadata and integrity hashes](evidence/packages.json), [locked probe dependency graph](evidence/runtime-package-lock.json).

## Reproduce the compatibility check

Use Node 24.20.0 on PATH. The experiment installs everything in a new temporary directory. Run from the repository root.

```sh
probe_root=$(mktemp -d /tmp/kat3251-runtime.XXXXXX)
cp docs/research/provider-contracts/runtime-package.json "$probe_root/package.json"
cp docs/research/provider-contracts/evidence/runtime-package-lock.json "$probe_root/package-lock.json"
cp docs/research/provider-contracts/runtime-probe.mts "$probe_root/runtime-probe.mts"
npm ci --prefix "$probe_root" --cache "$probe_root/npm-cache" --ignore-scripts --no-audit --no-fund
"$probe_root/node_modules/.bin/tsc" --strict --skipLibCheck false --target es2022 --module nodenext --moduleResolution nodenext --outDir "$probe_root/out" "$probe_root/runtime-probe.mts"
node "$probe_root/out/runtime-probe.mjs"
```

The [probe](runtime-probe.mts) defines one `Schema.Struct`, uses it as the HTTP request and response contract, derives the client and OpenAPI from the same `HttpApi`, and runs the request through the generated server with Node platform context. It checks a successful round trip and HTTP 400 for a numeric value where the schema requires a string. Strict compilation checks the entire declaration graph with `skipLibCheck=false`.

Observed result on Linux x86_64 and Node 24.20.0 was `KAT3251_OK`, HTTP 400, and OpenAPI 3.1.0. The first compilation found missing `ws` declarations; adding the exact `@types/ws` pin resolved it. See [result](evidence/runtime-result.json). This tests in-process Web Request/Response transport, not a TCP listener, SQLite, package installation on macOS, or an Agentis daemon. macOS Apple silicon runtime and packaged evidence remain UNVERIFIED for implementation.
