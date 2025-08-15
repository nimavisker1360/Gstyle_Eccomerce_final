// تست توابع validation برای هدرها
// این فایل برای تست کردن توابع validation ایجاد شده است

import {
  validateHeaderSize,
  validateCookieSize,
  validateRequestSize,
  optimizeHeaders,
} from "./utils";

// تست تابع validateHeaderSize
export function testHeaderValidation() {
  console.log("=== Testing Header Validation ===");

  // تست هدرهای کوچک
  const smallHeaders = new Headers();
  smallHeaders.set("authorization", "Bearer small-token");
  smallHeaders.set("content-type", "application/json");

  const smallValidation = validateHeaderSize(smallHeaders);
  console.log("Small headers:", {
    size: smallValidation.size,
    maxSize: smallValidation.maxSize,
    isValid: smallValidation.isValid,
  });

  // تست هدرهای بزرگ (شبیه‌سازی)
  const largeHeaders = new Headers();
  largeHeaders.set("authorization", "Bearer " + "x".repeat(50 * 1024)); // 50KB header
  largeHeaders.set("content-type", "application/json");

  const largeValidation = validateHeaderSize(largeHeaders);
  console.log("Large headers:", {
    size: largeValidation.size,
    maxSize: largeValidation.maxSize,
    isValid: largeValidation.isValid,
  });

  return {
    small: smallValidation,
    large: largeValidation,
  };
}

// تست تابع validateCookieSize
export function testCookieValidation() {
  console.log("\n=== Testing Cookie Validation ===");

  // تست cookie کوچک
  const smallCookie = "session=abc123; user=john";
  const smallCookieValidation = validateCookieSize(smallCookie);
  console.log("Small cookie:", {
    size: smallCookieValidation.size,
    maxSize: smallCookieValidation.maxSize,
    isValid: smallCookieValidation.isValid,
  });

  // تست cookie بزرگ
  const largeCookie = "session=" + "x".repeat(20 * 1024); // 20KB cookie
  const largeCookieValidation = validateCookieSize(largeCookie);
  console.log("Large cookie:", {
    size: largeCookieValidation.size,
    maxSize: largeCookieValidation.maxSize,
    isValid: largeCookieValidation.isValid,
  });

  return {
    small: smallCookieValidation,
    large: largeCookieValidation,
  };
}

// تست تابع optimizeHeaders
export function testHeaderOptimization() {
  console.log("\n=== Testing Header Optimization ===");

  const originalHeaders = new Headers();
  originalHeaders.set("authorization", "Bearer token");
  originalHeaders.set("content-type", "application/json");
  originalHeaders.set("x-custom-header", "custom-value");
  originalHeaders.set("x-vercel-cache", "cache-value");
  originalHeaders.set("x-powered-by", "Next.js");

  console.log(
    "Original headers count:",
    Array.from(originalHeaders.keys()).length
  );

  const optimizedHeaders = optimizeHeaders(originalHeaders);
  console.log(
    "Optimized headers count:",
    Array.from(optimizedHeaders.keys()).length
  );

  // نمایش هدرهای بهینه شده
  optimizedHeaders.forEach((value, key) => {
    console.log(`Optimized: ${key} = ${value}`);
  });

  return {
    original: originalHeaders,
    optimized: optimizedHeaders,
  };
}

// تست تابع validateRequestSize
export function testRequestValidation() {
  console.log("\n=== Testing Request Validation ===");

  // شبیه‌سازی درخواست با content-length
  const mockRequest = {
    headers: new Headers({
      "content-length": "1024", // 1KB
    }),
  } as Request;

  const smallRequestValidation = validateRequestSize(mockRequest);
  console.log("Small request:", {
    size: smallRequestValidation.size,
    maxSize: smallRequestValidation.maxSize,
    isValid: smallRequestValidation.isValid,
  });

  // شبیه‌سازی درخواست بزرگ
  const largeMockRequest = {
    headers: new Headers({
      "content-length": "200000", // 200KB
    }),
  } as Request;

  const largeRequestValidation = validateRequestSize(largeMockRequest);
  console.log("Large request:", {
    size: largeRequestValidation.size,
    maxSize: largeRequestValidation.maxSize,
    isValid: largeRequestValidation.isValid,
  });

  return {
    small: smallRequestValidation,
    large: largeRequestValidation,
  };
}

// اجرای تمام تست‌ها
export function runAllTests() {
  console.log("🚀 Starting Header Validation Tests...\n");

  try {
    const headerResults = testHeaderValidation();
    const cookieResults = testCookieValidation();
    const optimizationResults = testHeaderOptimization();
    const requestResults = testRequestValidation();

    console.log("\n=== Test Summary ===");
    console.log(
      "Header validation:",
      headerResults.small.isValid ? "✅ PASS" : "❌ FAIL"
    );
    console.log(
      "Cookie validation:",
      cookieResults.small.isValid ? "✅ PASS" : "❌ FAIL"
    );
    console.log(
      "Header optimization:",
      Array.from(optimizationResults.optimized.keys()).length <
        Array.from(optimizationResults.original.keys()).length
        ? "✅ PASS"
        : "❌ FAIL"
    );
    console.log(
      "Request validation:",
      requestResults.small.isValid ? "✅ PASS" : "❌ FAIL"
    );

    console.log("\n🎉 All tests completed!");

    return {
      headerResults,
      cookieResults,
      optimizationResults,
      requestResults,
    };
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    throw error;
  }
}

// اگر فایل مستقیماً اجرا شود
if (typeof window !== "undefined") {
  // در محیط browser
  (window as any).testHeaderValidation = runAllTests;
} else {
  // در محیط Node.js
  runAllTests();
}
