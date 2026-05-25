import { createServer } from "vite";

const backendUrl = process.env.VITE_BACKEND_URL ?? "https://journal-api-shy-pebble-9077.fly.dev";
const port = Number(process.env.VITE_PORT ?? "5174");

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
  define: {
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify(backendUrl),
  },
});

await server.listen();

server.printUrls();

const keepAliveTimer = setInterval(() => {}, 60_000);

const shutdown = async () => {
  clearInterval(keepAliveTimer);
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
