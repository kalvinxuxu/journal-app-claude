## 1. Create Expo workspace skeleton

- [x] 1.1 Scaffold Expo app with `npx create-expo-app@latest mobile-app --template blank-typescript`
- [x] 1.2 Replace generated `mobile-app/package.json` with project-standard manifest
- [x] 1.3 Configure `mobile-app/app.json` (name: 女友手账, scheme: journalapp, typedRoutes experiment)
- [x] 1.4 Configure `mobile-app/tsconfig.json` (strict mode, path aliases)
- [x] 1.5 Configure `mobile-app/babel.config.js` with expo-router/babel plugin
- [x] 1.6 Add `mobile-app/expo-env.d.ts`
- [x] 1.7 Run `npm install` in `mobile-app/` and verify no dependency errors

## 2. Add app shell and navigation scaffold

- [x] 2.1 Create `mobile-app/src/components/Screen.tsx` — SafeAreaView wrapper with `#fffaf6` background and 20px padding
- [x] 2.2 Create `mobile-app/src/styles/theme.ts` — color and radius tokens
- [x] 2.3 Create `mobile-app/src/components/NavCard.tsx` — Pressable card with title, subtitle, onPress props
- [x] 2.4 Create `mobile-app/app/_layout.tsx` — Stack navigator wrapped in AppProviders, headerShown false
- [x] 2.5 Create `mobile-app/app/index.tsx` — Home screen with title, subtitle, and NavCards for Write/Voice/Settings
- [x] 2.6 Create `mobile-app/app/write.tsx` — Write screen placeholder inside Screen wrapper
- [x] 2.7 Create `mobile-app/app/voice.tsx` — Voice screen placeholder inside Screen wrapper
- [x] 2.8 Create `mobile-app/app/settings.tsx` — Settings screen placeholder inside Screen wrapper
- [x] 2.9 Start Expo dev server and verify all 4 screens accessible

## 3. Add providers, app state, and backend configuration

- [x] 3.1 Create `mobile-app/src/providers/AppProviders.tsx` — QueryClient + QueryClientProvider
- [x] 3.2 Create `mobile-app/src/store/appStore.ts` — Zustand store with `backendBaseUrl` and `setBackendBaseUrl`
- [x] 3.3 Create `mobile-app/src/services/api/client.ts` — `getApiBaseUrl()` reading from expo-constants extra
- [x] 3.4 Create `mobile-app/src/services/api/health.ts` — `checkBackendHealth()` using fetch against `/health`
- [x] 3.5 Add `GET /health` endpoint to `backend/src/index.ts` returning `{ status: "ok" }`
- [x] 3.6 Verify backend still starts and existing tests pass

## 4. Add health-check test

- [x] 4.1 Create `mobile-app/src/services/api/health.test.ts` with vitest
- [x] 4.2 Stub global fetch and verify `checkBackendHealth()` returns true when `ok: true`
- [x] 4.3 Run `npm run test` in `mobile-app/` and verify test passes

## 5. Add root-level scripts and developer docs

- [x] 5.1 Add mobile scripts to root `package.json`: `mobile:start`, `mobile:android`, `mobile:ios`, `mobile:test`, `mobile:typecheck`
- [x] 5.2 Append mobile setup section to `README.md`
- [x] 5.3 Create `docs/mobile-app-dev.md` with setup, start, test, typecheck, and backend instructions

## 6. Final verification

- [x] 6.1 Run backend tests (`npm run test` in backend/) and verify all pass
- [x] 6.2 Run mobile typecheck (`npm run typecheck` in mobile-app/) and verify exit 0
- [x] 6.3 Run mobile tests (`npm run test` in mobile-app/) and verify vitest passes
- [x] 6.4 Verify Expo dev server starts without errors