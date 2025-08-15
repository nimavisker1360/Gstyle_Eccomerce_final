/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "serpapi.com",
      "encrypted-tbn0.gstatic.com",
      "encrypted-tbn1.gstatic.com",
      "encrypted-tbn2.gstatic.com",
      "encrypted-tbn3.gstatic.com",
      "lh3.googleusercontent.com",
      "images.unsplash.com",
      "via.placeholder.com",
    ],
  },
  // تنظیمات برای حل مشکل REQUEST_HEADER_TOO_LARGE
  experimental: {
    // حذف serverComponentsExternalPackages برای جلوگیری از conflict
    // optimizePackageImports: ["@auth/mongodb-adapter"],
  },
  // تنظیمات هدرها
  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/cart/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Requested-With",
            value: "XMLHttpRequest",
          },
        ],
      },
    ];
  },
  // تنظیمات برای کاهش اندازه هدرها
  compress: true,
  poweredByHeader: false,
  // تنظیمات اضافی برای بهینه‌سازی
  swcMinify: true,
  // تنظیمات برای کاهش اندازه bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
