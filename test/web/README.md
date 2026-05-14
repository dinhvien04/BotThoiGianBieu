# Web tests

Place web dashboard tests here.

## Test Structure

- `components/` - Unit tests for React components
- `utils/` - Unit tests for utility functions
- `e2e/` - End-to-end tests with Playwright

## Running Tests

### Unit Tests (Jest + React Testing Library)
```sh
# Run all web tests
npm run test:web

# Run tests in watch mode (from web directory)
cd app/web
npm run test

# Run tests with coverage
cd app/web
npm run test:ci
```

### E2E Tests (Playwright)
```sh
# Run E2E tests (from web directory)
cd app/web
npm run test:e2e

# Run E2E tests with UI
cd app/web
npm run test:e2e:ui
```

## Test Files Created

### Unit Tests
- `components/Toast.test.tsx` - Tests for Toast notification component
- `components/ErrorStates.test.tsx` - Tests for error state components
- `utils/mock-data.test.ts` - Tests for mock data utilities

### E2E Tests
- `e2e/homepage.spec.ts` - Homepage functionality tests
- `e2e/dashboard.spec.ts` - Dashboard functionality tests

## Coverage

Unit tests aim for 70% coverage across:
- Branches: 70%
- Functions: 70% 
- Lines: 70%
- Statements: 70%

## Notes

- Tests use Vietnamese language where appropriate to match the application
- E2E tests include accessibility and responsive design checks
- Mock data tests ensure data consistency and validation
- Error handling is tested for both unit and E2E scenarios
