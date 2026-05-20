## ADDED Requirements

### Requirement: Theme colors
The `theme.colors` object SHALL contain: `background: "#fffaf6"`, `card: "#ffffff"`, `text: "#2e2a27"`, `muted: "#7a7067"`, `accent: "#e89cae"`, `border: "#f0dfd9"`.

### Requirement: Theme radius
The `theme.radius` object SHALL contain: `lg: 20`, `md: 14`.

### Requirement: TypeScript export
The theme module at `src/styles/theme.ts` SHALL export a `theme` constant of type `typeof import("./theme")`.

### Requirement: Theme usage in components
The `Screen` component SHALL use `theme.colors.background` for SafeAreaView background.
The `NavCard` component SHALL use `theme.radius.lg` for border radius, `theme.colors.card` for background, `theme.colors.border` for border color.

#### Scenario: Theme colors are defined
- **WHEN** `theme.colors` is accessed
- **THEN** it contains all 6 color keys with hex string values

#### Scenario: Theme radius values are defined
- **WHEN** `theme.radius` is accessed
- **THEN** it contains `lg: 20` and `md: 14`

#### Scenario: Screen component uses theme
- **WHEN** `Screen` component renders
- **THEN** SafeAreaView backgroundColor is `#fffaf6` and content padding is 20

#### Scenario: NavCard uses theme
- **WHEN** `NavCard` renders
- **THEN** borderRadius is 20, backgroundColor is `#ffffff`, and borderColor is `#f0dfd9`