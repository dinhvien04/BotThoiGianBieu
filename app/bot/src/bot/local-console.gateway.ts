import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as readline from "node:readline";
import { CommandRegistry } from "./commands/command-registry";
import { CommandContext, MezonChannelMessage } from "./commands/command.types";

@Injectable()
export class LocalConsoleGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LocalConsoleGateway.name);
  private readonly botEnabled: boolean;
  private readonly localConsoleEnabled: boolean;
  private readonly prefix: string;

  private rl: readline.Interface | null = null;
  private handling = false;

  constructor(
    private readonly registry: CommandRegistry,
    private readonly config: ConfigService,
  ) {
    this.botEnabled = this.parseBoolean(
      this.config.get<string>("BOT_ENABLED"),
      true,
    );
    this.localConsoleEnabled = this.parseBoolean(
      this.config.get<string>("LOCAL_CONSOLE_ENABLED"),
      !this.botEnabled,
    );
    this.prefix = this.config.get<string>("BOT_PREFIX", "*");
  }

  onModuleInit(): void {
    if (this.botEnabled || !this.localConsoleEnabled) {
      return;
    }

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.rl.on("line", (line) => {
      void this.handleLine(line);
    });

    this.rl.on("close", () => {
      this.rl = null;
    });

    this.logger.log(
      `🖥️ Local console mode đã bật. Gõ ${this.prefix}help, ${this.prefix}bat-dau, exit.`,
    );
    this.prompt();
  }

  onModuleDestroy(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  private async handleLine(rawLine: string): Promise<void> {
    const line = rawLine.trim();
    if (!line) {
      this.prompt();
      return;
    }

    if (["exit", "quit", ".exit"].includes(line.toLowerCase())) {
      this.logger.log("Đóng local console mode.");
      this.rl?.close();
      return;
    }

    if (this.handling) {
      this.printBlock("⚠️", "Đang xử lý lệnh trước đó, thử lại sau vài giây.");
      this.prompt();
      return;
    }

    this.handling = true;
    try {
      const text = line.startsWith(this.prefix) ? line : `${this.prefix}${line}`;
      const withoutPrefix = text.slice(this.prefix.length).trim();
      const [head, ...rest] = withoutPrefix.split(/\s+/);
      const command = this.registry.resolve(head);

      if (!command) {
        this.printBlock("❓", `Không tìm thấy lệnh: ${head}`);
        return;
      }

      const message = this.buildMessage(text);
      const ctx = this.buildContext(message, rest, withoutPrefix.slice(head.length).trim());

      await command.execute(ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.printBlock("❌", `Lệnh lỗi: ${msg}`);
    } finally {
      this.handling = false;
      this.prompt();
    }
  }

  private buildMessage(text: string): MezonChannelMessage {
    return {
      message_id: `local-${Date.now()}`,
      channel_id: this.config.get<string>("LOCAL_CHANNEL_ID", "local-channel"),
      clan_id: this.config.get<string>("LOCAL_CLAN_ID", "local-clan"),
      mode: 1,
      is_public: false,
      sender_id: this.config.get<string>("LOCAL_USER_ID", "local-dev-user"),
      username: this.config.get<string>("LOCAL_USERNAME", "localdev"),
      display_name: this.config.get<string>("LOCAL_DISPLAY_NAME", "Local Dev"),
      content: { t: text },
      attachments: [],
    };
  }

  private buildContext(
    message: MezonChannelMessage,
    args: string[],
    rawArgs: string,
  ): CommandContext {
    return {
      message,
      args,
      rawArgs,
      prefix: this.prefix,
      reply: async (text: string) => {
        this.printBlock("↩️ reply", text);
      },
      send: async (text: string) => {
        this.printBlock("📨 send", text);
      },
      sendDM: async (text: string) => {
        this.printBlock("✉️ dm", text);
      },
      ephemeralReply: async (text: string) => {
        this.printBlock("👁️ ephemeral", text);
      },
    };
  }

  private printBlock(label: string, text: string): void {
    process.stdout.write(`\n[${label}]\n${text}\n\n`);
  }

  private prompt(): void {
    if (!this.rl) return;
    this.rl.setPrompt("bot> ");
    this.rl.prompt();
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
}
