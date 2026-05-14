import { BotService, ChannelSendTarget } from 'src/bot/bot.service';

describe('BotService message sending', () => {
  let service: BotService;
  let writeChatMessage: jest.Mock;
  let fetchChannel: jest.Mock;

  beforeEach(() => {
    service = new BotService({} as any);
    writeChatMessage = jest.fn().mockResolvedValue({});
    fetchChannel = jest.fn();

    (service as any)._client = {
      socketManager: {
        writeChatMessage,
      },
      channels: {
        fetch: fetchChannel,
      },
    };
  });

  it('should send directly through socket when channel metadata is available', async () => {
    await service.sendMessage(buildTarget(), 'hello');

    expect(fetchChannel).not.toHaveBeenCalled();
    expect(writeChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        clan_id: 'clan123',
        channel_id: 'channel123',
        mode: 2,
        is_public: true,
        content: { t: 'hello' },
        references: [],
      }),
    );
  });

  it('should include reply reference when replying directly through socket', async () => {
    await service.replyToMessage('channel123', 'msg123', 'reply', buildTarget(true));

    expect(fetchChannel).not.toHaveBeenCalled();
    expect(writeChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: 'channel123',
        content: { t: 'reply' },
        references: [
          expect.objectContaining({
            message_ref_id: 'msg123',
            message_sender_id: 'user123',
            message_sender_username: 'tester',
          }),
        ],
      }),
    );
  });

  it('should keep channel fetch fallback when metadata is not available', async () => {
    const send = jest.fn().mockResolvedValue({});
    fetchChannel.mockResolvedValue({ send });

    await service.sendMessage('channel123', 'hello');

    expect(fetchChannel).toHaveBeenCalledWith('channel123');
    expect(send).toHaveBeenCalledWith({ t: 'hello' });
    expect(writeChatMessage).not.toHaveBeenCalled();
  });
});

function buildTarget(includeReply = false): ChannelSendTarget {
  const target: ChannelSendTarget = {
    channelId: 'channel123',
    clanId: 'clan123',
    mode: 2,
    isPublic: true,
  };

  if (includeReply) {
    target.replyTo = {
      messageId: 'msg123',
      senderId: 'user123',
      username: 'tester',
      content: { t: '*mau-lich-excel' },
    };
  }

  return target;
}
