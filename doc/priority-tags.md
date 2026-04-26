# 🏷️ Priority & Tags System

Hướng dẫn chi tiết về hệ thống ưu tiên và nhãn trong Bot Thời Gian Biểu.

## 📋 Tổng Quan

Hệ thống Priority & Tags giúp users:
- **Priority**: Phân loại lịch theo mức độ quan trọng (Cao/Vừa/Thấp)
- **Tags**: Gắn nhãn để phân loại theo project, team, loại công việc
- **Filtering**: Lọc và tìm kiếm lịch theo priority/tags
- **Analytics**: Thống kê theo priority và tags

## 🎯 Priority System

### 1. Priority Levels

```typescript
export type SchedulePriority = "low" | "normal" | "high";

export const SCHEDULE_PRIORITIES: readonly SchedulePriority[] = [
  "low",
  "normal", 
  "high",
] as const;

// Visual representation
const PRIORITY_ICONS = {
  low: '🟢',
  normal: '🟡', 
  high: '🔴',
};

const PRIORITY_LABELS = {
  low: 'Thấp',
  normal: 'Vừa',
  high: 'Cao',
};
```

### 2. Database Schema

```sql
-- Priority column trong schedules table
ALTER TABLE schedules ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
CREATE INDEX idx_schedules_priority ON schedules(priority);
```

### 3. Priority Utilities

```typescript
// src/shared/utils/priority.ts
export function parsePriority(input: string): SchedulePriority | null {
  const normalized = input.toLowerCase().trim();
  
  switch (normalized) {
    case 'cao':
    case 'high':
    case 'h':
      return 'high';
    case 'vua':
    case 'normal':
    case 'n':
      return 'normal';
    case 'thap':
    case 'low':
    case 'l':
      return 'low';
    default:
      return null;
  }
}

export function formatPriority(priority: SchedulePriority): string {
  const icon = PRIORITY_ICONS[priority];
  const label = PRIORITY_LABELS[priority];
  return `${icon} ${label}`;
}

export function getPriorityWeight(priority: SchedulePriority): number {
  // Để sort theo priority
  switch (priority) {
    case 'high': return 3;
    case 'normal': return 2;
    case 'low': return 1;
    default: return 2;
  }
}

export const PRIORITY_OPTIONS = [
  { value: 'low', label: '🟢 Thấp' },
  { value: 'normal', label: '🟡 Vừa' },
  { value: 'high', label: '🔴 Cao' },
];
```

### 4. Priority Filtering

```typescript
// src/schedules/schedules.service.ts
async findSchedulesByPriority(
  userId: string,
  priority: SchedulePriority,
  options: PaginationOptions = {}
): Promise<PaginatedResult<Schedule>> {
  const { page = 1, limit = 10 } = options;
  
  const [schedules, total] = await this.repository.findAndCount({
    where: {
      user_id: userId,
      priority,
      status: 'pending',
    },
    order: { start_time: 'ASC' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    data: schedules,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async getPriorityDistribution(userId: string): Promise<PriorityStats> {
  const result = await this.repository
    .createQueryBuilder('schedule')
    .select('priority', 'priority')
    .addSelect('COUNT(*)', 'count')
    .addSelect('COUNT(CASE WHEN status = \'completed\' THEN 1 END)', 'completed')
    .where('user_id = :userId', { userId })
    .groupBy('priority')
    .getRawMany();

  return {
    high: this.extractPriorityData(result, 'high'),
    normal: this.extractPriorityData(result, 'normal'),
    low: this.extractPriorityData(result, 'low'),
  };
}
```

## 🏷️ Tags System

### 1. Tag Entity

```typescript
// src/schedules/entities/tag.entity.ts
@Entity("tags")
@Index(["user_id"])
@Unique("tags_user_name_unique", ["user_id", "name"])
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string; // Luôn lowercase để case-insensitive

  @Column({ type: "varchar", length: 20, nullable: true })
  color!: string | null; // Hex color code

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @ManyToMany(() => Schedule, (schedule) => schedule.tags)
  schedules?: Schedule[];
}
```

