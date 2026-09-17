import { afterAll } from "vitest";
import { removeTempRoots } from "./temp-root.js";

afterAll(() => {
  removeTempRoots();
});
