import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project directory. Without this, Next.js can
  // mis-detect the root when a stray lockfile exists in a parent folder (e.g. if
  // this project lives inside another folder that also has a package-lock.json),
  // which produces a confusing "multiple lockfiles" warning.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // These read their own assets from disk / fetch a remote binary at runtime and
  // shouldn't be bundled by Next.js — keep them as plain Node.js requires so
  // Puppeteer/Chromium behave the same in the serverless function as they do locally.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "puppeteer"],
};

export default nextConfig;
