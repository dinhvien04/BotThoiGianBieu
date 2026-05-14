import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';

const DEFAULT_TEMPLATE_URL =
  'https://raw.githubusercontent.com/dinhvien04/BotThoiGianBieu/main/assets/mau-lich-excel.xlsx';

@Injectable()
export class MauLichExcelCommand implements BotCommand, OnModuleInit {
  readonly name = 'mau-lich-excel';
  readonly aliases = ['tai-file-excel', 'file-mau-excel'];
  readonly description = 'Tải file Excel mẫu để nhập lịch hàng loạt';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'mau-lich-excel';
  readonly example = 'mau-lich-excel';

  constructor(
    private readonly registry: CommandRegistry,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const templateUrl = this.config.get<string>('EXCEL_TEMPLATE_URL') ?? DEFAULT_TEMPLATE_URL;

    await ctx.reply(
      `📄 FILE MẪU NHẬP LỊCH EXCEL\n\n` +
        `Tải file mẫu tại đây:\n${templateUrl}\n\n` +
        `Điền các cột trong sheet \`lich\`, sau đó gửi file \`.xlsx\` lên kênh này và gõ:\n` +
        `\`${ctx.prefix}them-lich-excel\`\n\n` +
        `Cột bắt buộc: \`tieu_de\`, \`loai\`, \`ngay_bat_dau\`, \`gio_bat_dau\`, \`ngay_ket_thuc\`, \`gio_ket_thuc\`\n` +
        `Loại lịch: \`task\`, \`meeting\`, \`event\`, \`reminder\`\n` +
        `Ngày nên nhập dạng: \`01/05/2026\` hoặc \`2026-05-01\`; giờ dạng: \`09:00\``,
    );
  }
}
