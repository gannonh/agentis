import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, "web"),
  build: {
    emptyOutDir: false,
    outDir: resolve(import.meta.dirname, "dist/web"),
  },
});
