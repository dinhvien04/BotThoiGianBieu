import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserSettings } from './user-settings.entity';
import { Schedule } from '../../schedules/entities/schedule.entity';

export type UserRole = 'user' | 'admin';

export const USER_ROLES: readonly UserRole[] = ['user', 'admin'] as const;

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  display_name!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  job_title!: string | null;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  /**
   * Phân quyền: `user` (mặc định) chỉ thấy data của mình; `admin` truy cập
   * được toàn bộ trang `/admin/*` và các route `/api/admin/*`.
   */
  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: UserRole;

  /**
   * Khoá tài khoản — admin có thể bật cờ này để chặn user đăng nhập web
   * cũng như mọi command bot. Hữu ích khi user vi phạm nội quy.
   */
  @Column({ type: 'boolean', default: false })
  is_locked!: boolean;

  @Column({ type: 'integer', default: 0 })
  token_version!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings?: UserSettings;

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules?: Schedule[];
}
