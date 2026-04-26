import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("user_settings")
export class UserSettings {
  @PrimaryColumn({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 50, default: "Asia/Ho_Chi_Minh" })
  timezone!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  default_channel_id!: string | null;

  @Column({ type: "integer", default: 30 })
  default_remind_minutes!: number;

  @Column({ type: "boolean", default: false })
  notify_via_dm!: boolean;

  @Column({ type: "boolean", default: true })
  notify_via_channel!: boolean;

  /**
   * Khung giờ làm việc. Reminder rơi ngoài [start, end) (giờ VN) sẽ
   * tự dồn về `work_start_hour` của ngày làm việc kế tiếp thay vì gửi
   * giữa đêm. Khi `start === end` (vd 0/0) → tắt, ping 24/7.
   */
  @Column({ type: "integer", default: 0 })
  work_start_hour!: number;

  @Column({ type: "integer", default: 0 })
  work_end_hour!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @OneToOne(() => User, (user) => user.settings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
