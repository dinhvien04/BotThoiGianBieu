import { render, screen, waitFor, fireEvent } from "../utils/test-utils";
import AdminDashboardPage from "@/app/(dashboard)/admin/page";
import AdminUsersPage from "@/app/(dashboard)/admin/nguoi-dung/page";
import AdminBroadcastPage from "@/app/(dashboard)/admin/thong-bao/page";
import AdminSettingsPage from "@/app/(dashboard)/admin/cai-dat/page";
import {
  adminGetStats,
  adminListUsers,
  adminSendBroadcast,
  adminListBroadcasts,
  adminGetSettings,
  adminSetSetting,
} from "@/lib/api";

jest.mock("@/lib/api", () => ({
  adminGetStats: jest.fn(),
  adminListUsers: jest.fn(),
  adminSetRole: jest.fn(),
  adminSetLocked: jest.fn(),
  adminDeleteUser: jest.fn(),
  adminSendBroadcast: jest.fn(),
  adminListBroadcasts: jest.fn(),
  adminGetSettings: jest.fn(),
  adminSetSetting: jest.fn(),
}));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders KPI cards and bar charts", async () => {
    (adminGetStats as jest.Mock).mockResolvedValue({
      success: true,
      stats: {
        total_users: 12,
        total_admins: 2,
        locked_users: 1,
        total_schedules: 50,
        schedules_pending: 30,
        schedules_completed: 20,
        new_users_today: 3,
        new_schedules_today: 5,
        signups_last_30_days: [{ date: "2026-05-01", count: 2 }],
        schedules_last_30_days: [{ date: "2026-05-01", count: 7 }],
      },
    });

    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("Tổng user")).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("User đăng ký 30 ngày")).toBeInTheDocument();
    expect(screen.getByText("Lịch tạo 30 ngày")).toBeInTheDocument();
  });

  it("shows error message when stats fail", async () => {
    (adminGetStats as jest.Mock).mockRejectedValue(new Error("boom"));
    render(<AdminDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });
});

describe("AdminUsersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminListUsers as jest.Mock).mockResolvedValue({
      success: true,
      total: 1,
      page: 1,
      limit: 20,
      items: [
        {
          user_id: "u-1",
          username: "alice",
          display_name: "Alice",
          role: "admin",
          is_locked: false,
          schedule_count: 7,
          created_at: "2026-05-01T00:00:00Z",
          updated_at: "2026-05-01T00:00:00Z",
        },
      ],
    });
  });

  it("shows user row with role badge", async () => {
    render(<AdminUsersPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("u-1 · @alice")).toBeInTheDocument();
  });
});

describe("AdminBroadcastPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminListBroadcasts as jest.Mock).mockResolvedValue({
      success: true,
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects empty message and shows inline error", async () => {
    render(<AdminBroadcastPage />);
    const submit = await screen.findByRole("button", {
      name: /gửi broadcast/i,
    });
    fireEvent.click(submit);
    expect(adminSendBroadcast).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(
        screen.getByText("Nội dung không được rỗng."),
      ).toBeInTheDocument();
    });
  });

  it("sends broadcast and shows summary", async () => {
    (adminSendBroadcast as jest.Mock).mockResolvedValue({
      success: true,
      result: { total: 4, success: 3, failed: 1, failed_user_ids: ["x"] },
    });
    render(<AdminBroadcastPage />);
    const textarea = await screen.findByPlaceholderText(/hệ thống/i);
    fireEvent.change(textarea, { target: { value: "test message" } });
    const submit = screen.getByRole("button", { name: /gửi broadcast/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(adminSendBroadcast).toHaveBeenCalledWith(
        "test message",
        { role: undefined, only_unlocked: true },
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Đã gửi cho 4 user/),
      ).toBeInTheDocument();
    });
  });
});

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (adminGetSettings as jest.Mock).mockResolvedValue({
      success: true,
      settings: { bot_enabled: true, site_banner: "" },
    });
  });

  it("renders known settings keys with current values", async () => {
    render(<AdminSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Bật bot Mezon")).toBeInTheDocument();
    });
    expect(screen.getByText("Cho phép đăng ký mới")).toBeInTheDocument();
    expect(screen.getByText("Banner thông báo toàn site")).toBeInTheDocument();
  });

  it("saves boolean setting on change + click", async () => {
    (adminSetSetting as jest.Mock).mockResolvedValue({
      success: true,
      setting: { key: "bot_enabled", value: false },
    });
    render(<AdminSettingsPage />);
    await waitFor(() => {
      expect(screen.getByText("Bật bot Mezon")).toBeInTheDocument();
    });
    const botToggle = screen.getAllByRole("checkbox")[0];
    fireEvent.click(botToggle);
    const saveBtns = screen.getAllByRole("button", { name: /lưu/i });
    fireEvent.click(saveBtns[0]);
    await waitFor(() => {
      expect(adminSetSetting).toHaveBeenCalledWith("bot_enabled", false);
    });
  });
});
