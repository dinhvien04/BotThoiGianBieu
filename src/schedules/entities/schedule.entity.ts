import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export type ScheduleStatus = "pending" | "completed" | "cancelled";

@Entity("schedules")
export class Schedule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 20 })
  item_type!: string;

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

  @Column({ type: "timestamp with time zone", nullable: true })
  remind_at!: Date | null;

  @Column({ type: "boolean", default: false })
  is_reminded!: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.schedules, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
