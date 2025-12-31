/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    esmExternals: "loose",
  },
  output: "export",
  distDir: "out",
  trailingSlash: true,
  
  // Performance optimizations
  swcMinify: true, // Use SWC minifier (faster and better than Terser)
  
  // Compiler optimizations (only in production)
  compiler: {
    // Remove console.log/warn/debug/info in production (keep console.error for critical errors)
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error'] } // Keep console.error for critical error tracking
      : false,
  },
};

export default nextConfig;
