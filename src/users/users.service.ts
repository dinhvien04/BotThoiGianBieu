import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { UserSettings } from "./entities/user-settings.entity";

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
  default_channel_id?: string | null;
  default_remind_minutes?: number;
  notify_via_dm?: boolean;
  notify_via_channel?: boolean;
  work_start_hour?: number;
  work_end_hour?: number;
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
      relations: ["settings"],
    });
  }

  async registerUser(input: CreateUserInput): Promise<RegisterUserResult> {
    const existing = await this.findByUserId(input.user_id);

    if (existing) {
      const settings =
        existing.settings ??
        (await this.ensureSettings(
          existing.user_id,
          input.default_channel_id ?? null,
        ));
      return { user: existing, settings, isNew: false };
    }

    const user = this.userRepository.create({
      user_id: input.user_id,
      username: input.username ?? null,
      display_name: input.display_name ?? null,
    });
    await this.userRepository.save(user);

    const settings = await this.ensureSettings(
      user.user_id,
      input.default_channel_id ?? null,
    );

    this.logger.log(
      `Đã khởi tạo user mới: ${user.user_id} (${user.display_name ?? user.username ?? "unknown"})`,
    );

    return { user, settings, isNew: true };
  }

  /**
   * Patch các field trong `user_settings`. Chỉ update những field có trong
   * `patch`, giữ nguyên field khác. Trả về record sau update.
   */
  async updateSettings(
    userId: string,
    patch: UpdateSettingsPatch,
  ): Promise<UserSettings | null> {
    if (Object.keys(patch).length === 0) {
      return this.settingsRepository.findOne({ where: { user_id: userId } });
    }
    await this.settingsRepository.update({ user_id: userId }, patch);
    return this.settingsRepository.findOne({ where: { user_id: userId } });
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
      timezone: "Asia/Ho_Chi_Minh",
      default_channel_id: defaultChannelId,
      default_remind_minutes: 30,
      notify_via_dm: false,
      notify_via_channel: true,
    });
    return this.settingsRepository.save(settings);
  }
}
