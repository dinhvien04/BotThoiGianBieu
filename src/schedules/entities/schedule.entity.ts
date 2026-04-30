import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Tag } from "./tag.entity";

export type ScheduleStatus = "pending" | "completed" | "cancelled";
export type ScheduleItemType = "task" | "meeting" | "event" | "reminder";
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly";
export type SchedulePriority = "low" | "normal" | "high";

export const RECURRENCE_TYPES: readonly RecurrenceType[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const;

export const SCHEDULE_PRIORITIES: readonly SchedulePriority[] = [
  "low",
  "normal",
  "high",
] as const;

@Entity("schedules")
@Index(["user_id", "start_time"])
@Index(["remind_at", "is_reminded"])
export class Schedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 20, default: "task" })
  item_type!: ScheduleItemType;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "timestamp with time zone" })
  start_time!: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  end_time!: Date | null;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: ScheduleStatus;

  /**
   * Mức ưu tiên: low/normal/high. Hiển thị badge 🔴/🟡/🟢 trong digest.
   */
  @Column({ type: "varchar", length: 20, default: "normal" })
  priority!: SchedulePriority;

  @Column({ type: "timestamp with time zone", nullable: true })
  remind_at!: Date | null;

  /**
   * Cờ "đã gửi reminder gần nhất". Hiện chưa dùng tích cực — giữ để
   * tương thích với migration cũ. Logic mới dùng `acknowledged_at` +
   * tự đẩy `remind_at` sau mỗi lần gửi.
   */
  @Column({ type: "boolean", default: false })
  is_reminded!: boolean;

  /** User đã bấm "Đã nhận" lúc nào. null = chưa, tiếp tục nhắc. */
  @Column({ type: "timestamp with time zone", nullable: true })
  acknowledged_at!: Date | null;

  /**
   * Đã gửi notification kết thúc (end_time) lúc nào. null = chưa gửi,
   * cron sẽ gửi 1 lần khi `end_time <= NOW`.
   */
  @Column({ type: "timestamp with time zone", nullable: true })
  end_notified_at!: Date | null;

  /**
   * Kiểu lặp lại (daily/weekly/monthly). `none` = lịch một lần, không sinh
   * instance tiếp theo khi hoàn thành.
   */
  @Column({ type: "varchar", length: 20, default: "none" })
  recurrence_type!: RecurrenceType;

  /** Chu kỳ lặp, đơn vị theo `recurrence_type` (mỗi N ngày/tuần/tháng). */
  @Column({ type: "integer", default: 1 })
  recurrence_interval!: number;

  /** Dừng lặp sau thời điểm này. null = lặp vô hạn. */
  @Column({ type: "timestamp with time zone", nullable: true })
  recurrence_until!: Date | null;

  /**
   * ID của lịch gốc trong series. Null nếu đây là lịch gốc. Dùng để track
   * series khi user muốn xoá cả chuỗi hoặc thống kê.
   */
  @Column({ type: "integer", nullable: true })
  recurrence_parent_id!: number | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.schedules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  /**
   * Tags gắn với lịch — many-to-many qua junction `schedule_tags`.
   * Eager: false — load on demand via `relations: ['tags']`.
   */
  @ManyToMany(() => Tag, (tag) => tag.schedules)
  @JoinTable({
    name: "schedule_tags",
    joinColumn: { name: "schedule_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tag_id", referencedColumnName: "id" },
  })
  tags?: Tag[];

  /**
   * Danh sách user khác được "share" lịch (view-only). Owner vẫn là
   * `user_id`. Junction `schedule_shares`.
   */
  @ManyToMany(() => User)
  @JoinTable({
    name: "schedule_shares",
    joinColumn: { name: "schedule_id", referencedColumnName: "id" },
    inverseJoinColumn: {
      name: "shared_with_user_id",
      referencedColumnName: "user_id",
    },
  })
  sharedWith?: User[];

  /**
   * Danh sách user được cấp quyền EDIT lịch (ngoài view). Junction
   * `schedule_editors`. Owner vẫn là user_id và là người duy nhất xoá /
   * cấp quyền tiếp.
   */
  @ManyToMany(() => User)
  @JoinTable({
    name: "schedule_editors",
    joinColumn: { name: "schedule_id", referencedColumnName: "id" },
    inverseJoinColumn: {
      name: "editor_user_id",
      referencedColumnName: "user_id",
    },
  })
  editors?: User[];
}
