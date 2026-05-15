import { BroadcastService } from "../../../app/bot/src/admin/broadcast.service";

describe("BroadcastService", () => {
  let adminService: {
    findBroadcastRecipients: jest.Mock;
    recordBroadcast: jest.Mock;
  };
  let botService: { sendDirectMessage: jest.Mock };
  let service: BroadcastService;

  beforeEach(() => {
    adminService = {
      findBroadcastRecipients: jest.fn(),
      recordBroadcast: jest.fn().mockResolvedValue(undefined),
    };
    botService = { sendDirectMessage: jest.fn() };
    service = new BroadcastService(
      adminService as never,
      botService as never,
    );
  });

  it("rejects empty message", async () => {
    await expect(
      service.sendBroadcast({
        senderUserId: "admin-1",
        message: "   ",
        filter: {},
      }),
    ).rejects.toThrow("non-empty");
  });

  it("sends to every recipient and records success/failed counts", async () => {
    adminService.findBroadcastRecipients.mockResolvedValue([
      { user_id: "u-1" },
      { user_id: "u-2" },
      { user_id: "u-3" },
    ]);
    botService.sendDirectMessage
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("delivery failed"))
      .mockResolvedValueOnce(undefined);
    const result = await service.sendBroadcast({
      senderUserId: "admin-1",
      message: "hello",
      filter: { only_unlocked: true },
    });
    expect(botService.sendDirectMessage).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      total: 3,
      success: 2,
      failed: 1,
      failed_user_ids: ["u-2"],
    });
    expect(adminService.recordBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        sender_user_id: "admin-1",
        message: "hello",
        total: 3,
        success: 2,
        failed: 1,
      }),
    );
  });

  it("handles zero recipients gracefully", async () => {
    adminService.findBroadcastRecipients.mockResolvedValue([]);
    const result = await service.sendBroadcast({
      senderUserId: "admin-1",
      message: "ping",
      filter: {},
    });
    expect(result.total).toBe(0);
    expect(result.success).toBe(0);
  });
});
