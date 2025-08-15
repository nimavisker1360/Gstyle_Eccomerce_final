import { NextRequest, NextResponse } from "next/server";
import {
  validateHeaderSize,
  validateRequestSize,
  optimizeHeaders,
} from "./utils";

// تابع wrapper برای API routes که شامل بررسی اندازه هدرها است
export function withHeaderValidation(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // بررسی اندازه هدرها
      const headerValidation = validateHeaderSize(req.headers);
      if (!headerValidation.isValid) {
        console.warn(
          `Request headers too large: ${headerValidation.size} bytes (max: ${headerValidation.maxSize})`
        );
        return NextResponse.json(
          {
            error: "Request headers too large",
            details: `Headers size: ${headerValidation.size} bytes, Max allowed: ${headerValidation.maxSize} bytes`,
          },
          { status: 431 }
        );
      }

      // بررسی اندازه درخواست
      const requestValidation = validateRequestSize(req);
      if (!requestValidation.isValid) {
        console.warn(
          `Request body too large: ${requestValidation.size} bytes (max: ${requestValidation.maxSize})`
        );
        return NextResponse.json(
          {
            error: "Request body too large",
            details: `Body size: ${requestValidation.size} bytes, Max allowed: ${requestValidation.maxSize} bytes`,
          },
          { status: 413 }
        );
      }

      // اجرای handler اصلی
      return await handler(req);
    } catch (error) {
      console.error("API wrapper error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// تابع برای تنظیم هدرهای بهینه در پاسخ
export function setOptimizedHeaders(response: NextResponse): NextResponse {
  // حذف هدرهای غیرضروری
  response.headers.delete("x-powered-by");
  response.headers.delete("x-vercel-cache");

  // تنظیم هدرهای امنیتی با اندازه بهینه
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // تنظیم هدرهای کش
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

// تابع برای بررسی و بهینه‌سازی cookies
export function validateAndOptimizeCookies(cookies: string): {
  isValid: boolean;
  optimized: string;
} {
  const maxCookieSize = 16 * 1024; // 16KB per cookie
  const cookieSize = new TextEncoder().encode(cookies).length;

  if (cookieSize > maxCookieSize) {
    // اگر cookie خیلی بزرگ است، آن را بهینه کن
    const optimized = cookies.substring(0, maxCookieSize / 2); // نصف اندازه
    return { isValid: false, optimized };
  }

  return { isValid: true, optimized: cookies };
}

// تابع برای ایجاد پاسخ خطا با هدرهای بهینه
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );

  return setOptimizedHeaders(response);
}

// تابع برای ایجاد پاسخ موفق با هدرهای بهینه
export function createSuccessResponse(
  data: any,
  status: number = 200
): NextResponse {
  const response = NextResponse.json({ success: true, data }, { status });

  return setOptimizedHeaders(response);
}
