# Expo Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize a production-ready `mobile-app/` Expo project inside `journal-app-claude` and connect it to the existing backend with a minimal native shell, navigation scaffold, environment config, and developer workflow.

**Architecture:** Keep the current web app and backend in place. Add a new `mobile-app/` workspace using Expo Router and TypeScript, with a thin API layer pointed at the existing Express backend. This phase creates only the app shell and shared infrastructure; it does not migrate the full journaling experience yet.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, TanStack Query, Zustand, AsyncStorage, React Hook Form, Expo Image Picker, Expo AV, Expo Notifications

---

## Scope

This plan covers only the initialization slice:

- create `mobile-app/`
- establish Expo Router navigation
- add app theme, providers, and folder structure
- add backend base URL configuration
- add health-check screen
- add developer scripts and docs

This plan intentionally excludes:

- full journal CRUD migration
- voice recording implementation
- image upload implementation
- push notification behavior
- authentication

## File Structure

### Existing files to reuse

- Modify: `package.json`
- Modify: `README.md`
- Modify: `backend/src/index.ts`

### New mobile workspace files

- Create: `mobile-app/package.json`
- Create: `mobile-app/app.json`
- Create: `mobile-app/tsconfig.json`
- Create: `mobile-app/babel.config.js`
- Create: `mobile-app/expo-env.d.ts`
- Create: `mobile-app/app/_layout.tsx`
- Create: `mobile-app/app/index.tsx`
- Create: `mobile-app/app/write.tsx`
- Create: `mobile-app/app/voice.tsx`
- Create: `mobile-app/app/settings.tsx`
- Create: `mobile-app/src/providers/AppProviders.tsx`
- Create: `mobile-app/src/services/api/client.ts`
- Create: `mobile-app/src/services/api/health.ts`
- Create: `mobile-app/src/store/appStore.ts`
- Create: `mobile-app/src/styles/theme.ts`
- Create: `mobile-app/src/components/Screen.tsx`
- Create: `mobile-app/src/components/NavCard.tsx`

### New mobile tests and docs

- Create: `mobile-app/src/services/api/health.test.ts`
- Create: `docs/mobile-app-dev.md`

## Task 1: Create the Expo workspace skeleton

**Files:**
- Create: `mobile-app/package.json`
- Create: `mobile-app/app.json`
- Create: `mobile-app/tsconfig.json`
- Create: `mobile-app/babel.config.js`
- Create: `mobile-app/expo-env.d.ts`

