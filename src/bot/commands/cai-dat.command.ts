import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ButtonBuilder,
  EButtonMessageStyle,
  InteractiveBuilder,
} from 'mezon-sdk';
import { BotService } from '../bot.service';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';
import { InteractionRegistry } from '../interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../interactions/interaction.types';
import {
  UpdateSettingsPatch,
  UsersService,
} from '../../users/users.service';
import { UserSettings } from '../../users/entities/user-settings.entity';

const INTERACTION_ID = 'cai-dat';

type NotifyMode = 'channel' | 'dm' | 'both';

const NOTIFY_MODE_OPTIONS: Array<{ label: string; value: NotifyMode }> = [
  { label: '📢 Chỉ channel', value: 'channel' },
  { label: '📲 Chỉ DM', value: 'dm' },
  { label: '🔔 Cả hai (channel + DM)', value: 'both' },
];

const MIN_REMIND = 0;
const MAX_REMIND = 1440; // 1 ngày

function deriveMode(settings: UserSettings): NotifyMode {
  const dm = settings.notify_via_dm;
  const ch = settings.notify_via_channel;
  if (dm && ch) return 'both';
  if (dm) return 'dm';
  return 'channel';
}

function modeToBooleans(mode: NotifyMode): {
  notify_via_dm: boolean;
  notify_via_channel: boolean;
} {
  switch (mode) {
    case 'dm':
      return { notify_via_dm: true, notify_via_channel: false };
    case 'both':
      return { notify_via_dm: true, notify_via_channel: true };
    case 'channel':
    default:
      return { notify_via_dm: false, notify_via_channel: true };
  }
}

function modeLabel(mode: NotifyMode): string {
  return NOTIFY_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
}

function isNotifyMode(v: string): v is NotifyMode {
  return v === 'channel' || v === 'dm' || v === 'both';
}

@Injectable()
export class CaiDatCommand implements BotCommand, InteractionHandler, OnModuleInit {
  readonly name = 'cai-dat';
  readonly aliases = ['caidat', 'settings'];
  readonly description = 'Xem và chỉnh cài đặt cá nhân';
  readonly category = '⚙️ CÀI ĐẶT';
  readonly syntax = 'cai-dat';
  readonly example = 'cai-dat';
  readonly interactionId = INTERACTION_ID;

  constructor(
    private readonly commandRegistry: CommandRegistry,
    private readonly interactionRegistry: InteractionRegistry,
    private readonly botService: BotService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.commandRegistry.register(this);
    this.interactionRegistry.register(this);
  }

  // ================ TEXT COMMAND ================

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    const settings = user.settings;
    if (!settings) {
      await ctx.reply(
        `⚠️ Không tìm thấy cài đặt. Vui lòng dùng lại \`${ctx.prefix}batdau\`.`,
      );
      return;
    }

