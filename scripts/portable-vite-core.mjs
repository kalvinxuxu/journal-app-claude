import { spawnSync } from "node:child_process";

export const driveCandidates = ["X", "Y", "Z", "W", "V", "U"];

export function pickDriveLetter(usedLetters, candidates = driveCandidates) {
  return candidates.find((letter) => !usedLetters.has(letter)) ?? null;
}

export function mountPortableRoot(rootDir, candidates = driveCandidates) {
  if (process.platform !== "win32") {
    return {
      cwd: rootDir,
      cleanup: () => {},
    };
  }

  const usedLetters = new Set();
  for (const letter of candidates) {
    const probe = spawnSync("subst", [`${letter}:`], { encoding: "utf8", windowsHide: true });
    if (probe.status === 0) {
      usedLetters.add(letter);
    }
  }

  const driveLetter = pickDriveLetter(usedLetters, candidates);
  if (!driveLetter) {
    throw new Error("No temporary drive letter is available for Vite.");
  }

  const mount = spawnSync("subst", [`${driveLetter}:`, rootDir], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (mount.status !== 0) {
    throw new Error(`Failed to mount ${rootDir} on ${driveLetter}:`);
  }

  return {
    cwd: `${driveLetter}:\\`,
    cleanup: () => {
      spawnSync("subst", [`${driveLetter}:`, "/D"], {
        encoding: "utf8",
        windowsHide: true,
      });
    },
  };
}
