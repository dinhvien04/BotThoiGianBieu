import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import {
  ScheduleItemType,
  SchedulePriority,
} from "./schedule.entity";

/**
 * Template lưu sẵn các trường thường dùng để clone nhanh sang `Schedule`
 * mới. Không có `start_time` — user sẽ cấp khi gọi `*tu-template`.
 */
@Entity("schedule_templates")
@Index(["user_id", "name"], { unique: true })
export class ScheduleTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "varchar", length: 20, default: "task" })
  item_type!: ScheduleItemType;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  /**
   * Khi clone, sẽ tính end_time = start_time + duration_minutes (nếu có).
   */
  @Column({ type: "integer", nullable: true })
  duration_minutes!: number | null;

  /**
   * Override `default_remind_minutes` của user_settings khi tạo. null =
   * dùng giá trị từ settings.
   */
  @Column({ type: "integer", nullable: true })
  default_remind_minutes!: number | null;

  @Column({ type: "varchar", length: 20, default: "normal" })
  priority!: SchedulePriority;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