    await this.renderForm(ctx.message.channel_id, settings);
  }

  // ================ BUTTON INTERACTION ================

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const actionType = ctx.action;

    if (actionType === 'cancel') {
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy thay đổi cài đặt.`);
      return;
    }
    if (actionType !== 'save') return;

    const user = await this.usersService.findByUserId(ctx.clickerId);
    if (!user?.settings) {
      await this.closeForm(ctx);
      await ctx.send(`⚠️ Không tìm thấy cài đặt của bạn. Gõ \`*batdau\` trước.`);
      return;
    }

    const result = this.buildPatch(ctx.formData, user.settings);
    if (result.error) {
      await this.closeForm(ctx);
      await ctx.send(
        `${result.error}\n\n💡 Gõ lại \`*cai-dat\` để thử lại.`,
      );
      return;
    }

    if (Object.keys(result.data).length === 0) {
      await this.closeForm(ctx);
      await ctx.send(`ℹ️ Bạn không thay đổi gì cả, cài đặt giữ nguyên.`);
      return;
    }

    const updated = await this.usersService.updateSettings(ctx.clickerId, result.data);
    await this.closeForm(ctx);

    if (!updated) {
      await ctx.send(`❌ Lỗi khi cập nhật cài đặt.`);
      return;
    }

    await ctx.send(this.formatSummary(updated, result.data));
  }

  // ================ FORM RENDERING ================

  private async renderForm(channelId: string, settings: UserSettings): Promise<void> {
    const currentMode = deriveMode(settings);
    const selectedMode =
      NOTIFY_MODE_OPTIONS.find((o) => o.value === currentMode) ?? NOTIFY_MODE_OPTIONS[0];

    const embed = new InteractiveBuilder('⚙️ CÀI ĐẶT CÁ NHÂN')
      .setDescription(
        `Chỉnh các trường bên dưới rồi bấm **Lưu** để cập nhật (hoặc **Hủy** để bỏ qua).`,
      )
      .addField(
        '🕐 Múi giờ',
        `\`${settings.timezone}\` _(tạm thời chỉ hỗ trợ giờ VN)_`,
        false,
      )
      .addInputField(
        'remind_minutes',
        '⏰ Nhắc trước (phút)',
        '30',
        {
          type: 'number',
          defaultValue: String(settings.default_remind_minutes),
        },
        `Hiện tại: ${settings.default_remind_minutes}. Phạm vi: ${MIN_REMIND}–${MAX_REMIND}.`,
      )
      .addInputField(
        'channel_id',
        '📍 Channel mặc định',
        'Channel ID để nhận notification',
        { defaultValue: settings.default_channel_id ?? '' },
        `Hiện tại: ${settings.default_channel_id ? `\`${settings.default_channel_id}\`` : '_(chưa đặt)_'}. Bỏ trống = giữ nguyên.`,
      )
      .addSelectField(
        'notify_mode',
        '🔔 Nơi nhận thông báo',
        NOTIFY_MODE_OPTIONS,
        selectedMode,
        `Hiện tại: ${modeLabel(currentMode)}. Chọn nơi nhận reminder khi tới giờ.`,
      )
      .build();

    const buttons = new ButtonBuilder()
      .addButton(`${INTERACTION_ID}:save`, '💾 Lưu', EButtonMessageStyle.SUCCESS)
      .addButton(`${INTERACTION_ID}:cancel`, '❌ Hủy', EButtonMessageStyle.DANGER)
      .build();

    await this.botService.sendInteractive(channelId, embed, buttons);
  }

  // ================ VALIDATION + PATCH BUILDING ================

  private buildPatch(
    formData: Record<string, string>,
    current: UserSettings,
  ): { data: UpdateSettingsPatch; error?: string } {
    const data: UpdateSettingsPatch = {};

    // remind_minutes
    const remindRaw = formData.remind_minutes?.trim();
    if (remindRaw !== undefined && remindRaw !== '') {
      const n = Number(remindRaw);
      if (!Number.isInteger(n)) {
        return { data, error: `❌ "Nhắc trước" phải là số nguyên: \`${remindRaw}\`.` };
      }
      if (n < MIN_REMIND || n > MAX_REMIND) {
        return {
          data,
          error: `❌ "Nhắc trước" phải trong khoảng ${MIN_REMIND}–${MAX_REMIND} phút.`,
        };
      }
      if (n !== current.default_remind_minutes) {
        data.default_remind_minutes = n;
      }
    }

    // channel_id — bỏ trống = giữ nguyên
    const channelRaw = formData.channel_id?.trim();
    if (channelRaw !== undefined && channelRaw !== '') {
      if (channelRaw !== current.default_channel_id) {
        data.default_channel_id = channelRaw;
      }
    }

    // notify_mode → derive 2 boolean fields
    const modeRaw = formData.notify_mode?.trim();
    if (modeRaw && isNotifyMode(modeRaw)) {
      const currentMode = deriveMode(current);
      if (modeRaw !== currentMode) {
        const { notify_via_dm, notify_via_channel } = modeToBooleans(modeRaw);
        data.notify_via_dm = notify_via_dm;
        data.notify_via_channel = notify_via_channel;
      }
    }

    return { data };
  }

  // ================ FORMATTING ================

  private formatSummary(updated: UserSettings, patch: UpdateSettingsPatch): string {
    const changes: string[] = [];

    if (patch.default_remind_minutes !== undefined) {
      changes.push(`⏰ Nhắc trước → \`${updated.default_remind_minutes}\` phút`);
    }
    if (patch.default_channel_id !== undefined) {
      changes.push(
        `📍 Channel mặc định → \`${updated.default_channel_id ?? 'chưa đặt'}\``,
      );
    }
    if (patch.notify_via_dm !== undefined || patch.notify_via_channel !== undefined) {
      const newMode = deriveMode(updated);
      changes.push(`🔔 Nơi nhận thông báo → ${modeLabel(newMode)}`);
    }

    return [
      `✅ ĐÃ CẬP NHẬT CÀI ĐẶT!`,
      ``,
      ...changes,
      ``,
      `_Các lịch đã tạo trước đó giữ nguyên; chỉ lịch mới dùng giá trị mới._`,
    ].join('\n');
  }

  // ================ HELPERS ================

  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // best-effort
    }
  }
}
