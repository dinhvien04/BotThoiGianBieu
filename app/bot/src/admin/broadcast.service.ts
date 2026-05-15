import { Inject, Injectable, Logger, forwardRef } from "@nestjs/common";
import { AdminService, BroadcastFilter } from "./admin.service";
import { BotService } from "../bot/bot.service";

export interface BroadcastResult {
  total: number;
  success: number;
  failed: number;
  failed_user_ids: string[];
}

/**
 * Gửi broadcast DM Mezon tới user theo filter. Tách khỏi `AdminService` vì
 * cần phụ thuộc `BotService` (Mezon client) — qua đó dễ mock khi viết test
 * và tránh circular import giữa bot ↔ admin module.
 */
@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    private readonly adminService: AdminService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
  ) {}

  async sendBroadcast(input: {
    senderUserId: string;
    message: string;
    filter: BroadcastFilter;
  }): Promise<BroadcastResult> {
    const message = (input.message ?? "").trim();
    if (!message) {
      throw new Error("Broadcast message must be non-empty");
    }

    const recipients = await this.adminService.findBroadcastRecipients(input.filter);
    let success = 0;
    let failed = 0;
    const failed_user_ids: string[] = [];

    for (const user of recipients) {
      try {
        await this.botService.sendDirectMessage(user.user_id, message);
        success++;
      } catch (err) {
        failed++;
        failed_user_ids.push(user.user_id);
        this.logger.warn(
          `Broadcast tới ${user.user_id} thất bại: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.adminService.recordBroadcast({
      sender_user_id: input.senderUserId,
      message,
      recipient_filter: input.filter ?? null,
      total: recipients.length,
      success,
      failed,
    });

    return {
      total: recipients.length,
      success,
      failed,
      failed_user_ids,
    };
  }
}
