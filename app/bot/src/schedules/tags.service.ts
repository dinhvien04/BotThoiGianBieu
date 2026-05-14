import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Schedule } from "./entities/schedule.entity";
import { Tag } from "./entities/tag.entity";

const TAG_NAME_REGEX = /^[a-z0-9_-]+$/;
const MAX_TAG_LENGTH = 30;

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  /**
   * Chuẩn hoá tên tag: lowercase + trim. Trả `null` nếu rỗng hoặc
   * không match regex `[a-z0-9_-]+`.
   */
  normalize(name: string): string | null {
    const trimmed = (name ?? "").trim().toLowerCase();
    if (!trimmed || trimmed.length > MAX_TAG_LENGTH) return null;
    if (!TAG_NAME_REGEX.test(trimmed)) return null;
    return trimmed;
  }

  async listForUser(userId: string): Promise<Tag[]> {
    return this.tagRepository.find({
      where: { user_id: userId },
      order: { name: "ASC" },
    });
  }

  async findByName(userId: string, name: string): Promise<Tag | null> {
    const normalized = this.normalize(name);
    if (!normalized) return null;
    return this.tagRepository.findOne({
      where: { user_id: userId, name: normalized },
    });
  }

  /**
   * Tạo tag nếu chưa có; trả tag (mới hoặc đã tồn tại). Tên đã được
   * normalize trước khi gọi (caller phải kiểm tra null).
   */
  async findOrCreate(userId: string, name: string): Promise<Tag | null> {
    const normalized = this.normalize(name);
    if (!normalized) return null;

    const existing = await this.tagRepository.findOne({
      where: { user_id: userId, name: normalized },
    });
    if (existing) return existing;

    const tag = this.tagRepository.create({
      user_id: userId,
      name: normalized,
    });
    return this.tagRepository.save(tag);
  }

  /**
   * Tạo tag (nếu chưa có) — alias cho `findOrCreate`. Trả `created`
   * flag để command layer biết đây là tạo mới hay no-op.
   */
  async create(
    userId: string,
    name: string,
  ): Promise<{ tag: Tag; created: boolean } | null> {
    const normalized = this.normalize(name);
    if (!normalized) return null;

    const existing = await this.tagRepository.findOne({
      where: { user_id: userId, name: normalized },
    });
    if (existing) return { tag: existing, created: false };

    const tag = await this.tagRepository.save(
      this.tagRepository.create({ user_id: userId, name: normalized }),
    );
    return { tag, created: true };
  }

  /**
   * Xoá tag và mọi liên kết schedule_tags. Trả `true` nếu xoá thành công.
   * Cascade qua FK (`ON DELETE CASCADE` ở migration).
   */
  async deleteByName(userId: string, name: string): Promise<boolean> {
    const normalized = this.normalize(name);
    if (!normalized) return false;
    const result = await this.tagRepository.delete({
      user_id: userId,
      name: normalized,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Gắn `tagNames[]` vào schedule, auto-tạo tag mới nếu chưa có. Trả
   * danh sách tag đã được attach (sau khi merge với existing).
   * Nếu schedule không tồn tại / user_id mismatch → trả null.
   */
  async attachTags(
    userId: string,
    scheduleId: number,
    tagNames: string[],
  ): Promise<{ tags: Tag[]; invalid: string[] } | null> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: userId },
      relations: ["tags"],
    });
    if (!schedule) return null;

    const invalid: string[] = [];
    const validNames: string[] = [];
    for (const raw of tagNames) {
      const n = this.normalize(raw);
      if (n) validNames.push(n);
      else invalid.push(raw);
    }

    const existingMap = new Map<string, Tag>();
    if (validNames.length > 0) {
      const existing = await this.tagRepository.find({
        where: { user_id: userId, name: In(validNames) },
      });
      for (const t of existing) existingMap.set(t.name, t);
    }

    const toCreate = validNames.filter((n) => !existingMap.has(n));
    if (toCreate.length > 0) {
      const created = await this.tagRepository.save(
        toCreate.map((name) =>
          this.tagRepository.create({ user_id: userId, name }),
        ),
      );
      for (const t of created) existingMap.set(t.name, t);
    }

    const newTags = Array.from(existingMap.values());
    const currentIds = new Set((schedule.tags ?? []).map((t) => t.id));
    const merged = [
      ...(schedule.tags ?? []),
      ...newTags.filter((t) => !currentIds.has(t.id)),
    ];
    schedule.tags = merged;
    await this.scheduleRepository.save(schedule);

    return { tags: merged, invalid };
  }

  /**
   * Gỡ 1 tag khỏi schedule. Trả null nếu schedule không tồn tại / mismatch.
   * Trả `{ removed: true }` nếu thực sự gỡ, `removed: false` nếu tag chưa
   * gắn.
   */
  async detachTag(
    userId: string,
    scheduleId: number,
    tagName: string,
  ): Promise<{ removed: boolean; tagName: string } | null> {
    const normalized = this.normalize(tagName);
    if (!normalized) return null;

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: userId },
      relations: ["tags"],
    });
    if (!schedule) return null;

    const before = schedule.tags?.length ?? 0;
    schedule.tags = (schedule.tags ?? []).filter(
      (t) => t.name !== normalized,
    );
    const removed = (schedule.tags?.length ?? 0) < before;

    if (removed) {
      await this.scheduleRepository.save(schedule);
    }
    return { removed, tagName: normalized };
  }

  /**
   * Tìm schedules có gắn `tagName` cho user — kèm load tags để hiển thị.
   * Filter pending mặc định `false` → trả tất cả status.
   */
  async findSchedulesByTag(
    userId: string,
    tagName: string,
    options: { onlyPending?: boolean } = {},
  ): Promise<Schedule[]> {
    const normalized = this.normalize(tagName);
    if (!normalized) return [];

    const qb = this.scheduleRepository
      .createQueryBuilder("schedule")
      .innerJoin("schedule.tags", "tag")
      .leftJoinAndSelect("schedule.tags", "all_tags")
      .where("schedule.user_id = :userId", { userId })
      .andWhere("tag.name = :name", { name: normalized });

    if (options.onlyPending) {
      qb.andWhere("schedule.status = :status", { status: "pending" });
    }

    qb.orderBy("schedule.start_time", "ASC");
    return qb.getMany();
  }

  /**
   * Load tags cho 1 schedule_id. Tiện cho command `*chi-tiet`.
   */
  async findTagsForSchedule(
    userId: string,
    scheduleId: number,
  ): Promise<Tag[]> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: userId },
      relations: ["tags"],
    });
    return schedule?.tags ?? [];
  }
}
