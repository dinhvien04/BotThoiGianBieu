import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserSettings } from './entities/user-settings.entity';

export interface CreateUserInput {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  default_channel_id?: string | null;
}

export interface RegisterUserResult {
  user: User;
  settings: UserSettings;
  isNew: boolean;
}

export interface UpdateSettingsPatch {
  timezone?: string;
  language?: 'vi' | 'en';
  default_channel_id?: string | null;
  default_remind_minutes?: number;
  notify_via_dm?: boolean;
  notify_via_channel?: boolean;
  work_start_hour?: number;
  work_end_hour?: number;
}

export interface UpdateProfilePatch {
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  job_title?: string | null;
  bio?: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async findByUserId(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { user_id: userId },
      relations: ['settings'],
    });
  }

  async incrementTokenVersion(userId: string): Promise<User | null> {
    await this.userRepository.increment({ user_id: userId }, 'token_version', 1);
    return this.findByUserId(userId);
  }

  findActiveWithSettings(): Promise<User[]> {
    return this.userRepository.find({
      where: { is_locked: false },
      relations: ['settings'],
      order: { created_at: 'ASC' },
    });
  }

  async registerUser(input: CreateUserInput): Promise<RegisterUserResult> {
    const existing = await this.findByUserId(input.user_id);

    if (existing) {
      const updated = this.applyProfileUpdate(existing, input);
      const user = updated ? await this.userRepository.save(existing) : existing;
      const settings =
        user.settings ?? (await this.ensureSettings(user.user_id, input.default_channel_id ?? null));
      user.settings = settings;
      return { user, settings, isNew: false };
    }

    const user = this.userRepository.create({
      user_id: input.user_id,
      username: this.normalizeProfileText(input.username),
      display_name: this.normalizeProfileText(input.display_name),
    });
    await this.userRepository.save(user);

    const settings = await this.ensureSettings(user.user_id, input.default_channel_id ?? null);

    this.logger.log(
      `Đã khởi tạo user mới: ${user.user_id} (${user.display_name ?? user.username ?? 'unknown'})`,
    );

    return { user, settings, isNew: true };
  }

  /**
   * Patch các field trong `user_settings`. Chỉ update những field có trong
   * `patch`, giữ nguyên field khác. Trả về record sau update.
   */
  async updateSettings(userId: string, patch: UpdateSettingsPatch): Promise<UserSettings | null> {
    if (patch.language !== undefined && patch.language !== 'vi' && patch.language !== 'en') {
      throw new BadRequestException('Ngôn ngữ không hợp lệ');
    }
    if (Object.keys(patch).length === 0) {
      return this.settingsRepository.findOne({ where: { user_id: userId } });
    }
    await this.settingsRepository.update({ user_id: userId }, patch);
    return this.settingsRepository.findOne({ where: { user_id: userId } });
  }

  async updateProfile(userId: string, patch: UpdateProfilePatch): Promise<User | null> {
    const user = await this.findByUserId(userId);
    if (!user) {
      return null;
    }

    let changed = false;
    const apply = <K extends keyof UpdateProfilePatch>(
      key: K,
      value: UpdateProfilePatch[K],
      maxLength: number,
    ) => {
      if (value === undefined) {
        return;
      }
      const normalized = this.normalizeProfileText(value);
      if (normalized && normalized.length > maxLength) {
        throw new BadRequestException(`Trường ${key} quá dài`);
      }
      if (user[key] !== normalized) {
        user[key] = normalized;
        changed = true;
      }
    };

    apply('display_name', patch.display_name, 150);
    apply('email', patch.email, 255);
    apply('phone', patch.phone, 50);
    apply('job_title', patch.job_title, 120);
    apply('bio', patch.bio, 1000);

    if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      throw new BadRequestException('Email không hợp lệ');
    }

    return changed ? this.userRepository.save(user) : user;
  }

  private async ensureSettings(
    userId: string,
    defaultChannelId: string | null,
  ): Promise<UserSettings> {
    const existing = await this.settingsRepository.findOne({
      where: { user_id: userId },
    });
    if (existing) {
      return existing;
    }

    const settings = this.settingsRepository.create({
      user_id: userId,
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      default_channel_id: defaultChannelId,
      default_remind_minutes: 30,
      notify_via_dm: false,
      notify_via_channel: true,
    });
    return this.settingsRepository.save(settings);
  }

  private applyProfileUpdate(user: User, input: CreateUserInput): boolean {
    let changed = false;
    const username = this.normalizeProfileText(input.username);
    const displayName = this.normalizeProfileText(input.display_name);

    if (username && user.username !== username) {
      user.username = username;
      changed = true;
    }
    if (displayName && user.display_name !== displayName) {
      user.display_name = displayName;
      changed = true;
    }

    return changed;
  }

  private normalizeProfileText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
