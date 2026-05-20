import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mountPortableRoot } from "./portable-vite-core.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const mode = process.argv[2] ?? "build";
const viteArgs = process.argv.slice(3);

function resolveViteBin(cwd) {
  return path.join(cwd, "node_modules", "vite", "bin", "vite.js");
}

function runSyncVite(cwd, args) {
  const viteBin = resolveViteBin(cwd);
  const result = spawnSync(process.execPath, [viteBin, ...args], {
    cwd,
    stdio: "inherit",
    windowsHide: true,
  });

  return typeof result.status === "number" ? result.status : 1;
}

const mounted = mountPortableRoot(repoRoot);

try {
  if (mode === "dev" || mode === "preview") {
    const viteBin = resolveViteBin(mounted.cwd);
    const child = spawn(process.execPath, [viteBin, mode === "dev" ? "dev" : "preview", ...viteArgs], {
      cwd: mounted.cwd,
      stdio: "inherit",
      windowsHide: true,
    });

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      mounted.cleanup();
    };

    child.on("exit", (code, signal) => {
      cleanup();
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      process.exit(code ?? 0);
    });

    process.on("SIGINT", () => {
      child.kill("SIGINT");
    });
    process.on("SIGTERM", () => {
      child.kill("SIGTERM");
    });
  } else if (mode === "build") {
    const exitCode = runSyncVite(mounted.cwd, ["build", ...viteArgs]);
    mounted.cleanup();
    process.exit(exitCode);
  } else {
    mounted.cleanup();
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
} catch (error) {
  mounted.cleanup();
  throw error;
}
