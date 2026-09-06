import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { ExecutionBoundary, ProviderKind } from "./schema.js";

export const Profile = Schema.Struct({
  name: Schema.String,
  endpoint: Schema.String,
  dataRoot: Schema.String,
  provider: ProviderKind,
  executionBoundary: ExecutionBoundary,
});
export type Profile = typeof Profile.Type;

const pathFor = (dataRoot: string, name: string) => join(dataRoot, "profiles", `${name}.json`);

export const saveProfile = (profile: Profile) => {
  const path = pathFor(profile.dataRoot, profile.name);
  mkdirSync(join(profile.dataRoot, "profiles"), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 });
  return path;
};

export const loadProfile = (dataRoot: string, name: string): Profile =>
  Schema.decodeUnknownSync(Profile)(JSON.parse(readFileSync(pathFor(dataRoot, name), "utf8")));
