type LoginPageProps = {
  searchParams?: {
    error?: string;
    next?: string;
  };
};

const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_RETURN_TO = "/dashboard";

export default function LoginPage({ searchParams }: LoginPageProps) {
  const mezonLoginUrl = createMezonLoginUrl(
    sanitizeReturnTo(searchParams?.next),
  );
  const errorMessage = getErrorMessage(searchParams?.error);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-on-surface">
            FocusFlow Pro
          </span>
        </div>

        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white">
          M
        </div>
        <h1 className="text-2xl font-bold text-on-surface">
          Đăng nhập bằng Mezon
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Sử dụng tài khoản Mezon để vào dashboard quản lý lịch trình.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
          {errorMessage}
        </div>
      )}

      <a
        href={mezonLoginUrl}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/15 text-sm font-black">
          M
        </span>
        Tiếp tục với Mezon
      </a>

      <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-4">
        <p className="text-sm font-medium text-on-surface">
          Chỉ hỗ trợ đăng nhập Mezon
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Tài khoản sẽ được tạo tự động trong lần đăng nhập Mezon đầu tiên.
        </p>
      </div>
    </div>
  );
}

function createMezonLoginUrl(returnTo: string): string {
  const apiBaseUrl = (
    process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
  ).replace(/\/+$/, "");
  const url = new URL("/auth/mezon", apiBaseUrl);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

function sanitizeReturnTo(value?: string): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return DEFAULT_RETURN_TO;
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  if (error === "mezon_failed") {
    return "Không thể hoàn tất đăng nhập Mezon. Vui lòng thử lại.";
  }

  return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại bằng Mezon.";
}
