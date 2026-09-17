import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const roots = new Set<string>();

const remove = (root: string): boolean => {
  try {
    rmSync(root, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
};

export const tempRoot = (prefix: string): string => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.add(root);
  return root;
};

export const removeTempRoot = (root: string): void => {
  if (remove(root)) roots.delete(root);
};

export const removeTempRoots = (): void => {
  for (const root of roots) {
    if (remove(root)) roots.delete(root);
  }
};

process.once("exit", removeTempRoots);
