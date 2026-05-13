import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BotService } from "./bot.service";
import { CommandRouter } from "./commands/command-router";
import { MezonChannelMessage } from "./commands/command.types";
import { InteractionRouter } from "./interactions/interaction-router";
import { MezonButtonClickEvent } from "./interactions/interaction.types";

const DEFAULT_RETRY_DELAY_MS = 60_000;

@Injectable()
export class BotGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotGateway.name);
  private readonly botEnabled: boolean;
  private readonly retryDelayMs: number;

  private listenersBound = false;
  private connecting = false;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly botService: BotService,
    private readonly commandRouter: CommandRouter,
    private readonly interactionRouter: InteractionRouter,
    private readonly config: ConfigService,
  ) {
    this.botEnabled = this.parseBoolean(
      this.config.get<string>("BOT_ENABLED"),
      true,
    );
    this.retryDelayMs = this.resolveRetryDelayMs(
      this.config.get<string>("BOT_RETRY_DELAY_MS"),
    );
  }

  async onModuleInit(): Promise<void> {
    if (!this.botEnabled) {
      this.logger.warn(
        "BOT_ENABLED=false → bỏ qua kết nối Mezon, app vẫn chạy local.",
      );
      return;
    }

    void this.connectInBackground();
  }

  onModuleDestroy(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private async connectInBackground(): Promise<void> {
    if (this.connecting || this.botService.isConnected()) {
      return;
    }

    this.connecting = true;
    try {
      await this.botService.initialize();
      this.bindClientListeners();
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      this.logger.log(
        `🎧 Bot đang lắng nghe lệnh (prefix: "${this.commandRouter.getPrefix()}")`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Không thể kết nối Mezon lúc khởi động: ${msg}. Sẽ thử lại sau ${Math.round(this.retryDelayMs / 1000)}s.`,
      );
      this.scheduleRetry();
    } finally {
      this.connecting = false;
    }
  }

  private bindClientListeners(): void {
    if (this.listenersBound) {
      return;
    }

    this.botService.client.onChannelMessage(async (event: unknown) => {
      const message = event as MezonChannelMessage;
      try {
        await this.commandRouter.handle(message);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Lỗi không bắt được khi xử lý message: ${msg}`);
      }
    });

    this.botService.client.onMessageButtonClicked(async (event: unknown) => {
      try {
        await this.interactionRouter.handleButton(
          event as MezonButtonClickEvent,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Lỗi không bắt được khi xử lý button: ${msg}`);
      }
    });

    this.listenersBound = true;
  }

  private scheduleRetry(): void {
    if (this.retryTimer) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.connectInBackground();
    }, this.retryDelayMs);
    this.retryTimer.unref?.();
  }

  private parseBoolean(
    raw: string | undefined,
    defaultValue: boolean,
  ): boolean {
    if (raw == null || raw.trim() === "") {
      return defaultValue;
    }

    const normalized = raw.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
    return defaultValue;
  }

  private resolveRetryDelayMs(raw: string | undefined): number {
    if (!raw) return DEFAULT_RETRY_DELAY_MS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_RETRY_DELAY_MS;
  }
}
