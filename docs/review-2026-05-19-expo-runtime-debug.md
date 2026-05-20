# Expo Runtime Debug Review

Date: 2026-05-19
Project: `journal-app-claude/mobile-app`
Scope: Android real-device startup via Expo Go

## Summary

Current mobile app startup is still blocked on Android real-device testing.

Two separate issues were observed during Expo Go launch:

1. Initial Metro bundle request failed with HTTP `500`
2. After that was cleared, Expo Go still crashed into a red screen with:
   `TypeError: getDevServer is not a function (it is Object)`

The first issue was a missing Babel dependency.
The second issue appears to be an Expo SDK package compatibility problem, not a network problem.

## Findings

### Finding 1

Severity: High

The original `500` error came from a missing `babel-preset-expo` dependency.

Evidence:

- Red screen body showed:
  `Cannot find module 'babel-preset-expo'`
- [babel.config.js](</c:/Users/kalvi/Documents/claude application/journal-app-claude/mobile-app/babel.config.js:1>) uses:
  `presets: ["babel-preset-expo"]`
- `require.resolve("babel-preset-expo")` initially failed

Impact:

- Expo Go could not load the JS bundle at all
- This produced the first hard startup failure

Status:

- This specific blocker was identified and locally addressed during debugging
- It is not the current primary blocker anymore

### Finding 2

Severity: Critical

The current startup blocker is an Expo dependency mismatch across SDK 54 packages.

Evidence:

- Android red screen now shows:
  `TypeError: getDevServer is not a function (it is Object)`
- `npm ls` shows the app is on:
  - `expo@54.0.34`
  - `expo-router@4.0.22`
  - `@expo/metro-runtime@4.0.1`
- Expo compatibility check reports the following packages are outdated for SDK 54:
  - `expo-av@14.0.7` expected `~16.0.8`
  - `expo-constants@17.0.8` expected `~18.0.13`
  - `expo-image-picker@16.0.6` expected `~17.0.11`
  - `expo-notifications@0.29.14` expected `~0.32.17`
  - `expo-router@4.0.22` expected `~6.0.23`
  - `react-native-safe-area-context@5.4.0` expected `~5.6.0`
  - `react-native-screens@4.10.0` expected `~4.16.0`

Impact:

- Metro can bundle, but the runtime is still not stable enough for Expo Go to boot the app
- Manual mobile QA cannot proceed yet

Likely root cause:

- The app was initialized or partially upgraded across different Expo SDK generations
- `expo@54` is running with an older router/runtime package family
- This creates runtime contract mismatches inside Expo Router / Metro integration

### Finding 3

Severity: Medium

The Babel config still emitted deprecation warnings before cleanup:

- `expo-router/babel is deprecated in favor of babel-preset-expo in SDK 50`

Impact:

- Not the direct cause of the current red screen
- But it added noise during debugging and indicated the router setup was from an older Expo pattern

### Finding 4

Severity: Medium

The mobile app also still contains local-host assumptions that will matter after startup is fixed.

Evidence:

- [app.json](</c:/Users/kalvi/Documents/claude application/journal-app-claude/mobile-app/app.json:1>) uses:
  `http://127.0.0.1:3001`
- [client.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/mobile-app/src/services/api/client.ts:1>) falls back to:
  `http://127.0.0.1:3001`
- [appStore.ts](</c:/Users/kalvi/Documents/claude application/journal-app-claude/mobile-app/src/store/appStore.ts:1>) also stores:
  `http://127.0.0.1:3001`

Impact:

- Not responsible for the current startup crash
- But real-device backend integration will fail later unless replaced with LAN IP or configurable environment values

## What Is Working

- TypeScript typecheck passed locally during debugging
- Basic store tests passed locally:
  `src/store/journalStore.test.ts`
- Metro bundling progressed far enough to produce:
  `Android Bundled ... node_modules\\expo-router\\entry.js`

This means the app is no longer failing at the very first bundling step.

## What Is Not Yet Verified

- Successful launch into the first screen on Android
- Navigation flow across `Home -> Write -> Detail -> Voice`
- Real-device media permissions
- Real-device API connectivity

## Recommended Fix Order

1. Align all Expo SDK 54 packages using Expo-managed versions
2. Re-run Expo Go launch on Android after dependency alignment
3. Only after successful boot, switch mobile backend URLs from `127.0.0.1` to a LAN-accessible host
4. Then start manual device QA for the core page flow

## Suggested Next Command Set

Run in `mobile-app/`:

```bash
npx expo install expo-av expo-constants expo-image-picker expo-notifications expo-router react-native-safe-area-context react-native-screens
npm run start -- --clear
```

If dependency resolution still fails, inspect the npm resolver output first before forcing installation.

## Conclusion

The current blocker is not Expo Go itself and not the phone network.

The primary blocker is a version skew inside the Expo SDK 54 dependency set, especially around `expo-router` and related runtime packages.

Until those packages are aligned, the mobile app should be treated as:

- code-level scaffolding available
- unit-testable in parts
- not yet ready for end-to-end real-device QA
