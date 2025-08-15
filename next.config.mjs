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
    serverComponentsExternalPackages: ["@auth/mongodb-adapter"],
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
    ];
  },
  // تنظیمات برای کاهش اندازه هدرها
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
