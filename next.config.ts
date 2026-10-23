import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // There is a stray package-lock.json in the home folder; this project is the root.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
