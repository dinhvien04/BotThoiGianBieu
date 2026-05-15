import {
  Column,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Key/value config toàn hệ thống — chỉ admin sửa qua `/api/admin/settings`.
 * Một số key chuẩn được sử dụng trong app:
 *   - `bot_enabled` (boolean): bật/tắt toàn bộ command bot.
 *   - `signup_enabled` (boolean): cho phép user mới `*bat-dau` không.
 *   - `site_banner` (object `{ enabled, message, level }`): banner thông báo
 *     hiển thị trên đầu mọi trang web.
 */
@Entity("system_settings")
export class SystemSetting {
  @PrimaryColumn({ type: "varchar", length: 100 })
  key!: string;

  @Column({ type: "jsonb", nullable: true })
  value!: unknown;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  updated_by!: string | null;
}
