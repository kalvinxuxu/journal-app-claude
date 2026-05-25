import { build } from "vite";
import { createReadStream, existsSync } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist-fly");
const backendUrl = process.env.VITE_BACKEND_URL ?? "https://journal-api-shy-pebble-9077.fly.dev";
const port = Number(process.env.VITE_PORT ?? "5174");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

await fs.rm(distDir, { recursive: true, force: true });

await build({
  configFile: false,
  root,
  define: {
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify(""),
  },
  build: {
    outDir: distDir,
    emptyOutDir: true,
  },
});

const server = http.createServer(async (req, res) => {
  const urlPath = req.url?.split("?")[0] ?? "/";

  if (urlPath.startsWith("/api/") || urlPath.startsWith("/media/")) {
    const targetUrl = new URL(req.url ?? "/", backendUrl);
    const client = targetUrl.protocol === "https:" ? https : http;
    const proxyRequest = client.request(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: targetUrl.host,
        origin: backendUrl,
      },
    }, (proxyResponse) => {
      res.writeHead(proxyResponse.statusCode ?? 502, proxyResponse.headers);
      proxyResponse.pipe(res);
    });

    proxyRequest.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Proxy request failed");
    });

    req.pipe(proxyRequest);
    return;
  }

  const relativePath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  let filePath = path.join(distDir, relativePath);

  if (!existsSync(filePath)) {
    filePath = path.join(distDir, "index.html");
  }

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local: http://127.0.0.1:${port}/`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
