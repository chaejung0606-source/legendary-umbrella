/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Excel parsing (xlsx) is server-only; keep it external to the server bundle.
  serverExternalPackages: ["xlsx", "@prisma/client", "bcryptjs"],
  eslint: {
    // MVP: do not fail production builds on lint warnings.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
