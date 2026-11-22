// next.config.js
const nextConfig = {
  output: "export",
  trailingSlash: true,
  assetPrefix: "./",
  images: { unoptimized: true },
  generateBuildId: async () => "static",
};

export default nextConfig;
