# Testing Supabase Edge Functions

This directory contains tests for the Supabase Edge Functions that handle server-side multiplayer logic.

## Test Structure

- `action/index.test.js` - Tests for the main game action handler
- `auth-steam/index.test.js` - Tests for Steam authentication
- `action/test_utils.ts` - Shared test utilities and mocks (TypeScript)

## Running Tests

```bash
# Run all Supabase function tests
npm run test:supabase

# Or run directly with Deno
deno test --no-check supabase/functions/**/*.test.js
```

## Test Coverage

### Action Function Tests

- **Session Management**: Starting new sessions, retrieving session state
- **Authentication**: User validation and authorization
- **Team Updates**: Validating and applying team changes
- **Action Resolution**: Processing game actions and state transitions
- **Database Operations**: Mocking Supabase database interactions

### Auth-Steam Function Tests

- **Steam API Validation**: Mocking Steam authentication API calls
- **Password Generation**: Deterministic password creation from Steam ID
- **User Registration/Login**: Testing Supabase auth flows
- **Error Handling**: Invalid tickets, missing configuration

## Mocking Strategy

Tests use mocked Supabase clients and external API calls to isolate function logic:

- `createMockSupabaseClient()` - Creates a mock Supabase client with stubbed methods
- `mockFetch()` - Mocks external HTTP requests (Steam API)
- Environment variables are set in tests to avoid dependency on real config

## Local Development

To test functions locally with real Supabase:

1. Install Supabase CLI
2. Initialize Supabase project: `supabase init`
3. Start local Supabase: `supabase start`
4. Serve functions: `supabase functions serve`
5. Test with curl or a client

## Integration with CI/CD

These tests can be run in CI to ensure edge function logic remains correct. For full integration testing, consider:

- Setting up a test Supabase instance
- Using real database operations (with cleanup)
- Testing against deployed functions via HTTP calls

## Notes

- Tests are written in JavaScript (.js) to avoid TypeScript compilation issues with the project's tsconfig.json
- Use `--no-check` flag when running Deno tests to bypass TypeScript config conflicts