/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: process.env.NEXT_STANDALONE === "true" ? "standalone" : undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@qianfu/core"],
  async rewrites() {
    const apiOrigin = process.env.API_INTERNAL_URL || "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
