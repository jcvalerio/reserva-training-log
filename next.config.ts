import type { NextConfig } from "next";

import { parseAllowedDevOrigins } from "./src/config/dev-origins";

const allowedDevOrigins = parseAllowedDevOrigins(process.env.NEXT_ALLOWED_DEV_ORIGINS);

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default nextConfig;
