# Repairs needed to complete Gate 0

Gannon's September 11 instruction to finish the incomplete work authorizes the bounded repairs recorded on KAT-3247. The nine acceptance criteria remain unchanged.

## Fixture boundary

The selected design puts the fake daemon and its children in a read-only Docker container with `--network none`. The only writable host mount is a fresh verification root. A bundled daemon entrypoint is mounted read-only; host dependencies, home directories and credential/configuration stores are absent. The launcher exposes the existing authenticated loopback HTTP contract through a fixed TCP relay over `docker exec`.

Two independent architecture candidates compared this design with a separate fake worker isolated by macOS Seatbelt and Linux bubblewrap. The Docker design preserves the fake engine and uses the project's existing runtime dependency. The worker design requires two OS policies, a new worker protocol, and an engine lifecycle rewrite. It was rejected for this bounded repair. No host execution fallback is retained.

A preliminary Docker Desktop experiment established that an internal bridge with isolated gateway mode did not publish the requested port. A second experiment established successful host HTTP ingress through the exec relay with `--network none`, while an outbound request failed with ENETUNREACH. These were design experiments; acceptance depends on the packaged launcher receipts.

The container can read its newly generated fixture owner token and database. It cannot read host/provider credentials outside the fresh root. Image-local executables remain available inside the boundary; the executable probe tests escape to host-only executables and files. This does not certify isolation between the trusted fake engine and its own daemon, or protection from host administration and kernel vulnerabilities.

The cross-judge required a Docker-shared canonical temporary root, matching non-root host UID/GID, a held host listener, readiness through the relay, packaged runtime resolution, and cleanup of the exact owned container and all relay children. The packaged smoke exercises the real installed tarball and tests these observable outcomes.

Docker's [none network](https://docs.docker.com/engine/network/drivers/none/) contains only the container's loopback interface. The fixture daemon bundle uses the existing esbuild version already present in the lockfile, promoted to an explicit build dependency.

## Native rejection

The Claude acceptance prompt previously described the complete envelope as untrusted source context without clearly separating the new request from the historical brief and draft. In the failed live receipt, Ivo accepted an impossible request and repeated a generic draft.

The repaired prompt identifies `request` as the outcome to assess and `brief`/`sourceDraft` as history. It explicitly rejects work outside the existing draft-only grant, including external actions and credentials. The native model still chooses acceptance or rejection; no fixture injects the decision. The rejection scenario asks for a completed bank transfer, supplies no credentials or tools, and does not prescribe the response. Acceptance of a supported drafting request is separately reverified.
