// Client-side utilities for header size management
"use client";

interface RequestValidation {
  isValid: boolean;
  totalHeaderSize: number;
  bodySize: number;
  issues: string[];
  recommendations: string[];
}

/**
 * بررسی اندازه هدرها و بدنه درخواست قبل از ارسال
 */
export function validateRequestSize(
  headers: Record<string, string>,
  body?: any
): RequestValidation {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // محاسبه اندازه هدرها
  let totalHeaderSize = 0;
  Object.entries(headers).forEach(([key, value]) => {
    totalHeaderSize += key.length + (value?.length || 0);
  });

  // محاسبه اندازه بدنه
  let bodySize = 0;
  if (body) {
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    bodySize = new TextEncoder().encode(bodyString).length;
  }

  // بررسی محدودیت‌ها
  const maxHeaderSize = 30 * 1024; // 30KB safe limit
  const maxBodySize = 100 * 1024; // 100KB for body

  if (totalHeaderSize > maxHeaderSize) {
    issues.push(
      `Headers too large: ${totalHeaderSize} bytes (max: ${maxHeaderSize})`
    );
  } else if (totalHeaderSize > maxHeaderSize * 0.8) {
    recommendations.push(`Headers approaching limit: ${totalHeaderSize} bytes`);
  }

  if (bodySize > maxBodySize) {
    issues.push(
      `Request body too large: ${bodySize} bytes (max: ${maxBodySize})`
    );
  }

  // بررسی هدرهای خاص
  Object.entries(headers).forEach(([key, value]) => {
    const headerSize = key.length + value.length;

    if (key.toLowerCase().includes("cookie") && headerSize > 16 * 1024) {
      issues.push(`Cookie header too large: ${headerSize} bytes`);
      recommendations.push(
        "Consider reducing cookie data or splitting into multiple cookies"
      );
    }

    if (key.toLowerCase().includes("authorization") && headerSize > 8 * 1024) {
      recommendations.push(
        "JWT token might be too large, consider reducing payload"
      );
    }
  });

  return {
    isValid: issues.length === 0,
    totalHeaderSize,
    bodySize,
    issues,
    recommendations,
  };
}

/**
 * Wrapper برای fetch که اندازه درخواست را بررسی می‌کند
 */
export async function safeFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = (options.headers as Record<string, string>) || {};

  // بررسی اندازه درخواست
  const validation = validateRequestSize(headers, options.body);

  if (!validation.isValid) {
    // eslint-disable-next-line no-console
    console.error("Request validation failed:", validation.issues);
    throw new Error(`Request too large: ${validation.issues.join(", ")}`);
  }

  // نمایش توصیه‌ها در development
  if (
    process.env.NODE_ENV === "development" &&
    validation.recommendations.length > 0
  ) {
    // eslint-disable-next-line no-console
    console.warn("Request size recommendations:", validation.recommendations);
  }

  // ارسال درخواست
  return fetch(url, options);
}

/**
 * بهینه‌سازی هدرهای درخواست
 */
export function optimizeRequestHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const optimized: Record<string, string> = {};

  // فقط هدرهای ضروری را نگه دار
  const essentialHeaders = [
    "accept",
    "accept-language",
    "authorization",
    "content-type",
    "cookie",
    "referer",
    "user-agent",
    "x-requested-with",
  ];

  Object.entries(headers).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    // نگه داشتن هدرهای ضروری
    if (essentialHeaders.includes(lowerKey) || lowerKey.startsWith("x-")) {
      optimized[key] = value;
    }
  });

  return optimized;
}

/**
 * کاهش اندازه cookie ها
 */
export function optimizeCookies(cookieString: string): string {
  const maxCookieSize = 4096; // 4KB per cookie (browser limit)

  if (cookieString.length <= maxCookieSize) {
    return cookieString;
  }

  // تقسیم cookies بزرگ
  const cookies = cookieString.split(";").map((c) => c.trim());
  const optimizedCookies: string[] = [];

  cookies.forEach((cookie) => {
    if (cookie.length <= maxCookieSize) {
      optimizedCookies.push(cookie);
    } else {
      // برای cookies خیلی بزرگ، فقط نام و بخشی از مقدار را نگه دار
      const [name, value] = cookie.split("=");
      if (name && value) {
        const maxValueLength = maxCookieSize - name.length - 1; // -1 for '='
        const truncatedValue = value.substring(0, maxValueLength);
        optimizedCookies.push(`${name}=${truncatedValue}`);
      }
    }
  });

  return optimizedCookies.join("; ");
}

/**
 * مانیتورینگ اندازه localStorage برای کنترل اندازه داده‌ها
 */
export function getLocalStorageSize(): {
  totalSize: number;
  itemSizes: Array<{ key: string; size: number }>;
  warnings: string[];
} {
  const itemSizes: Array<{ key: string; size: number }> = [];
  let totalSize = 0;
  const warnings: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        const size = new TextEncoder().encode(key + value).length;
        itemSizes.push({ key, size });
        totalSize += size;
      }
    }

    // هشدارها
    const maxRecommendedSize = 5 * 1024 * 1024; // 5MB
    if (totalSize > maxRecommendedSize) {
      warnings.push(
        `localStorage size (${totalSize}) exceeds recommended limit`
      );
    }

    itemSizes.sort((a, b) => b.size - a.size);
  } catch (error) {
    warnings.push("Error accessing localStorage");
  }

  return { totalSize, itemSizes, warnings };
}
