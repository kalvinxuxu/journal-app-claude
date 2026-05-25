import { defineConfig } from "vite";

const backendUrl = process.env.VITE_BACKEND_URL ?? "https://journal-api-shy-pebble-9077.fly.dev";

export default defineConfig({
  root: process.cwd(),
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
  define: {
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify(backendUrl),
  },
});
