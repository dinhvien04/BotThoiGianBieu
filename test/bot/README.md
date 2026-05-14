# 🧪 Test Suite - Bot Thời Gian Biểu

## Cấu trúc Test

```
test/
├── bot/                          # Tests cho Bot module
│   ├── command-registry.spec.ts  # Test CommandRegistry
│   ├── command-router.spec.ts    # Test CommandRouter
│   └── bat-dau.command.spec.ts   # Test BatDauCommand
├── users/                        # Tests cho Users module
│   └── users.service.spec.ts     # Test UsersService
├── shared/                       # Tests cho Shared utilities
│   └── message-formatter.spec.ts # Test MessageFormatter
└── README.md                     # File này

```

## Chạy Tests

### Chạy tất cả tests
```bash
npm test
```

### Chạy tests với watch mode
```bash
npm test -- --watch
```

### Chạy tests với coverage
```bash
npm test -- --coverage
```

### Chạy một test file cụ thể
```bash
npm test -- command-registry.spec.ts
```

### Chạy tests theo pattern
```bash
npm test -- --testPathPattern=bot
```

## Test Coverage

### Modules đã có tests:

#### ✅ Bot Module
- **CommandRegistry** (100% coverage)
  - Register commands
  - Resolve commands by name/alias
  - Case-insensitive lookup
  - Duplicate handling
  - Get all commands

- **CommandRouter** (100% coverage)
  - Parse messages with prefix
  - Route to correct command
  - Parse arguments
  - Error handling
  - Context helpers (reply, send, sendDM)

- **BatDauCommand** (100% coverage)
  - Register new users
  - Handle existing users
  - Format welcome messages
  - Error propagation

#### ✅ Users Module
- **UsersService** (100% coverage)
  - Find user by ID
  - Register new user
  - Handle existing user
  - Create user settings
  - Handle null values

#### ✅ Shared Module
- **MessageFormatter** (100% coverage)
  - Format welcome messages
  - Format help messages
  - Format not initialized messages
  - Handle null values
  - Category grouping

### Modules chưa có tests:
- [ ] ScheduleService
- [ ] ReminderService
- [ ] HelpCommand
- [ ] Other commands (them-lich, lich-hom-nay, etc.)
- [ ] BotService
- [ ] BotGateway

## Viết Tests Mới

### Template cho Command Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourCommand } from 'src/bot/commands/your.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { CommandContext } from 'src/bot/commands/command.types';

describe('YourCommand', () => {
  let command: YourCommand;
  let registry: CommandRegistry;

  const mockRegistry = {
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        // Add other dependencies
      ],
    }).compile();

    command = module.get<YourCommand>(YourCommand);
    registry = module.get<CommandRegistry>(CommandRegistry);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  describe('execute', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: '123',
          channel_id: '456',
          sender_id: '789',
          content: { t: '*your-command' },
        },
        args: [],
        rawArgs: '',
        prefix: '*',
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
      };
    });

    it('should execute successfully', async () => {
      // Your test here
    });
  });
});
```

### Template cho Service Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YourService } from 'src/your-module/your.service';
import { YourEntity } from 'src/your-module/entities/your.entity';

describe('YourService', () => {
  let service: YourService;
  let repository: Repository<YourEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        {
          provide: getRepositoryToken(YourEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<YourService>(YourService);
    repository = module.get<Repository<YourEntity>>(getRepositoryToken(YourEntity));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Your tests here
});
```

## Best Practices

### 1. **Arrange-Act-Assert Pattern**
```typescript
it('should do something', async () => {
  // Arrange: Setup test data
  const input = { ... };
  mockService.method.mockResolvedValue(expectedOutput);

  // Act: Execute the code
  const result = await service.doSomething(input);

  // Assert: Verify results
  expect(result).toBe(expectedOutput);
  expect(mockService.method).toHaveBeenCalledWith(input);
});
```

### 2. **Mock External Dependencies**
- Mock tất cả dependencies (services, repositories)
- Không gọi database thật trong unit tests
- Sử dụng `jest.fn()` cho functions
- Sử dụng mock objects cho services

### 3. **Test Edge Cases**
- Null/undefined values
- Empty arrays/strings
- Invalid input
- Error scenarios
- Boundary conditions

### 4. **Clear Test Names**
```typescript
// ❌ Bad
it('test 1', () => { ... });

// ✅ Good
it('should return user when user_id exists', () => { ... });
it('should throw error when user_id is invalid', () => { ... });
```

### 5. **Use beforeEach for Setup**
```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Clear mock calls between tests
  // Setup common test data
});
```

### 6. **Test One Thing at a Time**
```typescript
// ❌ Bad: Testing multiple things
it('should create user and send email and log event', () => { ... });

// ✅ Good: Separate tests
it('should create user successfully', () => { ... });
it('should send welcome email after user creation', () => { ... });
it('should log user creation event', () => { ... });
```

## Debugging Tests

### Run tests in debug mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### View detailed error messages
```bash
npm test -- --verbose
```

### Run only failed tests
```bash
npm test -- --onlyFailures
```

## CI/CD Integration

Tests sẽ tự động chạy trong CI/CD pipeline:
- Pre-commit hook (nếu có)
- Pull request checks
- Before deployment

## Coverage Goals

- **Target**: 80% coverage minimum
- **Critical paths**: 100% coverage
  - Command routing
  - User registration
  - Database operations
  - Error handling

## Troubleshooting

### Test timeout
```typescript
it('should do something', async () => {
  // ...
}, 10000); // Increase timeout to 10 seconds
```

### Mock not working
```typescript
// Make sure to clear mocks
beforeEach(() => {
  jest.clearAllMocks();
});

// Or reset mocks
beforeEach(() => {
  jest.resetAllMocks();
});
```

### TypeORM repository mock
```typescript
// Use getRepositoryToken
import { getRepositoryToken } from '@nestjs/typeorm';

{
  provide: getRepositoryToken(YourEntity),
  useValue: mockRepository,
}
```

---

**📝 Note**: Khi thêm features mới, nhớ viết tests trước hoặc ngay sau khi implement (TDD/BDD approach).

**🔄 Last Updated**: April 2026
