const DEFAULT_API_URL = "http://localhost:3001";

export default function ConnectMezonPage() {
  const mezonLoginUrl = createMezonLoginUrl();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white">
          M
        </div>
        <h2 className="text-2xl font-bold text-on-surface">Kết nối Mezon</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          Đăng nhập bằng Mezon để liên kết tài khoản và sử dụng dashboard.
        </p>
      </div>

      <div className="space-y-3">
        {[
          {
            title: "Nhắc nhở tự động",
            desc: "Nhận thông báo trước sự kiện qua Mezon chat",
          },
          {
            title: "Quản lý bằng lệnh",
            desc: "Dùng lệnh bot ngay trong kênh Mezon của bạn",
          },
          {
            title: "Đồng bộ dữ liệu",
            desc: "Web dashboard và bot dùng chung tài khoản Mezon",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-lg border border-outline-variant bg-surface-container-low p-4"
          >
            <p className="text-sm font-medium text-on-surface">{item.title}</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      <a
        href={mezonLoginUrl}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-4 font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-sm font-black">
          M
        </span>
        Tiếp tục với Mezon
      </a>
    </div>
  );
}

function createMezonLoginUrl(): string {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
  ).replace(/\/+$/, "");
  const url = new URL("/auth/mezon", apiBaseUrl);
  url.searchParams.set("returnTo", "/dashboard");
  return url.toString();
}
