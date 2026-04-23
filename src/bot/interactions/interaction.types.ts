/**
 * Payload Mezon SDK trả về cho `onMessageButtonClicked`.
 * Chỉ khai báo field bot dùng.
 *
 * ⚠️ QUAN TRỌNG: `sender_id` là ID của người gửi message chứa form — tức là
 * BOT, KHÔNG phải người click. `user_id` mới là ID thực của người click.
 * Luôn dùng `clickerId` trong `ButtonInteractionContext` cho chắc.
 */
export interface MezonButtonClickEvent {
  message_id: string;
  channel_id: string;
  button_id: string;
  /** ID của người gửi message (thường là bot). KHÔNG phải người click! */
  sender_id: string;
  /** ID của người click button — dùng field này để nhận diện user. */
  user_id: string;
  extra_data: string;
}

export interface ButtonInteractionContext {
  /** Toàn bộ event gốc từ Mezon. */
  event: MezonButtonClickEvent;
  /** Phần sau dấu `:` của button_id. Vd: button_id = "them-lich:confirm" → action = "confirm". */
  action: string;
  /** ID của user đã click button (alias cho `event.user_id`). */
  clickerId: string;
  /** Channel chứa form. */
  channelId: string;
  /** Giá trị các input field đã parse từ `extra_data` (dạng key-value string). */
  formData: Record<string, string>;
  /** Gửi message mới vào channel chứa button. */
  send(text: string): Promise<void>;
  /** Reply (quote) message gốc chứa form. */
  reply(text: string): Promise<void>;
  /** Xóa message chứa form (tắt form đi sau khi xử lý xong). */
  deleteForm(): Promise<void>;
}

export interface InteractionHandler {
  /**
   * Prefix của `button_id` (phần trước dấu `:`).
   * Vd: "them-lich" sẽ match "them-lich:confirm", "them-lich:cancel", ...
   */
  readonly interactionId: string;

  handleButton(ctx: ButtonInteractionContext): Promise<void>;
}

/** Ký tự phân tách giữa interactionId và action trong button_id. */
export const BUTTON_ID_SEPARATOR = ':';
