## ADDED Requirements

### Requirement: AppProviders component
The `AppProviders` component in `src/providers/AppProviders.tsx` SHALL wrap children with a `QueryClientProvider` using a `QueryClient` instance.

### Requirement: Zustand app store
The `useAppStore` Zustand store in `src/store/appStore.ts` SHALL expose `backendBaseUrl` (string) and `setBackendBaseUrl` (function) for managing the backend base URL state.

### Requirement: React Query configuration
The `QueryClient` SHALL be instantiated once per AppProviders mount with default options suitable for mobile (staleTime 5 minutes, gcTime 10 minutes).

### Requirement: Provider composition
AppProviders SHALL render children inside the QueryClientProvider without additional wrapper divs that would affect layout.

#### Scenario: AppProviders renders children
- **WHEN** `AppProviders` wraps a component tree
- **THEN** the component tree renders with React Query context available

#### Scenario: Zustand store updates backend URL
- **WHEN** `useAppStore.getState().setBackendBaseUrl("http://custom")` is called
- **THEN** `useAppStore.getState().backendBaseUrl` equals `"http://custom"`

#### Scenario: React Query caches data
- **WHEN** a query is executed with `staleTime: 5 * 60 * 1000`
- **THEN** subsequent identical queries within 5 minutes are served from cache without network request

#### Scenario: Store initial state
- **WHEN** `useAppStore()` is called with no prior state
- **THEN** `backendBaseUrl` defaults to `"http://127.0.0.1:3001"`