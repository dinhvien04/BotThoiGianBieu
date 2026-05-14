import { ConfigService } from "@nestjs/config";
import { BotGateway } from "src/bot/bot.gateway";
import { BotService } from "src/bot/bot.service";
import { CommandRouter } from "src/bot/commands/command-router";
import { InteractionRouter } from "src/bot/interactions/interaction-router";

describe("BotGateway", () => {
  let gateway: BotGateway;
  let botService: jest.Mocked<BotService>;
  let commandRouter: jest.Mocked<CommandRouter>;
  let interactionRouter: jest.Mocked<InteractionRouter>;
  let config: jest.Mocked<ConfigService>;
  let onChannelMessage: jest.Mock;
  let onMessageButtonClicked: jest.Mock;

  beforeEach(() => {
    onChannelMessage = jest.fn();
    onMessageButtonClicked = jest.fn();

    botService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      client: {
        onChannelMessage,
        onMessageButtonClicked,
      },
    } as any;

    commandRouter = {
      getPrefix: jest.fn().mockReturnValue("*"),
      handle: jest.fn(),
    } as any;

    interactionRouter = {
      handleButton: jest.fn(),
    } as any;

    config = {
      get: jest.fn((key: string) => {
        if (key === "BOT_ENABLED") return "true";
        if (key === "BOT_RETRY_DELAY_MS") return "5000";
        return undefined;
      }),
    } as any;
  });

  afterEach(() => {
    gateway?.onModuleDestroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("should skip Mezon initialization when BOT_ENABLED=false", async () => {
    config.get.mockImplementation((key: string) => {
      if (key === "BOT_ENABLED") return "false";
      return undefined;
    });

    gateway = new BotGateway(
      botService,
      commandRouter,
      interactionRouter,
      config,
    );

    await gateway.onModuleInit();

    expect(botService.initialize).not.toHaveBeenCalled();
    expect(onChannelMessage).not.toHaveBeenCalled();
    expect(onMessageButtonClicked).not.toHaveBeenCalled();
  });

  it("should connect and bind listeners when Mezon login succeeds", async () => {
    gateway = new BotGateway(
      botService,
      commandRouter,
      interactionRouter,
      config,
    );

    await gateway.onModuleInit();
    await flushMicrotasks();

    expect(botService.initialize).toHaveBeenCalledTimes(1);
    expect(onChannelMessage).toHaveBeenCalledTimes(1);
    expect(onMessageButtonClicked).toHaveBeenCalledTimes(1);
    expect(commandRouter.getPrefix).toHaveBeenCalled();
  });

  it("should retry in background after failed initialization", async () => {
    jest.useFakeTimers();
    botService.initialize
      .mockRejectedValueOnce(new Error("socket timeout"))
      .mockResolvedValueOnce(undefined);

    gateway = new BotGateway(
      botService,
      commandRouter,
      interactionRouter,
      config,
    );

    await gateway.onModuleInit();
    await flushMicrotasks();

    expect(botService.initialize).toHaveBeenCalledTimes(1);
    expect(onChannelMessage).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);

    expect(botService.initialize).toHaveBeenCalledTimes(2);
    expect(onChannelMessage).toHaveBeenCalledTimes(1);
    expect(onMessageButtonClicked).toHaveBeenCalledTimes(1);
  });
});

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
