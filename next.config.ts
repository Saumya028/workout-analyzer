// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
//   reactCompiler: true,
// };

// export default nextConfig;
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["mongoose"],
  turbopack: {},               // silences the webpack warning
  allowedDevOrigins: ["192.168.16.105"],  // fixes the cross-origin warning
};

export default nextConfig;