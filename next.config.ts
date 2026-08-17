import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project directory. Without this, Next.js can
  // mis-detect the root when a stray lockfile exists in a parent folder, which
  // produces a confusing "multiple lockfiles" warning.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
