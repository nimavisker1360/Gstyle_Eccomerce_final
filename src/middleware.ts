import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// تابع برای بررسی اندازه هدرها
function validateHeaderSize(req: NextRequest): boolean {
  const headers = req.headers;
  let totalSize = 0;

  // بررسی اندازه کل هدرها
  headers.forEach((value, key) => {
    totalSize += key.length + (value?.length || 0);
  });

  // اگر اندازه هدرها بیشتر از 30KB باشد، خطا برگردان
  return totalSize <= 30 * 1024;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // بررسی اندازه هدرها
  if (!validateHeaderSize(req)) {
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
