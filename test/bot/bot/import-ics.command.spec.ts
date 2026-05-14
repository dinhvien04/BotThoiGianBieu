import { ImportIcsCommand } from "src/bot/commands/import-ics.command";
import { DateParser } from "src/shared/utils/date-parser";

type Reply = jest.Mock;

const SAMPLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:e1@x
SUMMARY:Họp team
DESCRIPTION:Sprint review
DTSTART:20260425T020000Z
DTEND:20260425T030000Z
END:VEVENT
BEGIN:VEVENT
UID:e2@x
SUMMARY:Sinh nhật
DTSTART;VALUE=DATE:20260501
END:VEVENT
END:VCALENDAR`;

describe("ImportIcsCommand", () => {
  let cmd: ImportIcsCommand;
  let registry: any;
  let interactionRegistry: any;
  let botService: any;
  let usersService: any;
  let schedulesService: any;

  beforeEach(() => {
    registry = { register: jest.fn() };
    interactionRegistry = { register: jest.fn() };
    botService = { sendInteractive: jest.fn() };
    usersService = { findByUserId: jest.fn() };
    schedulesService = { create: jest.fn() };

    cmd = new ImportIcsCommand(
      registry,
      interactionRegistry,
      botService,
      usersService,
      schedulesService,
      new DateParser(),
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const mkCtx = (
    args: string,
    attachments: any[] = [],
  ): any => ({
    message: {
      sender_id: "u1",
      channel_id: "ch1",
      message_id: "m",
      attachments,
    },
    rawArgs: args,
    args: args.length > 0 ? args.split(/\s+/) : [],
    prefix: "*",
    reply: jest.fn() as Reply,
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  });

  it("metadata", () => {
    expect(cmd.name).toBe("import-ics");
    expect(cmd.aliases).toContain("importics");
    expect(cmd.interactionId).toBe("import-ics");
  });

  it("registers itself", () => {
    cmd.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(cmd);
    expect(interactionRegistry.register).toHaveBeenCalledWith(cmd);
  });

  it("rejects no user", async () => {
    usersService.findByUserId.mockResolvedValue(null);
    const ctx = mkCtx("");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("chưa khởi tạo"),
    );
  });

  it("shows usage when no source", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    const ctx = mkCtx("");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Import file .ics"),
    );
  });

  it("rejects huge attachment", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    const ctx = mkCtx("", [
      {
        filename: "x.ics",
        url: "https://x/x.ics",
        size: 10 * 1024 * 1024,
      },
    ]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("File quá lớn"),
    );
  });

  it("parses ics from URL and shows preview", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode(SAMPLE_ICS).buffer),
    }) as any;

    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);
    expect(botService.sendInteractive).toHaveBeenCalled();
    const [, embed] = botService.sendInteractive.mock.calls[0];
    expect(embed.title).toContain("PREVIEW IMPORT");
    expect(embed.description).toContain("Họp team");
    expect(embed.description).toContain("Sinh nhật");
  });

  it("rejects when ICS has no valid VEVENT", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode("garbage").buffer),
    }) as any;

    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("không có VEVENT"),
    );
  });

  it("handles download error", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => "0" },
    }) as any;
    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không tải được"),
    );
  });

  it("creates schedules on confirm button", async () => {
    usersService.findByUserId.mockResolvedValue({
      user_id: "u1",
      settings: { default_remind_minutes: 30 },
    } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode(SAMPLE_ICS).buffer),
    }) as any;

    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);

    // Extract token from button id
    const buttonMessage = botService.sendInteractive.mock.calls[0][2];
    const json = JSON.stringify(buttonMessage);
    const tokenMatch = json.match(/import-ics:confirm:([a-f0-9-]{36})/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];

    schedulesService.create
      .mockResolvedValueOnce({ id: 100 })
      .mockResolvedValueOnce({ id: 101 });

    const btnCtx: any = {
      action: `confirm:${token}`,
      clickerId: "u1",
      send: jest.fn(),
      ephemeralSend: jest.fn(),
      deleteForm: jest.fn(),
    };
    await cmd.handleButton(btnCtx);

    expect(schedulesService.create).toHaveBeenCalledTimes(2);
    expect(schedulesService.create.mock.calls[0][0]).toMatchObject({
      user_id: "u1",
      title: "Họp team",
      item_type: "event",
    });
    expect(btnCtx.send).toHaveBeenCalledWith(
      expect.stringContaining("ĐÃ IMPORT .ICS THÀNH CÔNG"),
    );
  });

  it("rejects button click from non-owner", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode(SAMPLE_ICS).buffer),
    }) as any;
    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);
    const json = JSON.stringify(botService.sendInteractive.mock.calls[0][2]);
    const token = json.match(/import-ics:confirm:([a-f0-9-]{36})/)![1];

    const btnCtx: any = {
      action: `confirm:${token}`,
      clickerId: "other-user",
      send: jest.fn(),
      ephemeralSend: jest.fn(),
      deleteForm: jest.fn(),
    };
    await cmd.handleButton(btnCtx);
    expect(btnCtx.ephemeralSend).toHaveBeenCalledWith(
      expect.stringContaining("Chỉ người tạo"),
    );
    expect(schedulesService.create).not.toHaveBeenCalled();
  });

  it("cancels on cancel button", async () => {
    usersService.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "0" },
      arrayBuffer: () =>
        Promise.resolve(new TextEncoder().encode(SAMPLE_ICS).buffer),
    }) as any;
    const ctx = mkCtx("https://x/x.ics");
    await cmd.execute(ctx);
    const json = JSON.stringify(botService.sendInteractive.mock.calls[0][2]);
    const token = json.match(/import-ics:cancel:([a-f0-9-]{36})/)![1];

    const btnCtx: any = {
      action: `cancel:${token}`,
      clickerId: "u1",
      send: jest.fn(),
      ephemeralSend: jest.fn(),
      deleteForm: jest.fn(),
    };
    await cmd.handleButton(btnCtx);
    expect(btnCtx.send).toHaveBeenCalledWith(
      expect.stringContaining("Đã hủy"),
    );
    expect(schedulesService.create).not.toHaveBeenCalled();
  });
});
