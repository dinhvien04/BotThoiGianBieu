import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "btgb_auth";
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/lich",
  "/lich-su",
  "/mau-lich",
  "/nhac-viec",
  "/nhap-xuat",
  "/the",
  "/thong-bao",
  "/thong-ke",
  "/tro-giup",
  "/cai-dat",
  "/chia-se",
  "/ho-so",
  "/onboarding",
  "/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(AUTH_COOKIE);

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/dang-nhap";
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/dang-nhap" && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/lich/:path*",
    "/lich-su/:path*",
    "/mau-lich/:path*",
    "/nhac-viec/:path*",
    "/nhap-xuat/:path*",
    "/the/:path*",
    "/thong-bao/:path*",
    "/thong-ke/:path*",
    "/tro-giup/:path*",
    "/cai-dat/:path*",
    "/chia-se/:path*",
    "/ho-so/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/dang-nhap",
  ],
};

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
