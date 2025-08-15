// Header monitoring utilities for production debugging
import { NextRequest, NextResponse } from "next/server";

interface HeaderAnalysis {
  totalSize: number;
  largestHeaders: Array<{ name: string; size: number }>;
  warnings: string[];
  recommendations: string[];
}

/**
 * تحلیل دقیق هدرهای درخواست برای یافتن مشکلات اندازه
 */
export function analyzeRequestHeaders(req: NextRequest): HeaderAnalysis {
  const headers = req.headers;
  const headerSizes: Array<{ name: string; size: number }> = [];
  let totalSize = 0;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // محاسبه اندازه هر هدر
  headers.forEach((value, key) => {
    const headerSize = key.length + (value?.length || 0);
    headerSizes.push({ name: key, size: headerSize });
    totalSize += headerSize;
  });

  // مرتب‌سازی بر اساس اندازه (بزرگترین اول)
  const largestHeaders = headerSizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 10); // Top 10 largest headers

  // تولید هشدارها و توصیه‌ها
  const maxTotalSize = 32 * 1024; // 32KB Vercel limit
  const recommendedSize = 30 * 1024; // 30KB recommended

  if (totalSize > maxTotalSize) {
    warnings.push(
      `Total header size (${totalSize}) exceeds Vercel limit (${maxTotalSize})`
    );
  } else if (totalSize > recommendedSize) {
    warnings.push(
      `Total header size (${totalSize}) approaching limit (${maxTotalSize})`
    );
  }

  // بررسی هدرهای مشکوک
  largestHeaders.forEach((header) => {
    if (header.size > 16 * 1024) {
      // 16KB per header
      warnings.push(
        `Header '${header.name}' is too large: ${header.size} bytes`
      );
    } else if (header.size > 8 * 1024) {
      // 8KB warning threshold
      warnings.push(`Header '${header.name}' is large: ${header.size} bytes`);
    }

    // توصیه‌های خاص برای هدرهای مختلف
    if (
      header.name.toLowerCase().includes("cookie") &&
      header.size > 4 * 1024
    ) {
      recommendations.push(
        `Consider reducing cookie size for '${header.name}'`
      );
    }
    if (
      header.name.toLowerCase().includes("authorization") &&
      header.size > 2 * 1024
    ) {
      recommendations.push(`JWT token in '${header.name}' might be too large`);
    }
    if (
      header.name.toLowerCase().includes("user-agent") &&
      header.size > 1024
    ) {
      recommendations.push(
        `User-Agent header is unusually large: ${header.size} bytes`
      );
    }
  });

  return {
    totalSize,
    largestHeaders,
    warnings,
    recommendations,
  };
}

/**
 * لاگ کردن تحلیل هدرها در حالت development
 */
export function logHeaderAnalysis(
  req: NextRequest,
  analysis: HeaderAnalysis
): void {
  if (process.env.NODE_ENV !== "development") return;

  /* eslint-disable no-console */
  // استفاده از روش simple logging برای ESLint
  const logPrefix = "🔍 Header Analysis";
  const separator = "=".repeat(50);
  
  console.log(`\n${separator}`);
  console.log(logPrefix);
  console.log(`Total Size: ${analysis.totalSize} bytes (${((analysis.totalSize / (32 * 1024)) * 100).toFixed(1)}% of limit)`);

  if (analysis.largestHeaders.length > 0) {
    console.log("\nLargest Headers:");
    analysis.largestHeaders.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header.name}: ${header.size} bytes`);
    });
  }

  if (analysis.warnings.length > 0) {
    console.log("\n⚠️ Warnings:");
    analysis.warnings.forEach((warning) => {
      console.warn(`  - ${warning}`);
    });
  }

  if (analysis.recommendations.length > 0) {
    console.log("\n💡 Recommendations:");
    analysis.recommendations.forEach((rec) => {
      console.log(`  - ${rec}`);
    });
  }

  console.log(`${separator}\n`);
  /* eslint-enable no-console */
}

/**
 * Middleware wrapper برای مانیتورینگ هدرها
 */
export function withHeaderMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const analysis = analyzeRequestHeaders(req);

    // لاگ در development
    logHeaderAnalysis(req, analysis);

    // در production فقط خطاهای جدی را لاگ کن
    if (process.env.NODE_ENV === "production" && analysis.warnings.length > 0) {
      /* eslint-disable-next-line no-console */
      console.warn("Header size warnings:", {
        url: req.url,
        totalSize: analysis.totalSize,
        warnings: analysis.warnings.slice(0, 3), // فقط 3 هشدار اول
      });
    }

    // اگر هدرها خیلی بزرگ باشند، درخواست را رد کن
    if (analysis.totalSize > 32 * 1024) {
      return NextResponse.json(
        {
          error: "Request headers too large",
          details: {
            totalSize: analysis.totalSize,
            limit: 32 * 1024,
            largestHeaders: analysis.largestHeaders.slice(0, 5),
          },
        },
        { status: 431 }
      );
    }

    return handler(req);
  };
}

/**
 * تابع برای تست اندازه هدرها قبل از ارسال درخواست
 */
export function validateClientHeaders(headers: Record<string, string>): {
  isValid: boolean;
  totalSize: number;
  issues: string[];
} {
  let totalSize = 0;
  const issues: string[] = [];

  Object.entries(headers).forEach(([key, value]) => {
    const headerSize = key.length + (value?.length || 0);
    totalSize += headerSize;

    // بررسی اندازه هر هدر
    if (headerSize > 16 * 1024) {
      issues.push(`Header '${key}' exceeds 16KB limit: ${headerSize} bytes`);
    }
  });

  // بررسی اندازه کل
  if (totalSize > 30 * 1024) {
    // 30KB safe limit
    issues.push(`Total headers size exceeds safe limit: ${totalSize} bytes`);
  }

  return {
    isValid: issues.length === 0,
    totalSize,
    issues,
  };
}
