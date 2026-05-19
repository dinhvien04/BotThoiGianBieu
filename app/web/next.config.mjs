if (
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_URL
) {
  // eslint-disable-next-line no-console
  console.warn(
    "[next.config] WARN: NEXT_PUBLIC_API_URL not set, falling back to http://localhost:3001. " +
    "Set it explicitly for production deploys.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${apiUrl}/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
