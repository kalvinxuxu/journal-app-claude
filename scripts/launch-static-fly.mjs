import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const outLog = path.join(root, ".fly-static.out.log");
const errLog = path.join(root, ".fly-static.err.log");

const outFd = fs.openSync(outLog, "w");
const errFd = fs.openSync(errLog, "w");

const child = spawn(
  process.execPath,
  [path.join(root, "scripts", "start-static-fly.mjs")],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", outFd, errFd],
    env: {
      ...process.env,
      VITE_BACKEND_URL: process.env.VITE_BACKEND_URL ?? "https://journal-api-shy-pebble-9077.fly.dev",
      VITE_PORT: process.env.VITE_PORT ?? "5174",
    },
  },
);

child.unref();

console.log(`Launched PID ${child.pid}`);
