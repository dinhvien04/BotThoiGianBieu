import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Schedule } from "./entities/schedule.entity";
import { User } from "../users/entities/user.entity";

/**
 * Logic share lịch (view-only) cho user khác.
 *
 * - Owner = `schedules.user_id` — chỉ owner mới sửa/xoá.
 * - Junction `schedule_shares(schedule_id, shared_with_user_id)` lưu
 *   các user khác có quyền xem.
 * - Reminder broadcast sẽ mention thêm các participants.
 */
@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Share lịch của owner cho `targetUserId`. Trả:
   * - null nếu schedule không tồn tại / user_id không phải owner
   * - { added: false } nếu user mục tiêu đã được share trước đó
   * - { added: true, sharedWith } nếu thêm thành công
   *
   * Không cho share cho chính owner.
   */
  async share(
    scheduleId: number,
    ownerUserId: string,
    targetUserId: string,
  ): Promise<{ added: boolean; sharedWith: User[] } | null> {
    if (!targetUserId || targetUserId === ownerUserId) return null;

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["sharedWith"],
    });
    if (!schedule) return null;

    const target = await this.userRepository.findOne({
      where: { user_id: targetUserId },
    });
    if (!target) return null;

    const list = schedule.sharedWith ?? [];
    if (list.some((u) => u.user_id === targetUserId)) {
      return { added: false, sharedWith: list };
    }

    schedule.sharedWith = [...list, target];
    await this.scheduleRepository.save(schedule);
    return { added: true, sharedWith: schedule.sharedWith };
  }

  /**
   * Gỡ share cho `targetUserId`. Trả null nếu schedule không tồn tại /
   * không phải owner. Trả `{ removed: true|false, sharedWith }`.
   */
  async unshare(
    scheduleId: number,
    ownerUserId: string,
    targetUserId: string,
  ): Promise<{ removed: boolean; sharedWith: User[] } | null> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["sharedWith"],
    });
    if (!schedule) return null;

    const before = schedule.sharedWith ?? [];
    const after = before.filter((u) => u.user_id !== targetUserId);
    if (after.length === before.length) {
      return { removed: false, sharedWith: before };
    }

    schedule.sharedWith = after;
    await this.scheduleRepository.save(schedule);
    return { removed: true, sharedWith: after };
  }

  /**
   * List các user mà schedule đang được share. Chỉ owner mới được gọi
   * (kiểm bằng user_id). Trả [] nếu schedule không tồn tại / không
   * phải owner.
   */
  async listSharedUsers(
    scheduleId: number,
    ownerUserId: string,
  ): Promise<User[]> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["sharedWith"],
    });
    return schedule?.sharedWith ?? [];
  }

  /**
   * List schedules được share TỚI `userId` (user là participant, không
   * phải owner). Sắp theo start_time tăng dần.
   */
  async findSchedulesSharedWith(userId: string): Promise<Schedule[]> {
    return this.scheduleRepository
      .createQueryBuilder("schedule")
      .innerJoin(
        "schedule_shares",
        "ss",
        "ss.schedule_id = schedule.id AND ss.shared_with_user_id = :userId",
        { userId },
      )
      .leftJoinAndSelect("schedule.user", "owner")
      .orderBy("schedule.start_time", "ASC")
      .getMany();
  }

  /**
   * Trả danh sách user_id (participants) cho 1 schedule. Dùng bởi
   * reminder để build mention list. Không kiểm owner — caller tự lo.
   */
  async getParticipantUserIds(scheduleId: number): Promise<string[]> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ["sharedWith"],
    });
    return (schedule?.sharedWith ?? []).map((u) => u.user_id);
  }

  /**
   * Cấp quyền EDIT lịch cho `targetUserId`. Trả:
   * - null nếu schedule không tồn tại / không phải owner / target chưa
   *   từng dùng bot.
   * - { added: false } nếu user mục tiêu đã có quyền edit từ trước.
   * - { added: true, editors } nếu thêm thành công.
   *
   * Không cho cấp cho chính owner.
   */
  async grantEdit(
    scheduleId: number,
    ownerUserId: string,
    targetUserId: string,
  ): Promise<{ added: boolean; editors: User[] } | null> {
    if (!targetUserId || targetUserId === ownerUserId) return null;

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["editors"],
    });
    if (!schedule) return null;

    const target = await this.userRepository.findOne({
      where: { user_id: targetUserId },
    });
    if (!target) return null;

    const list = schedule.editors ?? [];
    if (list.some((u) => u.user_id === targetUserId)) {
      return { added: false, editors: list };
    }

    schedule.editors = [...list, target];
    await this.scheduleRepository.save(schedule);
    return { added: true, editors: schedule.editors };
  }

  /**
   * Gỡ quyền edit của `targetUserId`. Trả null nếu schedule không tồn
   * tại / không phải owner. Trả `{ removed, editors }`.
   */
  async revokeEdit(
    scheduleId: number,
    ownerUserId: string,
    targetUserId: string,
  ): Promise<{ removed: boolean; editors: User[] } | null> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["editors"],
    });
    if (!schedule) return null;

    const before = schedule.editors ?? [];
    const after = before.filter((u) => u.user_id !== targetUserId);
    if (after.length === before.length) {
      return { removed: false, editors: before };
    }

    schedule.editors = after;
    await this.scheduleRepository.save(schedule);
    return { removed: true, editors: after };
  }

  /**
   * Trả `true` nếu `userId` được phép edit lịch — owner hoặc editor.
   */
  async canEdit(scheduleId: number, userId: string): Promise<boolean> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
      relations: ["editors"],
    });
    if (!schedule) return false;
    if (schedule.user_id === userId) return true;
    return (schedule.editors ?? []).some((u) => u.user_id === userId);
  }

  /** List editors của schedule. Chỉ owner mới được gọi. */
  async listEditors(
    scheduleId: number,
    ownerUserId: string,
  ): Promise<User[]> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId, user_id: ownerUserId },
      relations: ["editors"],
    });
    return schedule?.editors ?? [];
  }

  /**
   * List schedules mà OWNER đã share cho người khác (view-only HOẶC
   * editor). Trả schedule kèm `sharedWith` và `editors` để tầng UI có
   * thể đếm/render. Sắp theo start_time ASC.
   */
  async findSchedulesIShared(ownerUserId: string): Promise<Schedule[]> {
    const schedules = await this.scheduleRepository.find({
      where: { user_id: ownerUserId },
      relations: ["sharedWith", "editors"],
      order: { start_time: "ASC" },
    });
    return schedules.filter(
      (s) =>
        (s.sharedWith && s.sharedWith.length > 0) ||
        (s.editors && s.editors.length > 0),
    );
  }
}
