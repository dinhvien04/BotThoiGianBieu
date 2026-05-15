import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Lưu lịch sử mỗi lần admin broadcast tin nhắn DM cho user qua Mezon bot.
 * Mỗi record ghi:
 *   - người gửi (`sender_user_id`)
 *   - nội dung (`message`)
 *   - filter người nhận (`recipient_filter`, ví dụ `{ role: 'user' }`)
 *   - thống kê thành công/thất bại
 */
@Entity("broadcasts")
@Index(["sender_user_id", "created_at"])
export class Broadcast {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "varchar", length: 50 })
  sender_user_id!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "jsonb", nullable: true })
  recipient_filter!: Record<string, unknown> | null;

  @Column({ type: "integer", default: 0 })
  total_recipients!: number;

  @Column({ type: "integer", default: 0 })
  success_count!: number;

  @Column({ type: "integer", default: 0 })
  failed_count!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;
}
