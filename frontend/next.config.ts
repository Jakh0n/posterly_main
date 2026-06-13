import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this app so module resolution does not
  // get confused by sibling lockfiles in the monorepo.
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