### 2. Many-to-Many Relationship

```sql
-- Junction table cho schedule-tags relationship
CREATE TABLE schedule_tags (
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, tag_id)
);

CREATE INDEX idx_schedule_tags_schedule ON schedule_tags(schedule_id);
CREATE INDEX idx_schedule_tags_tag ON schedule_tags(tag_id);
```

### 3. Tags Service

```typescript
// src/schedules/tags.service.ts
@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async createTag(
    userId: string,
    name: string,
    color?: string
  ): Promise<Tag> {
    const normalizedName = this.normalizeName(name);
    
    // Validate name
    if (!this.isValidTagName(normalizedName)) {
      throw new Error('Tên tag không hợp lệ. Chỉ chấp nhận a-z, 0-9, -, _ và tối đa 30 ký tự.');
    }

    // Check if exists
    const existing = await this.findByName(userId, normalizedName);
    if (existing) {
      throw new Error(`Tag "${name}" đã tồn tại`);
    }

    const tag = this.tagRepository.create({
      user_id: userId,
      name: normalizedName,
      color: color || this.generateRandomColor(),
    });

    return this.tagRepository.save(tag);
  }

  async findByUser(userId: string): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { user_id: userId },
      order: { name: 'ASC' },
    });
  }

  async findByName(userId: string, name: string): Promise<Tag | null> {
    const normalizedName = this.normalizeName(name);
    return this.tagRepository.findOne({
      where: { user_id: userId, name: normalizedName },
    });
  }

  async deleteTag(userId: string, name: string): Promise<void> {
    const tag = await this.findByName(userId, name);
    if (!tag) {
      throw new Error(`Tag "${name}" không tồn tại`);
    }

    await this.tagRepository.delete(tag.id);
  }

  async addTagsToSchedule(
    scheduleId: number,
    userId: string,
    tagNames: string[]
  ): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: userId },
      relations: ['tags'],
    });

    if (!schedule) {
      throw new Error('Schedule không tồn tại');
    }

    const tags: Tag[] = [];
    
    for (const tagName of tagNames) {
      let tag = await this.findByName(userId, tagName);
      
      // Auto-create tag nếu chưa có
      if (!tag) {
        tag = await this.createTag(userId, tagName);
      }
      
      tags.push(tag);
    }

    // Merge với tags hiện có
    const existingTagIds = schedule.tags?.map(t => t.id) || [];
    const newTags = tags.filter(t => !existingTagIds.includes(t.id));
    
    schedule.tags = [...(schedule.tags || []), ...newTags];
    await this.scheduleRepository.save(schedule);
  }

  async removeTagFromSchedule(
    scheduleId: number,
    userId: string,
    tagName: string
  ): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: userId },
      relations: ['tags'],
    });

    if (!schedule) {
      throw new Error('Schedule không tồn tại');
    }

    const normalizedName = this.normalizeName(tagName);
    schedule.tags = schedule.tags?.filter(t => t.name !== normalizedName) || [];
    
    await this.scheduleRepository.save(schedule);
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim();
  }

  private isValidTagName(name: string): boolean {
    // Chỉ chấp nhận a-z, 0-9, -, _ và tối đa 30 ký tự
    return /^[a-z0-9_-]{1,30}$/.test(name);
  }

  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
```

## 📝 Commands Implementation

### 1. Tag Management Commands

