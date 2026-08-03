const apiInternalUrl = process.env.API_INTERNAL_URL || "http://127.0.0.1:3188";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }];
  }
};

export default nextConfig;
