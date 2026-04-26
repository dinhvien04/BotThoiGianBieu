import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type AuditAction =
  | "create"
  | "update"
  | "complete"
  | "cancel"
  | "delete"
  | "restore"
  | "share-add"
  | "share-remove"
  | "tag-add"
  | "tag-remove";

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  "create",
  "update",
  "complete",
  "cancel",
  "delete",
  "restore",
  "share-add",
  "share-remove",
  "tag-add",
  "tag-remove",
] as const;

/**
 * Snapshot diff lưu cho action "update" — mỗi key là tên field, value
 * là `{ from, to }`. Field nào không thay đổi không xuất hiện.
 */
export type AuditChanges = Record<
  string,
  { from?: unknown; to?: unknown }
> | null;

@Entity("schedule_audit_logs")
@Index(["schedule_id", "created_at"])
export class ScheduleAuditLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "integer" })
  schedule_id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 30 })
  action!: AuditAction;

  @Column({ type: "jsonb", nullable: true })
  changes!: AuditChanges;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;
}
