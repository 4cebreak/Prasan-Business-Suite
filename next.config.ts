import type { NextConfig } from "next";

import os from "os";

const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
};

const localIPs = getLocalIPs();

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "jspdf",
    "@prisma/client",
    ".prisma/client",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  // @ts-ignore - Some Next.js versions use this for dev origin matching
  allowedDevOrigins: [...localIPs, "localhost:3000"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        ...localIPs.map((ip) => `${ip}:3000`),
      ],
    },
  },
};

export default nextConfig;
