import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"], // native module: keep out of the bundle
  poweredByHeader: false,
  reactStrictMode: true,
};
export default config;
