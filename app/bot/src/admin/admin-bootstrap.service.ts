import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/entities/user.entity";

/**
 * Khi bot khởi động, đọc biến môi trường `ADMIN_USER_IDS` (danh sách cách
 * nhau bằng dấu phẩy) và promote các user đó lên role 'admin'. Nếu user chưa
 * tồn tại thì tạo placeholder record để admin có thể đăng nhập web ngay
 * lần đầu mà không cần gọi `*bat-dau` qua bot.
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const ids = this.parseAdminIds();
    if (ids.length === 0) {
      return;
    }
    this.logger.log(
      `Đang đồng bộ ${ids.length} admin từ ADMIN_USER_IDS...`,
    );
    for (const userId of ids) {
      try {
        await this.ensureAdmin(userId);
      } catch (err) {
        this.logger.error(
          `Không promote được ${userId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private parseAdminIds(): string[] {
    const raw = this.config.get<string>("ADMIN_USER_IDS") ?? "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private async ensureAdmin(userId: string): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { user_id: userId },
    });
    if (existing) {
      if (existing.role !== "admin" || existing.is_locked) {
        existing.role = "admin";
        existing.is_locked = false;
        await this.userRepository.save(existing);
        this.logger.log(`Đã promote ${userId} thành admin`);
      }
      return;
    }
    const created = this.userRepository.create({
      user_id: userId,
      username: null,
      display_name: null,
      role: "admin",
      is_locked: false,
    });
    await this.userRepository.save(created);
    this.logger.log(`Tạo admin mới (chưa có data Mezon): ${userId}`);
  }
}
