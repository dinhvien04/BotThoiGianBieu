# 🔄 Luồng Hoạt Động Code NestJS - Bot Thời Gian Biểu

> **File này giải thích luồng hoạt động thực tế của code NestJS** dựa trên source code hiện tại của project.

---

## 📋 Mục Lục
- [Khởi động Application](#khởi-động-application)
- [Dependency Injection Flow](#dependency-injection-flow)
- [Command Processing Flow](#command-processing-flow)
- [Ví dụ: Lệnh *bat-dau](#ví-dụ-lệnh-bat-dau)
- [Database Operations](#database-operations)
- [Error Handling](#error-handling)

---

## 🚀 Khởi động Application

### 1. Entry Point: `src/main.ts`

```typescript
async function bootstrap(): Promise<void> {
  // 1. Tạo NestJS Application Context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  
  // 2. Setup graceful shutdown
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // 3. Application đã sẵn sàng
  logger.log('🤖 Bot Thời Gian Biểu đã khởi động');
}
```

**Luồng:**
```
npm start
    ↓
main.ts: bootstrap()
    ↓
NestFactory.createApplicationContext(AppModule)
    ↓
Load tất cả modules theo dependency tree
    ↓
Khởi tạo tất cả providers (services, commands, etc.)
    ↓
Gọi lifecycle hooks (OnModuleInit)
    ↓
Application ready ✅
```

---

## 🏗️ Dependency Injection Flow

### Module Hierarchy

```
AppModule (Root)
├── ConfigModule.forRoot() ← Load .env variables
├── TypeOrmModule.forRootAsync() ← Database connection
├── ScheduleModule.forRoot() ← Cron jobs support
├── SharedModule
│   └── MessageFormatter (Injectable)
├── UsersModule
│   ├── TypeOrmModule.forFeature([User, UserSettings])
│   └── UsersService (Injectable)
└── BotModule
    ├── imports: [SharedModule, UsersModule]
    └── providers:
        ├── BotService (Injectable)
        ├── CommandRegistry (Injectable)
        ├── CommandRouter (Injectable)
        ├── BotGateway (Injectable, OnModuleInit)
        ├── HelpCommand (Injectable, OnModuleInit)
        └── BatDauCommand (Injectable, OnModuleInit)
```

### Dependency Resolution

**Ví dụ: BatDauCommand cần gì?**

```typescript
@Injectable()
export class BatDauCommand implements OnModuleInit {
  constructor(
    private readonly registry: CommandRegistry,    // ← Inject từ BotModule
    private readonly usersService: UsersService,   // ← Inject từ UsersModule (exported)
    private readonly formatter: MessageFormatter,  // ← Inject từ SharedModule (exported)
  ) {}
}
```

**NestJS tự động resolve:**
```
BatDauCommand cần:
  ├── CommandRegistry → Có trong BotModule ✅
  ├── UsersService → UsersModule exports nó ✅
  └── MessageFormatter → SharedModule exports nó ✅

→ NestJS inject tất cả dependencies vào constructor
→ BatDauCommand ready to use
```

---

## 🎯 Command Processing Flow

### Tổng quan luồng xử lý message

```
User gửi message "*bat-dau" trên Mezon
         ↓
Mezon Server → WebSocket → MezonClient (SDK)
         ↓
MezonClient.onChannelMessage(event)
         ↓
BotGateway.onModuleInit() đã đăng ký listener
         ↓
CommandRouter.handle(message)
         ↓
Parse & route đến command tương ứng
         ↓
BatDauCommand.execute(ctx)
         ↓
UsersService.registerUser()
         ↓
TypeORM → PostgreSQL
         ↓
MessageFormatter.formatWelcome()
         ↓
ctx.reply() → BotService.replyToMessage()
         ↓
MezonClient.send() → Mezon Server
         ↓
User nhận được reply ✅
```

---

## 📝 Chi tiết từng bước

### Bước 1: BotGateway khởi tạo (OnModuleInit)

**File:** `src/bot/bot.gateway.ts`

```typescript
@Injectable()
export class BotGateway implements OnModuleInit {
  constructor(
    private readonly botService: BotService,
    private readonly commandRouter: CommandRouter,
  ) {}

  async onModuleInit(): Promise<void> {
    // 1. Khởi tạo MezonClient
    await this.botService.initialize();
    
    // 2. Đăng ký event listener
    this.botService.client.onChannelMessage(async (event: unknown) => {
      const message = event as MezonChannelMessage;
      
      try {
        // 3. Gọi CommandRouter để xử lý
        await this.commandRouter.handle(message);
      } catch (err) {
        this.logger.error(`Lỗi: ${err.message}`);
      }
    });
    
    this.logger.log('🎧 Bot đang lắng nghe lệnh');
  }
}
```

**Luồng:**
```
NestJS khởi động
    ↓
BotModule được load
    ↓
BotGateway được instantiate
    ↓
NestJS gọi onModuleInit() lifecycle hook
    ↓
BotService.initialize() → MezonClient.login()
    ↓
Đăng ký listener: onChannelMessage
    ↓
Bot sẵn sàng nhận message ✅
```

---

### Bước 2: CommandRouter xử lý message

**File:** `src/bot/commands/command-router.ts`

```typescript
async handle(message: MezonChannelMessage): Promise<void> {
  // 1. Lấy text từ message
  const text = message.content?.t?.trim();
  if (!text || !text.startsWith(this.prefix)) {
    return; // Không phải command, bỏ qua
  }

  // 2. Bỏ prefix (vd: "*bat-dau" → "bat-dau")
  const withoutPrefix = text.slice(this.prefix.length).trim();
  if (!withoutPrefix) return;

  // 3. Tách command name và args
  const [head, ...rest] = withoutPrefix.split(/\s+/);
  // head = "bat-dau"
  // rest = [] (không có args)

  // 4. Tìm command trong registry
  const command = this.registry.resolve(head);
  if (!command) {
    return; // Command không tồn tại, bỏ qua
  }

  // 5. Build context object
  const rawArgs = withoutPrefix.slice(head.length).trim();
  const ctx = this.buildContext(message, rest, rawArgs);

  // 6. Execute command
  try {
    this.logger.debug(`▶ ${command.name} từ ${message.sender_id}`);
    await command.execute(ctx);
  } catch (err) {
    // Error handling
    await ctx.reply(`❌ Có lỗi xảy ra: ${err.message}`);
  }
}
```

**Luồng parse command:**
```
Input: "*bat-dau"
    ↓
Check prefix: "*" ✅
    ↓
Remove prefix: "bat-dau"
    ↓
Split by whitespace: ["bat-dau"]
    ↓
head = "bat-dau"
rest = []
    ↓
registry.resolve("bat-dau") → BatDauCommand instance
    ↓
Build CommandContext
    ↓
command.execute(ctx)
```

---

### Bước 3: CommandRegistry resolve command

**File:** `src/bot/commands/command-registry.ts`

```typescript
@Injectable()
export class CommandRegistry {
  private readonly byName = new Map<string, BotCommand>();
  private readonly commands: BotCommand[] = [];

  register(command: BotCommand): void {
    const names = [command.name, ...(command.aliases ?? [])];
    for (const n of names) {
      const key = n.toLowerCase();
      this.byName.set(key, command);
    }
    this.commands.push(command);
  }

  resolve(name: string): BotCommand | undefined {
    return this.byName.get(name.toLowerCase());
  }
}
```

**Cách commands được đăng ký:**

```typescript
@Injectable()
export class BatDauCommand implements OnModuleInit {
  readonly name = 'bat-dau';
  readonly aliases = ['batdau', 'start'];
  
  constructor(private readonly registry: CommandRegistry) {}
  
  onModuleInit(): void {
    // Tự đăng ký vào registry khi module init
    this.registry.register(this);
  }
}
```

**Luồng đăng ký:**
```
NestJS khởi động
    ↓
BatDauCommand được instantiate
    ↓
NestJS gọi onModuleInit()
    ↓
this.registry.register(this)
    ↓
Registry lưu:
  byName.set("bat-dau", BatDauCommand)
  byName.set("batdau", BatDauCommand)
  byName.set("start", BatDauCommand)
    ↓
Command sẵn sàng được gọi ✅
```

---

## 🎯 Ví dụ: Lệnh *bat-dau

### Full Flow từ đầu đến cuối

```
User: "*bat-dau"
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Mezon Server → WebSocket → MezonClient              │
│    event = {                                            │
│      message_id: "123",                                 │
│      channel_id: "456",                                 │
│      sender_id: "789",                                  │
│      content: { t: "*bat-dau" }                         │
│    }                                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. BotGateway.onChannelMessage listener                │
│    await commandRouter.handle(message)                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. CommandRouter.handle()                               │
│    - text = "*bat-dau"                                  │
│    - Check prefix: "*" ✅                               │
│    - withoutPrefix = "bat-dau"                          │
│    - head = "bat-dau", rest = []                        │
│    - command = registry.resolve("bat-dau")              │
│      → BatDauCommand instance                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Build CommandContext                                 │
│    ctx = {                                              │
│      message: {...},                                    │
│      args: [],                                          │
│      rawArgs: "",                                       │
│      prefix: "*",                                       │
│      reply: (text) => botService.replyToMessage(...),   │
│      send: (text) => botService.sendMessage(...),       │
│      sendDM: (text) => botService.sendDirectMessage(...)│
│    }                                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. BatDauCommand.execute(ctx)                           │
│    const { message } = ctx;                             │
│                                                         │
│    const result = await usersService.registerUser({    │
│      user_id: message.sender_id,                        │
│      username: message.username,                        │
│      display_name: message.display_name,                │
│      default_channel_id: message.channel_id             │
│    });                                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. UsersService.registerUser()                          │
│    - Check existing user:                               │
│      const existing = await userRepository.findOne({    │
│        where: { user_id: "789" },                       │
│        relations: ['settings']                          │
│      });                                                │
│                                                         │
│    - If NOT exists:                                     │
│      • Create User entity                               │
│      • Save to database                                 │
│      • Create UserSettings entity                       │
│      • Save to database                                 │
│      • Return { user, settings, isNew: true }           │
│                                                         │
│    - If exists:                                         │
│      • Return { user, settings, isNew: false }          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. TypeORM → PostgreSQL                                │
│                                                         │
│    INSERT INTO users (user_id, username, display_name)  │
│    VALUES ('789', 'john', 'John Doe');                  │
│                                                         │
│    INSERT INTO user_settings (                          │
│      user_id, timezone, default_remind_minutes,         │
│      default_channel_id, notify_via_dm                  │
│    ) VALUES (                                           │
│      '789', 'Asia/Ho_Chi_Minh', 30, '456', false        │
│    );                                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Back to BatDauCommand.execute()                      │
│    const reply = formatter.formatWelcome(               │
│      result.user,                                       │
│      result.settings,                                   │
│      result.isNew,                                      │
│      ctx.prefix                                         │
│    );                                                   │
│                                                         │
│    reply = "🎉 Xin chào John Doe! ..."                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Send reply                                           │
│    await ctx.reply(reply);                              │
│      ↓                                                  │
│    botService.replyToMessage(                           │
│      channelId: "456",                                  │
│      messageId: "123",                                  │
│      text: "🎉 Xin chào John Doe! ..."                 │
│    )                                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 10. BotService.replyToMessage()                         │
│     const channel = await client.channels.fetch("456"); │
│     const message = await channel.messages.fetch("123");│
│     await message.reply({ t: "🎉 Xin chào..." });      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 11. MezonClient → Mezon Server → User                  │
│     User nhận được reply message ✅                     │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Database Operations

### TypeORM Repository Pattern

**Entity Definition:**
```typescript
@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username!: string | null;

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings?: UserSettings;
}
```

**Repository Injection:**
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
}
```

**CRUD Operations:**

```typescript
// 1. Find with relations
const user = await this.userRepository.findOne({
  where: { user_id: userId },
  relations: ['settings'], // JOIN với user_settings
});

// 2. Create entity
const user = this.userRepository.create({
  user_id: '789',
  username: 'john',
  display_name: 'John Doe',
});

// 3. Save to database
await this.userRepository.save(user);
// → TypeORM generates: INSERT INTO users ...

// 4. Update
await this.userRepository.update(
  { user_id: '789' },
  { username: 'john_updated' }
);
// → TypeORM generates: UPDATE users SET username = ... WHERE user_id = ...

// 5. Delete
await this.userRepository.delete({ user_id: '789' });
// → TypeORM generates: DELETE FROM users WHERE user_id = ...
```

**TypeORM tự động:**
- Generate SQL queries
- Handle connections
- Map results to entities
- Manage transactions
- Handle relations (JOIN)

---

## 🎨 CommandContext Pattern

### Context Object

```typescript
interface CommandContext {
  message: MezonChannelMessage;  // Original message
  rawArgs: string;               // Raw text after command
  args: string[];                // Parsed arguments
  prefix: string;                // Bot prefix ("*")
  
  // Helper methods
  reply(text: string): Promise<void>;   // Reply với quote
  send(text: string): Promise<void>;    // Send message mới
  sendDM(text: string): Promise<void>;  // Send DM
}
```

**Tại sao dùng Context?**

1. **Abstraction**: Command không cần biết chi tiết BotService
2. **Testability**: Dễ mock context trong tests
3. **Flexibility**: Thêm methods mới không ảnh hưởng commands
4. **Clean API**: Commands chỉ cần `ctx.reply()` thay vì `botService.replyToMessage(channelId, messageId, text)`

**Ví dụ sử dụng:**

```typescript
async execute(ctx: CommandContext): Promise<void> {
  // Lấy thông tin từ message
  const userId = ctx.message.sender_id;
  const channelId = ctx.message.channel_id;
  
  // Parse arguments
  if (ctx.args.length === 0) {
    await ctx.reply('❌ Thiếu tham số!');
    return;
  }
  
  // Business logic
  const result = await this.someService.doSomething();
  
  // Send response
  await ctx.reply(`✅ Thành công: ${result}`);
}
```

---

## ⚠️ Error Handling

### Hierarchy

```
CommandRouter.handle()
    ↓
try {
  await command.execute(ctx)
} catch (err) {
  // 1. Log error
  logger.error(`Lỗi: ${err.message}`, err.stack);
  
  // 2. Send user-friendly message
  await ctx.reply(`❌ Có lỗi xảy ra: ${err.message}`);
}
```

**Trong Command:**

```typescript
async execute(ctx: CommandContext): Promise<void> {
  // Validation errors
  if (!ctx.args[0]) {
    throw new Error('Thiếu tham số ID');
  }
  
  // Business logic errors
  const user = await this.usersService.findByUserId(userId);
  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }
  
  // Database errors tự động throw
  await this.repository.save(entity);
}
```

**Error Flow:**
```
Command throws Error
    ↓
CommandRouter catch
    ↓
Log to console/file
    ↓
Send error message to user
    ↓
User sees friendly error ❌
```

---

## 🔄 Lifecycle Hooks

### OnModuleInit

**Khi nào được gọi:**
```
NestJS khởi động
    ↓
Load all modules
    ↓
Instantiate all providers
    ↓
Resolve all dependencies
    ↓
Call onModuleInit() on each provider
    ↓
Application ready
```

**Sử dụng:**

```typescript
@Injectable()
export class BatDauCommand implements OnModuleInit {
  constructor(private readonly registry: CommandRegistry) {}
  
  onModuleInit(): void {
    // Đăng ký command vào registry
    this.registry.register(this);
  }
}
```

**Tại sao không đăng ký trong constructor?**
- Constructor chỉ nên assign dependencies
- onModuleInit đảm bảo tất cả dependencies đã ready
- Tách biệt initialization logic

---

## 📊 Tổng kết: Full Stack Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER LAYER                           │
│  User gửi message "*bat-dau" trên Mezon app            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 MEZON PLATFORM                          │
│  Mezon Server → WebSocket → MezonClient (SDK)          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PRESENTATION LAYER                         │
│  BotGateway (Event Listener)                            │
│    ↓                                                    │
│  CommandRouter (Parse & Route)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              APPLICATION LAYER                          │
│  BatDauCommand (Business Logic)                         │
│    ↓                                                    │
│  UsersService (Domain Logic)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│               DATA ACCESS LAYER                         │
│  TypeORM Repository                                     │
│    ↓                                                    │
│  User Entity, UserSettings Entity                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                DATABASE LAYER                           │
│  PostgreSQL (Neon)                                      │
│  - users table                                          │
│  - user_settings table                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### 1. **Dependency Injection**
- NestJS tự động resolve dependencies
- Providers được inject qua constructor
- Modules export providers để share

### 2. **Command Pattern**
- Mỗi command là một class riêng
- Implement interface `BotCommand`
- Tự đăng ký vào `CommandRegistry` qua `OnModuleInit`

### 3. **Repository Pattern**
- TypeORM repositories inject qua `@InjectRepository()`
- CRUD operations qua repository methods
- TypeORM tự động generate SQL

### 4. **Context Pattern**
- `CommandContext` abstract away bot service details
- Commands chỉ cần `ctx.reply()`, `ctx.send()`
- Dễ test, dễ maintain

### 5. **Lifecycle Hooks**
- `OnModuleInit`: Setup sau khi dependencies ready
- `OnModuleDestroy`: Cleanup trước khi shutdown

### 6. **Error Handling**
- Commands throw errors
- Router catch và send user-friendly messages
- Centralized error handling

---

**📝 Note**: File này được tạo dựa trên source code thực tế của project. Khi code thay đổi, cần update file này cho đồng bộ.

**🔄 Last Updated**: April 2026
