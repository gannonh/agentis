import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, "../..")
  const env = loadEnv(mode, repoRoot, "")
  const apiPort = env.AGENTIS_API_PORT ?? env.PORT ?? "3101"
  const webPort = Number(env.AGENTIS_WEB_PORT ?? env.VITE_PORT ?? 5177)

  return {
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@workspace/shared": path.resolve(
          __dirname,
          "../../packages/shared/src/index.ts"
        ),
      },
    },
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
