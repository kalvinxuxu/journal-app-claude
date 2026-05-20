## ADDED Requirements

### Requirement: Expo workspace initialization
The mobile workspace SHALL be created at `mobile-app/` using `npx create-expo-app@latest mobile-app --template blank-typescript` and the generated package.json replaced with the project-standard manifest.

### Requirement: Expo Router navigation
The app SHALL use Expo Router with a Stack navigator and the entry point configured as `expo-router/entry`.

### Requirement: Home screen
The home screen at `app/index.tsx` SHALL display a title "女友手账", a subtitle "移动端初始化版本", and navigation cards for Write, Voice, and Settings screens.

### Requirement: Write screen
The write screen at `app/write.tsx` SHALL render inside a SafeAreaView with padding 20 and background color `#fffaf6`.

### Requirement: Voice screen
The voice screen at `app/voice.tsx` SHALL render inside a SafeAreaView with padding 20 and background color `#fffaf6`.

### Requirement: Settings screen
The settings screen at `app/settings.tsx` SHALL render inside a SafeAreaView with padding 20 and background color `#fffaf6`.

### Requirement: Screen wrapper component
A shared `Screen` component at `src/components/Screen.tsx` SHALL wrap content in SafeAreaView with background `#fffaf6` and padding 20.

### Requirement: NavCard component
A `NavCard` component at `src/components/NavCard.tsx` SHALL accept `title`, `subtitle`, and `onPress` props, render as a Pressable with 18px padding, border radius 20, and theme-consistent colors.

### Requirement: Navigation routing
Navigation from Home to Write SHALL use `router.push("/write")`, Home to Voice SHALL use `router.push("/voice")`, and Home to Settings SHALL use `router.push("/settings")`.

### Requirement: TypeScript strict mode
The `tsconfig.json` SHALL extend `expo/tsconfig.base` with `strict: true`.

#### Scenario: Expo workspace created
- **WHEN** `npx create-expo-app@latest mobile-app --template blank-typescript` is executed
- **THEN** `mobile-app/package.json`, `mobile-app/app.json`, `mobile-app/tsconfig.json`, `mobile-app/babel.config.js`, and `mobile-app/expo-env.d.ts` exist

#### Scenario: Navigation between screens
- **WHEN** user presses a NavCard on the home screen
- **THEN** the corresponding screen renders via expo-router

#### Scenario: Screen wrapper renders correctly
- **WHEN** any screen component renders inside the Screen wrapper
- **THEN** content is wrapped in SafeAreaView with background `#fffaf6` and 20px padding

#### Scenario: NavCard press handler fires
- **WHEN** user presses a NavCard component
- **THEN** the `onPress` callback is invoked

#### Scenario: TypeScript type checking
- **WHEN** `npm run typecheck` is executed
- **THEN** TypeScript exits with code 0 (no type errors)

#### Scenario: All screens accessible via navigation
- **WHEN** expo-router is configured with Stack navigator and headerShown false
- **THEN** routes `/`, `/write`, `/voice`, `/settings` are all accessible