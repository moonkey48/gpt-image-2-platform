import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Accept either the server-side name (preferred) or the legacy VITE_* name.
  const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || "";

  // Dev-only middleware that mirrors the prod serverless status endpoint.
  const statusMiddleware: PluginOption = {
    name: "dev-api-status",
    configureServer(server) {
      server.middlewares.use("/api/status", (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.setHeader("cache-control", "no-store");
        res.end(JSON.stringify({ configured: apiKey.length > 0 }));
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), statusMiddleware],
    server: {
      port: 5176,
      proxy: {
        "/api/openai": {
          target: "https://api.openai.com",
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/openai/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) {
                proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
              }
            });
          },
        },
      },
    },
  };
});
