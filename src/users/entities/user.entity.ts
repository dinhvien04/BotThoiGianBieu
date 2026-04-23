import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserSettings } from "./user-settings.entity";
import { Schedule } from "../../schedules/entities/schedule.entity";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 50 })
  user_id!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  username!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  display_name!: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings?: UserSettings;

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules?: Schedule[];
}