- [ ] **Step 1: Scaffold the Expo app**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude"
npx create-expo-app@latest mobile-app --template blank-typescript
```

Expected:

```text
mobile-app/ is created with a working Expo TypeScript template
```

- [ ] **Step 2: Replace the generated package manifest with the project-standard one**

Update `mobile-app/package.json` to contain:

```json
{
  "name": "journal-app-mobile",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@tanstack/react-query": "^5.59.0",
    "expo": "~51.0.0",
    "expo-av": "~14.0.0",
    "expo-constants": "~16.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-router": "~3.5.0",
    "expo-status-bar": "~1.12.0",
    "react": "18.2.0",
    "react-hook-form": "^7.53.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "~3.31.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.79",
    "typescript": "^5.5.4",
    "vitest": "^4.1.5"
  }
}
```

- [ ] **Step 3: Add Expo config files**

Set `mobile-app/app.json`:

```json
{
  "expo": {
    "name": "女友手账",
    "slug": "journal-app-mobile",
    "scheme": "journalapp",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "assetBundlePatterns": ["**/*"],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

Set `mobile-app/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/src/*": ["./src/*"]
    }
  }
}
```

Set `mobile-app/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["expo-router/babel"],
  };
};
```

Set `mobile-app/expo-env.d.ts`:

```ts
/// <reference types="expo/types" />
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm install
```

Expected:

```text
node_modules installed without dependency resolution errors
```

- [ ] **Step 5: Commit**

```bash
git add mobile-app/package.json mobile-app/app.json mobile-app/tsconfig.json mobile-app/babel.config.js mobile-app/expo-env.d.ts
git commit -m "feat: initialize expo mobile workspace"
```

## Task 2: Add the app shell and navigation scaffold

**Files:**
- Create: `mobile-app/app/_layout.tsx`
- Create: `mobile-app/app/index.tsx`
- Create: `mobile-app/app/write.tsx`
- Create: `mobile-app/app/voice.tsx`
- Create: `mobile-app/app/settings.tsx`
- Create: `mobile-app/src/components/Screen.tsx`
- Create: `mobile-app/src/components/NavCard.tsx`
- Create: `mobile-app/src/styles/theme.ts`

- [ ] **Step 1: Create the shared screen wrapper**

Create `mobile-app/src/components/Screen.tsx`:

```tsx
import { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";

export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fffaf6",
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
```

- [ ] **Step 2: Create theme tokens**

Create `mobile-app/src/styles/theme.ts`:

```ts
export const theme = {
  colors: {
    background: "#fffaf6",
    card: "#ffffff",
    text: "#2e2a27",
    muted: "#7a7067",
    accent: "#e89cae",
    border: "#f0dfd9",
  },
  radius: {
    lg: 20,
    md: 14,
  },
};
```

- [ ] **Step 3: Create the navigation card component**

Create `mobile-app/src/components/NavCard.tsx`:

```tsx
import { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/src/styles/theme";

type NavCardProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  onPress: () => void;
}>;

export function NavCard({ title, subtitle, onPress }: NavCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: theme.colors.muted,
  },
});
```

- [ ] **Step 4: Add the Expo Router layout**

Create `mobile-app/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";
import { AppProviders } from "@/src/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </AppProviders>
  );
}
```

- [ ] **Step 5: Add placeholder pages**

Create `mobile-app/app/index.tsx`:

```tsx
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { NavCard } from "@/src/components/NavCard";
import { Screen } from "@/src/components/Screen";
import { theme } from "@/src/styles/theme";

export default function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.title}>女友手账</Text>
      <Text style={styles.subtitle}>移动端初始化版本</Text>
      <NavCard title="写手账" subtitle="进入写作入口" onPress={() => router.push("/write")} />
      <NavCard title="语音记录" subtitle="进入语音入口" onPress={() => router.push("/voice")} />
      <NavCard title="设置" subtitle="查看环境与偏好" onPress={() => router.push("/settings")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.muted,
    marginBottom: 20,
  },
});
```

Create `mobile-app/app/write.tsx`:

```tsx
import { Text } from "react-native";
import { Screen } from "@/src/components/Screen";

export default function WriteScreen() {
  return (
    <Screen>
      <Text>Write screen placeholder</Text>
    </Screen>
  );
}
```

Create `mobile-app/app/voice.tsx`:

```tsx
import { Text } from "react-native";
import { Screen } from "@/src/components/Screen";

export default function VoiceScreen() {
  return (
    <Screen>
      <Text>Voice screen placeholder</Text>
    </Screen>
  );
}
```

Create `mobile-app/app/settings.tsx`:

```tsx
import { Text } from "react-native";
import { Screen } from "@/src/components/Screen";

export default function SettingsScreen() {
  return (
    <Screen>
      <Text>Settings screen placeholder</Text>
    </Screen>
  );
}
```

- [ ] **Step 6: Start the app and verify routing**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Expo dev server starts and the simulator/device can open Home, Write, Voice, and Settings screens
```

- [ ] **Step 7: Commit**

```bash
git add mobile-app/app mobile-app/src/components mobile-app/src/styles
git commit -m "feat: add expo router app shell"
```

## Task 3: Add providers, app state, and backend configuration

**Files:**
- Create: `mobile-app/src/providers/AppProviders.tsx`
- Create: `mobile-app/src/store/appStore.ts`
- Create: `mobile-app/src/services/api/client.ts`
- Create: `mobile-app/src/services/api/health.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add app-wide providers**

Create `mobile-app/src/providers/AppProviders.tsx`:

```tsx
import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Add a minimal Zustand store**

Create `mobile-app/src/store/appStore.ts`:

```ts
import { create } from "zustand";

type AppStore = {
  backendBaseUrl: string;
  setBackendBaseUrl: (value: string) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  backendBaseUrl: "http://127.0.0.1:3001",
  setBackendBaseUrl: (value) => set({ backendBaseUrl: value }),
}));
```

- [ ] **Step 3: Add API base resolution**

Create `mobile-app/src/services/api/client.ts`:

```ts
import Constants from "expo-constants";

