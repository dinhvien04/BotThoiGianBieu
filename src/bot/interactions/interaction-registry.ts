import { Injectable, Logger } from '@nestjs/common';
import { BUTTON_ID_SEPARATOR, InteractionHandler } from './interaction.types';

@Injectable()
export class InteractionRegistry {
  private readonly logger = new Logger(InteractionRegistry.name);
  private readonly handlers = new Map<string, InteractionHandler>();

  register(handler: InteractionHandler): void {
    if (!handler?.interactionId) {
      this.logger.warn('Bỏ qua InteractionHandler không có `interactionId`.');
      return;
    }
    if (this.handlers.has(handler.interactionId)) {
      this.logger.warn(`Trùng interactionId: "${handler.interactionId}" — bỏ qua.`);
      return;
    }
    this.handlers.set(handler.interactionId, handler);
    this.logger.debug(`Đã đăng ký interaction: ${handler.interactionId}`);
  }

  resolve(buttonId: string): { handler: InteractionHandler; action: string } | undefined {
    const idx = buttonId.indexOf(BUTTON_ID_SEPARATOR);
    const prefix = idx === -1 ? buttonId : buttonId.slice(0, idx);
    const action = idx === -1 ? '' : buttonId.slice(idx + 1);
    const handler = this.handlers.get(prefix);
    return handler ? { handler, action } : undefined;
  }
}
