## Why

The journal app currently has a web frontend and Express backend, but no mobile presence. Adding a native mobile app using Expo enables users to journal on-the-go with voice recording and camera integration that web lacks.

## What Changes

- Create a new `mobile-app/` workspace with Expo and React Native
- Establish Expo Router navigation with a tab-based shell (Home, Write, Voice, Settings)
- Add shared infrastructure: theme, providers, Zustand store, API client
- Configure backend base URL and a health-check endpoint
- Add developer scripts at root level and mobile-specific documentation
- This phase creates only the app shell and shared infrastructure; full journal CRUD, voice recording, image upload, and push notifications are out of scope

## Capabilities

### New Capabilities
- **mobile-app-shell**: Expo workspace with TypeScript, Expo Router, and basic navigation scaffold (Home, Write, Voice, Settings screens)
- **mobile-api-client**: Thin fetch-based API client with backend health check
- **mobile-providers**: React Query provider and Zustand app state store
- **mobile-theme**: Shared design tokens (colors, spacing, typography) following the project's Morandi pastel system

### Modified Capabilities
- None — backend does not change behavior, only adds a `/health` route

## Impact

- New directory: `mobile-app/` containing all mobile source code
- New dev dependency: Expo SDK 51, expo-router, TanStack Query, Zustand, and related packages
- Backend: add `GET /health` endpoint returning `{ status: "ok" }`
- Root `package.json`: add `mobile:start`, `mobile:android`, `mobile:ios`, `mobile:test`, `mobile:typecheck` scripts
- Documentation: new `docs/mobile-app-dev.md` with setup instructions