type ExpoExtra = {
  apiBaseUrl?: string;
};

export function getApiBaseUrl() {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  return extra.apiBaseUrl || "http://127.0.0.1:3001";
}
```

Create `mobile-app/src/services/api/health.ts`:

```ts
import { getApiBaseUrl } from "./client";

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Add a backend health endpoint if missing**

Ensure `backend/src/index.ts` contains:

```ts
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});
```

If it already exists, leave it unchanged.

- [ ] **Step 5: Commit**

```bash
git add mobile-app/src/providers mobile-app/src/store mobile-app/src/services/api backend/src/index.ts
git commit -m "feat: add mobile providers and backend config"
```

## Task 4: Add a minimal health-check test

**Files:**
- Create: `mobile-app/src/services/api/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `mobile-app/src/services/api/health.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { checkBackendHealth } from "./health";

describe("checkBackendHealth", () => {
  it("returns true when backend responds with ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    await expect(checkBackendHealth()).resolves.toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify the setup**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
Vitest runs successfully and the health test passes
```

- [ ] **Step 3: Commit**

```bash
git add mobile-app/src/services/api/health.test.ts
git commit -m "test: add mobile backend health check test"
```

## Task 5: Add root-level scripts and developer docs

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `docs/mobile-app-dev.md`

- [ ] **Step 1: Add root scripts for mobile workflow**

Append these scripts to the root `package.json`:

```json
{
  "mobile:start": "npm --prefix mobile-app run start",
  "mobile:android": "npm --prefix mobile-app run android",
  "mobile:ios": "npm --prefix mobile-app run ios",
  "mobile:test": "npm --prefix mobile-app run test",
  "mobile:typecheck": "npm --prefix mobile-app run typecheck"
}
```

- [ ] **Step 2: Add a short mobile setup section to README**

Append this section to `README.md`:

```md
## Mobile App

Expo mobile app lives in `mobile-app/`.

Start it with:

```bash
npm run mobile:start
```
```

- [ ] **Step 3: Add detailed mobile dev documentation**

Create `docs/mobile-app-dev.md`:

````md
# Mobile App Development

## Install

```bash
cd mobile-app
npm install
```

## Start Expo

```bash
npm run start
```

## Run tests

```bash
npm run test
```

## Run typecheck

```bash
npm run typecheck
```

## Backend

The mobile app expects the existing backend to be running locally.
Default base URL:

```text
http://127.0.0.1:3001
```
````

- [ ] **Step 4: Commit**

```bash
git add package.json README.md docs/mobile-app-dev.md
git commit -m "docs: add mobile app developer workflow"
```

## Final Verification

- [ ] **Step 1: Verify backend still runs**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\backend"
npm run test
```

Expected:

```text
Existing backend tests pass
```

- [ ] **Step 2: Verify mobile app typechecks**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run typecheck
```

Expected:

```text
TypeScript exits with code 0
```

- [ ] **Step 3: Verify mobile app tests**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run test
```

Expected:

```text
Vitest passes
```

- [ ] **Step 4: Verify Expo app boots**

Run:

```bash
cd "c:\Users\kalvi\Documents\claude application\journal-app-claude\mobile-app"
npm run start
```

Expected:

```text
Expo dev server starts and the app opens to the home shell
```
