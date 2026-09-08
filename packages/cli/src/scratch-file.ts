import { closeSync, constants, openSync, rmSync, writeFileSync } from "node:fs";

// The Run workspace is writable by the provider container, so the destination may be a link the
// provider planted. Unlink whatever is there and create the file exclusively without following.
export const writeScratchFile = (path: string, body: string) => {
  rmSync(path, { force: true });
  const descriptor = openSync(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    writeFileSync(descriptor, body);
  } finally {
    closeSync(descriptor);
  }
};