```typescript
// src/bot/commands/tag.command.ts
@Injectable()
export class TagCommand implements BotCommand, OnModuleInit {
  readonly name = 'tag';
  readonly description = 'Quản lý tags';
  readonly syntax = 'tag <action> [params...]';

  async execute(ctx: CommandContext): Promise<void> {
    const [action, ...params] = ctx.args;

    switch (action) {
      case 'tao':
      case 'them':
        await this.handleCreateTag(ctx, params);
        break;
      case 'xoa':
        await this.handleDeleteTag(ctx, params);
        break;
      case 'ds':
      case 'danh-sach':
        await this.handleListTags(ctx);
        break;
      case 'gan':
        await this.handleAddTagsToSchedule(ctx, params);
        break;
      case 'go':
        await this.handleRemoveTagFromSchedule(ctx, params);
        break;
      default:
        await this.showUsage(ctx);
    }
  }

  private async handleCreateTag(ctx: CommandContext, params: string[]): Promise<void> {
    const [name, color] = params;
    
    if (!name) {
      await ctx.reply('❌ Cú pháp: `*tag tao <tên> [#màu]`');
      return;
    }

    try {
      const tag = await this.tagsService.createTag(
        ctx.message.sender_id,
        name,
        color
      );

      await ctx.reply([
        `✅ Đã tạo tag "${tag.name}"`,
        `🎨 Màu: ${tag.color}`,
        ``,
        `Sử dụng: \`*tag gan <ID> ${tag.name}\``,
      ].join('\n'));
    } catch (error) {
      await ctx.reply(`❌ ${error.message}`);
    }
  }

  private async handleAddTagsToSchedule(ctx: CommandContext, params: string[]): Promise<void> {
    const [scheduleIdStr, ...tagNames] = params;
    const scheduleId = parseInt(scheduleIdStr);

    if (!scheduleId || tagNames.length === 0) {
      await ctx.reply('❌ Cú pháp: `*tag gan <ID> <tag1> [tag2] [...]`');
      return;
    }

    try {
      await this.tagsService.addTagsToSchedule(
        scheduleId,
        ctx.message.sender_id,
        tagNames
      );

      await ctx.reply([
        `✅ Đã gắn tag cho lịch #${scheduleId}`,
        `🏷️ Tags: ${tagNames.map(t => `\`${t}\``).join(', ')}`,
      ].join('\n'));
    } catch (error) {
      await ctx.reply(`❌ ${error.message}`);
    }
  }
}
```

### 2. Priority Filter Commands

```typescript
// Trong các command xem lịch, thêm support cho --uutien flag
private parsePriorityFilter(args: string[]): SchedulePriority | null {
  const priorityIndex = args.findIndex(arg => arg === '--uutien');
  
  if (priorityIndex >= 0 && args[priorityIndex + 1]) {
    return parsePriority(args[priorityIndex + 1]);
  }
  
  return null;
}

// Ví dụ trong sap-toi command
async execute(ctx: CommandContext): Promise<void> {
  const priorityFilter = this.parsePriorityFilter(ctx.args);
  
  const schedules = await this.schedulesService.findUpcoming(
    ctx.message.sender_id,
    { limit: 5, priorityFilter }
  );
  
  // Format và gửi response
}
```

### 3. Tag-based Schedule Listing

```typescript
// src/bot/commands/lich-tag.command.ts
@Injectable()
export class LichTagCommand implements BotCommand, OnModuleInit {
  readonly name = 'lich-tag';
  readonly description = 'Xem lịch theo tag';
  readonly syntax = 'lich-tag <tag_name> [--cho]';

  async execute(ctx: CommandContext): Promise<void> {
    const [tagName, ...flags] = ctx.args;
    
    if (!tagName) {
      await ctx.reply('❌ Cú pháp: `*lich-tag <tag_name> [--cho]`');
      return;
    }

    const pendingOnly = flags.includes('--cho');
    
    try {
      const schedules = await this.schedulesService.findByTag(
        ctx.message.sender_id,
        tagName,
        { pendingOnly }
      );

      if (schedules.length === 0) {
        await ctx.reply(`📭 Không có lịch nào với tag "${tagName}"`);
        return;
      }

      const message = this.messageFormatter.formatScheduleList(
        schedules,
        `🏷️ Lịch với tag "${tagName}"`
      );

      await ctx.reply(message);
    } catch (error) {
      await ctx.reply(`❌ ${error.message}`);
    }
  }
}
```

## 📊 Analytics & Statistics

### 1. Priority Analytics

```typescript
// src/schedules/schedules.service.ts
async getPriorityAnalytics(
  userId: string,
  dateRange?: { start: Date; end: Date }
): Promise<PriorityAnalytics> {
  let query = this.repository
    .createQueryBuilder('schedule')
    .where('user_id = :userId', { userId });

  if (dateRange) {
    query = query.andWhere(
      'start_time BETWEEN :start AND :end',
      dateRange
    );
  }

  const [distribution, completionRates, avgTimeToComplete] = await Promise.all([
    // Priority distribution
    query
      .clone()
      .select('priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('priority')
      .getRawMany(),

    // Completion rates by priority
    query
      .clone()
      .select('priority', 'priority')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN status = \'completed\' THEN 1 END)', 'completed')
      .groupBy('priority')
      .getRawMany(),

    // Average time to complete by priority
    query
      .clone()
      .select('priority', 'priority')
      .addSelect('AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)', 'avg_hours')
      .where('status = :status', { status: 'completed' })
      .groupBy('priority')
      .getRawMany(),
  ]);

  return {
    distribution: this.formatPriorityDistribution(distribution),
    completionRates: this.formatCompletionRates(completionRates),
    avgTimeToComplete: this.formatAvgTimeToComplete(avgTimeToComplete),
  };
}
```

### 2. Tag Analytics

```typescript
async getTagAnalytics(userId: string): Promise<TagAnalytics> {
  const [tagUsage, tagPerformance] = await Promise.all([
    // Tag usage frequency
    this.repository
      .createQueryBuilder('schedule')
      .leftJoin('schedule.tags', 'tag')
      .select('tag.name', 'tag_name')
      .addSelect('tag.color', 'tag_color')
      .addSelect('COUNT(schedule.id)', 'usage_count')
      .where('schedule.user_id = :userId', { userId })
      .groupBy('tag.id, tag.name, tag.color')
      .orderBy('usage_count', 'DESC')
      .limit(10)
      .getRawMany(),

    // Tag completion performance
    this.repository
      .createQueryBuilder('schedule')
      .leftJoin('schedule.tags', 'tag')
      .select('tag.name', 'tag_name')
      .addSelect('COUNT(*)', 'total')
      .addSelect('COUNT(CASE WHEN schedule.status = \'completed\' THEN 1 END)', 'completed')
      .where('schedule.user_id = :userId', { userId })
      .groupBy('tag.name')
      .having('COUNT(*) >= 3') // Chỉ tag có ít nhất 3 lịch
      .getRawMany(),
  ]);

  return {
    mostUsedTags: tagUsage.map(t => ({
      name: t.tag_name,
      color: t.tag_color,
      count: parseInt(t.usage_count),
    })),
    tagPerformance: tagPerformance.map(t => ({
      name: t.tag_name,
      total: parseInt(t.total),
      completed: parseInt(t.completed),
      completionRate: (parseInt(t.completed) / parseInt(t.total)) * 100,
    })),
  };
}
```

### 3. Combined Priority-Tag Analytics

```typescript
async getCombinedAnalytics(userId: string): Promise<CombinedAnalytics> {
  // Phân tích cross-tabulation giữa priority và tags
  const result = await this.repository
    .createQueryBuilder('schedule')
    .leftJoin('schedule.tags', 'tag')
    .select('schedule.priority', 'priority')
    .addSelect('tag.name', 'tag_name')
    .addSelect('COUNT(*)', 'count')
    .addSelect('COUNT(CASE WHEN schedule.status = \'completed\' THEN 1 END)', 'completed')
    .where('schedule.user_id = :userId', { userId })
    .groupBy('schedule.priority, tag.name')
    .getRawMany();

  return this.formatCombinedAnalytics(result);
}
```

## 🎨 UI/UX Enhancements

### 1. Visual Priority Indicators

```typescript
// src/shared/utils/message-formatter.ts
formatScheduleWithPriority(schedule: Schedule): string {
  const priorityIcon = PRIORITY_ICONS[schedule.priority];
  const timeStr = this.dateParser.formatVietnam(schedule.start_time);
  
  return [
    `${priorityIcon} **${schedule.title}**`,
    `⏰ ${timeStr}`,
    schedule.tags?.length ? `🏷️ ${schedule.tags.map(t => `\`${t.name}\``).join(' ')}` : '',
  ].filter(Boolean).join('\n');
}
```

### 2. Tag Color Display

```typescript
formatTagWithColor(tag: Tag): string {
  const colorEmoji = this.getColorEmoji(tag.color);
  return `${colorEmoji} \`${tag.name}\``;
}

private getColorEmoji(hexColor: string): string {
  // Map hex colors to closest emoji
  const colorMap: Record<string, string> = {
    '#FF6B6B': '🔴',
    '#4ECDC4': '🟢', 
    '#45B7D1': '🔵',
    '#96CEB4': '🟢',
    '#FFEAA7': '🟡',
    // ... more mappings
  };
  
  return colorMap[hexColor] || '⚪';
}
```

### 3. Smart Filtering UI

```typescript
// Interactive filter builder
const filterEmbed = new InteractiveBuilder('🔍 Lọc Lịch')
  .addSelectField(
    'priority',
    '⚡ Ưu tiên',
    [
      { value: 'all', label: 'Tất cả' },
      ...PRIORITY_OPTIONS
    ],
    'all'
  )
  .addSelectField(
    'tags',
    '🏷️ Tags',
    await this.getTagOptions(userId),
    'all',
    'Chọn nhiều tag'
  )
  .addSelectField(
    'status',
    '📊 Trạng thái',
    [
      { value: 'all', label: 'Tất cả' },
      { value: 'pending', label: 'Đang chờ' },
      { value: 'completed', label: 'Hoàn thành' },
    ],
    'pending'
  )
  .build();
```

## 🔧 Advanced Features

### 1. Tag Hierarchies

```typescript
// Support for nested tags: project/frontend, project/backend
interface TagHierarchy {
  parent: string;
  children: string[];
}

function parseHierarchicalTag(tagName: string): TagHierarchy | null {
  const parts = tagName.split('/');
  if (parts.length < 2) return null;
  
  return {
    parent: parts[0],
    children: parts.slice(1),
  };
}
```

### 2. Smart Tag Suggestions

```typescript
async suggestTags(userId: string, scheduleTitle: string): Promise<string[]> {
  // Analyze title keywords và suggest relevant tags
  const keywords = this.extractKeywords(scheduleTitle);
  const userTags = await this.tagsService.findByUser(userId);
  
  return userTags
    .filter(tag => keywords.some(keyword => 
      tag.name.includes(keyword) || keyword.includes(tag.name)
    ))
    .map(tag => tag.name)
    .slice(0, 3); // Top 3 suggestions
}
```

### 3. Priority Auto-Assignment

```typescript
async suggestPriority(schedule: Partial<Schedule>): Promise<SchedulePriority> {
  // ML-based priority suggestion dựa trên:
  // - Keywords trong title/description
  // - Time until start_time
  // - User's historical patterns
  
  const urgencyScore = this.calculateUrgencyScore(schedule);
  const importanceScore = this.calculateImportanceScore(schedule);
  
  const totalScore = urgencyScore + importanceScore;
  
  if (totalScore >= 8) return 'high';
  if (totalScore >= 5) return 'normal';
  return 'low';
}
```

---

**Hệ thống Priority & Tags này giúp users organize và manage lịch trình hiệu quả với flexibility cao và insights valuable.**