## Context

The project has a web app and Express backend running on `http://127.0.0.1:3001`. There is no mobile client. The goal is to add a native Expo/React Native mobile app that shares the backend but has its own native UX.

**Constraints:**
- Web app must remain untouched (except adding root scripts and a `/health` endpoint)
- Backend must not change existing API contracts
- Mobile app targets iOS and Android via Expo
- TypeScript strict mode enabled

## Goals / Non-Goals

**Goals:**
- Create a working Expo app shell at `mobile-app/` that can open, navigate between screens, and communicate with the existing backend
- Provide a clean architecture: screen components, shared components, providers, API services, state store
- Follow the existing Morandi pastel design system from the web app
- Enable rapid iteration with `npm run mobile:start`

**Non-Goals:**
- Full journal CRUD (create, read, update, delete journal entries)
- Voice recording and playback
- Image capture and upload
- Push notifications
- Authentication / user management
- Any backend changes beyond a `/health` endpoint

## Decisions

### Expo Router over React Navigation

**Decision:** Use Expo Router (file-based routing) instead of React Navigation.

**Why:** Expo Router is the standard for Expo apps, requires less boilerplate, and `expo-router@3.5` is already in the dependency list. File-based routing aligns with Next.js conventions the team already uses for the web app.

**Alternatives considered:**
- React Navigation: requires manual route configuration, more code to maintain
- react-native-router-flux: older, less maintained

### Zustand over Redux or Context API

**Decision:** Use Zustand for global app state.

**Why:** Zustand is minimal, TypeScript-first, and works well with AsyncStorage for persistence. It avoids the boilerplate of Redux while being more ergonomic than React Context for this use case.

**Alternatives considered:**
- Redux Toolkit: too much boilerplate for a mobile shell
- React Context: works but doesn't scale well as state grows

### TanStack Query over raw fetch

**Decision:** Use TanStack Query for data fetching and caching.

**Why:** It provides out-of-the-box caching, background refetching, and loading/error states — essential for mobile UX. The existing backend API doesn't change, so we wrap `fetch` in query hooks.

**Alternatives considered:**
- Raw fetch in `useEffect`: no caching, manual loading state management
- SWR: similar but TanStack Query has better TypeScript support

### API base URL via Expo Constants

**Decision:** Read backend URL from `app.json` extra fields via `expo-constants`.

**Why:** This allows overriding the URL without rebuilding the app — useful for development vs. production. Fallback defaults to `http://127.0.0.1:3001`.

**Alternatives considered:**
- Hardcoded constant: requires rebuild to change
- `.env` file: not natively supported in Expo without extra config

## Risks / Trade-offs

- [Risk] Expo SDK version drift — `expo@~51.0.0` is latest stable but may lag behind latest. → Mitigation: pin minor versions in `package.json`, update when Expo releases are stable.
- [Risk] Mobile app and web app share the same backend CORS policy. → Mitigation: backend currently allows localhost CORS; ensure it remains configured for `journalapp://` scheme.
- [Trade-off] File-based routing is convenient but requires discipline to keep `app/` folder organized. → Mitigation: follow convention of one file per route, co-locate related components.

## Migration Plan

1. **Phase 1 (this change):** Create the mobile workspace, scaffold screens, add backend health check
2. **Phase 2:** Add journal entry screens and CRUD
3. **Phase 3:** Add voice recording with `expo-av`
4. **Phase 4:** Add image picker and upload

No rollback needed — this is an additive change. The web app continues to function independently.