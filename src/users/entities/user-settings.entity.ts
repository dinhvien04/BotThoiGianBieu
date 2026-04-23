import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id!: string;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  default_channel_id!: string | null;

  @Column({ type: 'integer', default: 30 })
  default_remind_minutes!: number;

  @Column({ type: 'boolean', default: false })
  notify_via_dm!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
