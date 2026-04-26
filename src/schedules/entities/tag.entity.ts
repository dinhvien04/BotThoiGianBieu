import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Schedule } from "./schedule.entity";

/**
 * Tag/nhãn — namespace per user, name unique theo (user_id, name).
 *
 * Tên tag luôn lưu dạng lowercase để uniqueness case-insensitive.
 * Convert ở service layer (`TagsService.normalize`).
 */
@Entity("tags")
@Index(["user_id"])
@Unique("tags_user_name_unique", ["user_id", "name"])
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 50 })
  name!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  color!: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @ManyToMany(() => Schedule, (schedule) => schedule.tags)
  schedules?: Schedule[];
}
