# 🧪 Testing Strategy - Bot Thời Gian Biểu

> **File này giải thích chiến lược testing cho project NestJS**

---

## 📋 Mục Lục
- [Testing Philosophy](#testing-philosophy)
- [Test Types](#test-types)
- [Test Structure](#test-structure)
- [Mocking Strategy](#mocking-strategy)
- [Running Tests](#running-tests)
- [Coverage Reports](#coverage-reports)
- [Best Practices](#best-practices)

---

## 🎯 Testing Philosophy

### Mục tiêu
1. **Confidence**: Tests giúp tự tin khi refactor code
2. **Documentation**: Tests là documentation sống cho code
3. **Regression Prevention**: Phát hiện bugs sớm
4. **Design Feedback**: Tests tốt = code design tốt

### Test Pyramid

```
        /\
       /  \
      / E2E \         ← Ít tests, chậm, expensive
     /______\
    /        \
   / Integration\    ← Vừa phải
  /____________\
 /              \
/   Unit Tests   \   ← Nhiều tests, nhanh, rẻ
/__________________\
```

**Tỷ lệ lý tưởng:**
- 70% Unit Tests
- 20% Integration Tests
- 10% E2E Tests

---

## 🔬 Test Types

### 1. Unit Tests

**Mục đích**: Test từng component riêng lẻ

**Ví dụ**: Test CommandRegistry

```typescript
describe('CommandRegistry', () => {
  it('should register a command by name', () => {
    const mockCommand: BotCommand = {
      name: 'test',
      description: 'Test command',
      category: 'Test',
      syntax: 'test',
      execute: jest.fn(),
    };

    registry.register(mockCommand);

    expect(registry.resolve('test')).toBe(mockCommand);
  });
});
```

**Đặc điểm:**
- ✅ Nhanh (< 1ms per test)
- ✅ Isolated (mock tất cả dependencies)
- ✅ Dễ debug
- ✅ Nhiều test cases

---

### 2. Integration Tests

**Mục đích**: Test nhiều components làm việc cùng nhau

**Ví dụ**: Test CommandRouter + CommandRegistry + Command

```typescript
describe('Command Integration', () => {
  it('should route and execute command end-to-end', async () => {
    // Setup real CommandRegistry
    const registry = new CommandRegistry();
    const command = new BatDauCommand(registry, usersService, formatter);
    
    // Register command
    command.onModuleInit();
    
    // Create router with real registry
    const router = new CommandRouter(botService, config, registry);
    
    // Test full flow
    await router.handle(message);
    
    expect(usersService.registerUser).toHaveBeenCalled();
  });
});
```

**Đặc điểm:**
- ⚠️ Chậm hơn unit tests
- ⚠️ Mock ít hơn (chỉ mock external services)
- ✅ Test real interactions
- ✅ Catch integration bugs

---

### 3. E2E Tests (End-to-End)

**Mục đích**: Test toàn bộ application flow

**Ví dụ**: Test từ message → database → reply

```typescript
describe('Bot E2E', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
  });
  
  it('should register user and reply', async () => {
    // Simulate real Mezon message
    const message = createMockMessage('*bat-dau');
    
    // Trigger bot
    await botGateway.handleMessage(message);
    
    // Verify database
    const user = await userRepository.findOne({ where: { user_id: '123' } });
    expect(user).toBeDefined();
    
    // Verify reply sent
    expect(botService.replyToMessage).toHaveBeenCalled();
  });
});
```

**Đặc điểm:**
- ❌ Rất chậm (seconds per test)
- ❌ Phức tạp setup
- ✅ Test real scenarios
- ✅ Highest confidence

---

## 📁 Test Structure

### File Organization

```
test/
├── unit/                    # Unit tests
│   ├── bot/
│   │   ├── command-registry.spec.ts
│   │   ├── command-router.spec.ts
│   │   └── commands/
│   │       ├── bat-dau.command.spec.ts
│   │       └── help.command.spec.ts
│   ├── users/
│   │   └── users.service.spec.ts
│   └── shared/
│       └── message-formatter.spec.ts
│
├── integration/             # Integration tests
│   ├── command-flow.spec.ts
│   └── user-registration.spec.ts
│
├── e2e/                     # E2E tests
│   ├── bot-commands.e2e.spec.ts
│   └── reminder-system.e2e.spec.ts
│
└── helpers/                 # Test utilities
    ├── mock-factories.ts
    └── test-utils.ts
```

### Naming Convention

- **Unit tests**: `<component>.spec.ts`
- **Integration tests**: `<feature>.spec.ts`
- **E2E tests**: `<scenario>.e2e.spec.ts`

---

## 🎭 Mocking Strategy

### 1. Mock External Services

```typescript
const mockBotService = {
  replyToMessage: jest.fn(),
  sendMessage: jest.fn(),
  sendDirectMessage: jest.fn(),
};
```

**Tại sao?**
- Không gọi Mezon API thật
- Tests chạy nhanh
- Không cần network
- Predictable results

---

### 2. Mock Database Repositories

```typescript
const mockUserRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

**Tại sao?**
- Không cần database thật
- Tests isolated
- Dễ setup test data
- Nhanh hơn nhiều

---

### 3. Mock Config Service

```typescript
const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'BOT_PREFIX') return '*';
    return defaultValue;
  }),
};
```

**Tại sao?**
- Không cần .env file
- Control test environment
- Consistent values

---

### 4. Spy on Real Methods

```typescript
it('should call internal method', () => {
  const spy = jest.spyOn(service, 'internalMethod');
  
  service.publicMethod();
  
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});
```

**Khi nào dùng?**
- Test internal method calls
- Verify method interactions
- Keep real implementation

---

## 🏃 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch

# Run specific file
npm test -- command-registry.spec.ts

# Run tests matching pattern
npm test -- --testPathPattern=bot

# Run with coverage
npm test -- --coverage

# Verbose output
npm test -- --verbose

# Run only failed tests
npm test -- --onlyFailures
```

### Debug Tests

```bash
# Debug in VS Code
# Add breakpoint → Press F5 → Select "Jest Debug"

# Debug in Chrome DevTools
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect
```

### Watch Mode Tips

```bash
# In watch mode, press:
# a - run all tests
# f - run only failed tests
# p - filter by filename pattern
# t - filter by test name pattern
# q - quit watch mode
```

---

## 📊 Coverage Reports

### Generate Coverage

```bash
npm test -- --coverage
```

### Coverage Output

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   90.12 |   84.67 |
 bot/                 |   92.15 |    85.32 |   95.45 |   91.89 |
  command-registry.ts |     100 |      100 |     100 |     100 |
  command-router.ts   |   95.67 |    89.23 |   96.78 |   95.12 |
 users/               |   88.45 |    82.15 |   91.23 |   87.89 |
  users.service.ts    |   88.45 |    82.15 |   91.23 |   87.89 |
----------------------|---------|----------|---------|---------|
```

### Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| **Critical Paths** | 100% | 100% ✅ |
| Command Registry | 100% | 100% ✅ |
| Command Router | 100% | 100% ✅ |
| **Business Logic** | 90% | 85% ⚠️ |
| Users Service | 90% | 88% ⚠️ |
| **Utilities** | 80% | 90% ✅ |
| Message Formatter | 80% | 100% ✅ |
| **Overall** | 80% | 85% ✅ |

---

## ✅ Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Bad: Testing implementation details
it('should call private method', () => {
  const spy = jest.spyOn(service as any, '_privateMethod');
  service.publicMethod();
  expect(spy).toHaveBeenCalled();
});

// ✅ Good: Testing behavior
it('should return correct result', () => {
  const result = service.publicMethod();
  expect(result).toBe(expectedValue);
});
```

---

### 2. Arrange-Act-Assert Pattern

```typescript
it('should register new user', async () => {
  // Arrange: Setup test data
  const input = { user_id: '123', username: 'test' };
  mockRepository.findOne.mockResolvedValue(null);
  mockRepository.save.mockResolvedValue(mockUser);
  
  // Act: Execute the code
  const result = await service.registerUser(input);
  
  // Assert: Verify results
  expect(result.isNew).toBe(true);
  expect(mockRepository.save).toHaveBeenCalled();
});
```

---

### 3. One Assertion Per Test (when possible)

```typescript
// ❌ Bad: Multiple unrelated assertions
it('should do everything', () => {
  expect(result.name).toBe('test');
  expect(result.age).toBe(25);
  expect(service.method).toHaveBeenCalled();
  expect(otherService.method).not.toHaveBeenCalled();
});

// ✅ Good: Focused tests
it('should set correct name', () => {
  expect(result.name).toBe('test');
});

it('should set correct age', () => {
  expect(result.age).toBe(25);
});

it('should call service method', () => {
  expect(service.method).toHaveBeenCalled();
});
```

---

### 4. Clear Test Names

```typescript
// ❌ Bad
it('test 1', () => { ... });
it('works', () => { ... });

// ✅ Good
it('should return user when user_id exists', () => { ... });
it('should throw error when user_id is invalid', () => { ... });
it('should create default settings for new user', () => { ... });
```

---

### 5. Test Edge Cases

```typescript
describe('findByUserId', () => {
  it('should return user when found', () => { ... });
  it('should return null when not found', () => { ... });
  it('should handle null user_id', () => { ... });
  it('should handle empty string user_id', () => { ... });
  it('should handle database errors', () => { ... });
});
```

---

### 6. Use beforeEach for Setup

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  
  beforeEach(async () => {
    // Setup fresh instances for each test
    const module = await Test.createTestingModule({ ... }).compile();
    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    
    // Clear mocks
    jest.clearAllMocks();
  });
  
  // Tests here
});
```

---

### 7. Don't Test Framework Code

```typescript
// ❌ Bad: Testing NestJS/TypeORM
it('should inject repository', () => {
  expect(service.repository).toBeDefined();
});

// ✅ Good: Testing your logic
it('should find user by id', async () => {
  const result = await service.findByUserId('123');
  expect(result).toBe(mockUser);
});
```

---

### 8. Mock Minimal, Test Real When Possible

```typescript
// ✅ Good: Use real CommandRegistry in tests
const registry = new CommandRegistry();
const command = new BatDauCommand(registry, mockUsersService, mockFormatter);

// Only mock external dependencies
// Don't mock simple utilities
```

---

## 🎓 Testing Patterns

### Pattern 1: Factory Functions

```typescript
// test/helpers/mock-factories.ts
export function createMockUser(overrides?: Partial<User>): User {
  return {
    user_id: '123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

// Usage in tests
const user = createMockUser({ username: 'custom' });
```

---

### Pattern 2: Test Builders

```typescript
class CommandContextBuilder {
  private context: Partial<CommandContext> = {
    prefix: '*',
    args: [],
    rawArgs: '',
  };
  
  withMessage(message: MezonChannelMessage): this {
    this.context.message = message;
    return this;
  }
  
  withArgs(args: string[]): this {
    this.context.args = args;
    return this;
  }
  
  build(): CommandContext {
    return this.context as CommandContext;
  }
}

// Usage
const ctx = new CommandContextBuilder()
  .withMessage(mockMessage)
  .withArgs(['arg1', 'arg2'])
  .build();
```

---

### Pattern 3: Custom Matchers

```typescript
expect.extend({
  toBeValidUser(received) {
    const pass = 
      received.user_id &&
      received.created_at instanceof Date;
    
    return {
      pass,
      message: () => `Expected ${received} to be a valid user`,
    };
  },
});

// Usage
expect(user).toBeValidUser();
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Tests timeout

```typescript
// Solution: Increase timeout
it('should do something', async () => {
  // ...
}, 10000); // 10 seconds

// Or globally in jest config
jest.setTimeout(10000);
```

---

### Issue 2: Mock not working

```typescript
// Problem: Mock not cleared between tests
beforeEach(() => {
  jest.clearAllMocks(); // ← Add this
});
```

---

### Issue 3: Async tests not waiting

```typescript
// ❌ Bad: Missing await
it('should save user', () => {
  service.saveUser(user); // Not awaited!
  expect(repository.save).toHaveBeenCalled();
});

// ✅ Good: Await async operations
it('should save user', async () => {
  await service.saveUser(user);
  expect(repository.save).toHaveBeenCalled();
});
```

---

### Issue 4: TypeORM repository mock

```typescript
// ✅ Correct way to mock TypeORM repository
import { getRepositoryToken } from '@nestjs/typeorm';

{
  provide: getRepositoryToken(User),
  useValue: mockRepository,
}
```

---

## 📚 Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Tools
- **Jest**: Test runner
- **@nestjs/testing**: NestJS test utilities
- **ts-jest**: TypeScript support for Jest

---

**📝 Note**: Testing là investment, không phải cost. Good tests save time trong long run!

**🔄 Last Updated**: April 2026
