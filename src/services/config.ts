/**
 * Shared backend URL configuration.
 * All frontend services must use VITE_BACKEND_URL env var instead of hardcoding localhost.
 */

const DEFAULT_BACKEND_URL = "http://localhost:8003";

export function getBackendUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (env.VITE_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/$/, "");
}

export function normalizeBackendUrl(base: string): string {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function buildBackendUrl(path: string): string {
  return `${getBackendUrl()}${path}`;
}
