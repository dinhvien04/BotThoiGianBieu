import { Injectable, Logger } from "@nestjs/common";
import { BotCommand } from "./command.types";

@Injectable()
export class CommandRegistry {
  private readonly logger = new Logger(CommandRegistry.name);
  private readonly byName = new Map<string, BotCommand>();
  private readonly commands: BotCommand[] = [];

  register(command: BotCommand): void {
    if (!command?.name) {
      this.logger.warn("Bỏ qua command không hợp lệ (thiếu `name`).");
      return;
    }

    const names = [command.name, ...(command.aliases ?? [])];
    for (const n of names) {
      const key = n.toLowerCase();
      if (this.byName.has(key)) {
        this.logger.warn(`Trùng tên lệnh: "${n}" — bỏ qua đăng ký lại.`);
        continue;
      }
      this.byName.set(key, command);
    }

    this.commands.push(command);
    this.logger.debug(`Đã đăng ký lệnh: ${command.name}`);
  }

  resolve(name: string): BotCommand | undefined {
    return this.byName.get(name.toLowerCase());
  }

  getAll(): BotCommand[] {
    return [...this.commands];
  }
}
