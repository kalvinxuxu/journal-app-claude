## ADDED Requirements

### Requirement: API base URL resolution
The `getApiBaseUrl()` function in `src/services/api/client.ts` SHALL return the backend base URL, defaulting to `http://127.0.0.1:3001` if not configured in `app.json` extra fields.

### Requirement: Backend health check
The `checkBackendHealth()` function in `src/services/api/health.ts` SHALL return `true` when the backend `/health` endpoint responds with status 200, and `false` otherwise.

### Requirement: Fetch-based HTTP client
All API functions SHALL use the native `fetch` API and accept/return typed JSON.

### Requirement: Expo Constants integration
The API client SHALL read `apiBaseUrl` from `Constants.expoConfig?.extra` with a fallback to the default local URL.

### Requirement: Health test
A vitest test at `src/services/api/health.test.ts` SHALL verify that `checkBackendHealth()` returns `true` when the fetch mock returns `ok: true`.

#### Scenario: Default API URL used
- **WHEN** `getApiBaseUrl()` is called and no `apiBaseUrl` is configured
- **THEN** it returns `http://127.0.0.1:3001`

#### Scenario: Configured API URL used
- **WHEN** `app.json` extra field `apiBaseUrl` is set to a custom URL
- **THEN** `getApiBaseUrl()` returns that custom URL

#### Scenario: Backend health check succeeds
- **WHEN** `checkBackendHealth()` is called and backend responds with ok
- **THEN** it returns `true`

#### Scenario: Backend health check fails
- **WHEN** `checkBackendHealth()` is called and backend is unreachable or returns non-200
- **THEN** it returns `false`

#### Scenario: Health check test passes
- **WHEN** `npm run test` is executed
- **THEN** the health check test passes with vitest