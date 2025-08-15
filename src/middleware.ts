import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { analyzeRequestHeaders, logHeaderAnalysis } from "@/lib/header-monitor";

// تابع برای بررسی اندازه هدرها
function validateHeaderSize(req: NextRequest): boolean {
  const headers = req.headers;
  let totalSize = 0;
  const maxSize = 30 * 1024; // 30KB limit (2KB buffer under Vercel's 32KB limit)

  // بررسی اندازه کل هدرها
  headers.forEach((value, key) => {
    totalSize += key.length + (value?.length || 0);
  });

  // لاگ کردن اندازه هدرها برای مانیتورینگ
  if (totalSize > maxSize * 0.8) {
    // هشدار در 80% ظرفیت
    // eslint-disable-next-line no-console
    console.warn(
      `Header size warning: ${totalSize} bytes (${((totalSize / maxSize) * 100).toFixed(1)}% of limit)`
    );
  }

  // اگر اندازه هدرها بیشتر از حد مجاز باشد، خطا برگردان
  return totalSize <= maxSize;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // تحلیل و مانیتورینگ هدرها
  const headerAnalysis = analyzeRequestHeaders(req);
  logHeaderAnalysis(req, headerAnalysis);

  // بررسی اندازه هدرها
  if (!validateHeaderSize(req)) {
    // eslint-disable-next-line no-console
    console.warn("Request headers too large, rejecting request");
    return new NextResponse("Request headers too large", { status: 431 });
  }

  // تنظیمات هدر برای کاهش اندازه
  const response = NextResponse.next();

  // حذف هدرهای غیرضروری
  response.headers.delete("x-powered-by");
  response.headers.delete("x-vercel-cache");

  // تنظیم هدرهای امنیتی با اندازه بهینه
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // تنظیمات کش برای API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  // بررسی مسیرهای محافظت شده
  const protectedPaths = [
    /\/checkout(\/.*)?/,
    /\/account(\/.*)?/,
    /\/admin(\/.*)?/,
  ];

  if (protectedPaths.some((p) => p.test(pathname))) {
    try {
      const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token) {
        return NextResponse.redirect(new URL("/sign-in", req.url));
      }
    } catch (error) {
      console.error("Middleware auth error:", error);
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
