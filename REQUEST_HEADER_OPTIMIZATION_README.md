# REQUEST_HEADER_TOO_LARGE Error Resolution Guide

## مشکل

خطای `REQUEST_HEADER_TOO_LARGE` زمانی رخ می‌دهد که اندازه هدرهای درخواست در Edge Functions و Routing Middleware از حد مجاز تجاوز کند. در Vercel:

- هر هدر جداگانه نباید از 16 KB بیشتر باشد
- مجموع اندازه تمام هدرها نباید از 32 KB بیشتر باشد

## راه‌حل‌های پیاده‌سازی شده

### 1. بهینه‌سازی Middleware (`src/middleware.ts`)

- اضافه کردن تابع `validateHeaderSize` برای بررسی اندازه هدرها
- رد کردن درخواست‌هایی که هدرهای خیلی بزرگ دارند (کد خطای 431)
- بهینه‌سازی هدرهای پاسخ

### 2. بهینه‌سازی Next.js Config (`next.config.mjs`)

- فعال کردن `compress: true` برای فشرده‌سازی
- غیرفعال کردن `poweredByHeader`
- فعال کردن `swcMinify` برای بهینه‌سازی
- تنظیم هدرهای بهینه برای API routes

### 3. بهینه‌سازی Cart Store (`src/hooks/use-cart-store.ts`)

- کاهش داده‌های ذخیره شده در localStorage
- بهینه‌سازی داده‌ها قبل از ارسال به سرور
- افزایش تاخیر sync برای کاهش تعداد درخواست‌ها
- استفاده از `partialize` برای محدود کردن داده‌های persist شده

### 4. بهینه‌سازی Authentication (`src/auth.ts`)

- کاهش مدت زمان session از 30 روز به 7 روز
- حذف فیلدهای غیرضروری از token و session
- بهینه‌سازی تنظیمات cookies
- کاهش اندازه cookies با تنظیم maxAge مناسب

### 5. ایجاد Utility Functions (`src/lib/utils.ts`)

- `validateHeaderSize`: بررسی اندازه هدرها
- `optimizeHeaders`: بهینه‌سازی هدرها
- `validateCookieSize`: بررسی اندازه cookies
- `optimizeSessionData`: بهینه‌سازی داده‌های session
- `validateRequestSize`: بررسی اندازه درخواست

### 6. ایجاد API Wrapper (`src/lib/api-wrapper.ts`)

- `withHeaderValidation`: wrapper برای API routes
- `setOptimizedHeaders`: تنظیم هدرهای بهینه
- `validateAndOptimizeCookies`: بررسی و بهینه‌سازی cookies
- `createErrorResponse` و `createSuccessResponse`: ایجاد پاسخ‌های بهینه

### 7. بهینه‌سازی Cart API (`src/app/api/cart/route.ts`)

- استفاده از wrapper برای validation
- استفاده از توابع helper برای ایجاد پاسخ‌ها
- بهینه‌سازی هدرهای پاسخ

## نکات مهم

### محدودیت‌های اندازه

- **هدرهای فردی**: حداکثر 16 KB
- **مجموع هدرها**: حداکثر 32 KB
- **Cookies**: حداکثر 16 KB
- **بدنه درخواست**: حداکثر 100 KB

### بهترین شیوه‌ها

1. **کاهش داده‌های session**: فقط اطلاعات ضروری را ذخیره کنید
2. **بهینه‌سازی cookies**: از cookies کوچک استفاده کنید
3. **محدود کردن هدرها**: فقط هدرهای ضروری را تنظیم کنید
4. **فشرده‌سازی**: از فشرده‌سازی برای کاهش اندازه استفاده کنید
5. **Validation**: همیشه اندازه هدرها را بررسی کنید

### مانیتورینگ

- از console.warn برای ثبت هدرهای بزرگ استفاده کنید
- اندازه هدرها را در production لاگ کنید
- از ابزارهای monitoring برای بررسی عملکرد استفاده کنید

## تست کردن

### بررسی اندازه هدرها

```typescript
import { validateHeaderSize } from "@/lib/utils";

const headers = new Headers();
headers.set("authorization", "Bearer token...");
headers.set("content-type", "application/json");

const validation = validateHeaderSize(headers);
console.log(`Headers size: ${validation.size} bytes`);
console.log(`Valid: ${validation.isValid}`);
```

### استفاده از API Wrapper

```typescript
import { withHeaderValidation } from "@/lib/api-wrapper";

export const GET = withHeaderValidation(async (req: NextRequest) => {
  // کد API شما
  return createSuccessResponse(data);
});
```

## نتیجه‌گیری

با پیاده‌سازی این راه‌حل‌ها، مشکل `REQUEST_HEADER_TOO_LARGE` باید حل شود. این تغییرات:

- اندازه هدرها را کاهش می‌دهند
- عملکرد را بهبود می‌بخشند
- امنیت را افزایش می‌دهند
- قابلیت نگهداری کد را بهبود می‌بخشند

### 8. مانیتورینگ و تحلیل پیشرفته

#### نیو در این به‌روزرسانی:

- **Header Monitor (`src/lib/header-monitor.ts`)**: سیستم تحلیل و مانیتورینگ پیشرفته
- **Client Header Utils (`src/lib/client-header-utils.ts`)**: ابزارهای client-side برای validation
- **Header Monitor Dashboard (`src/components/shared/header-monitor-dashboard.tsx`)**: داشبورد visual برای development
- **Enhanced Middleware**: middleware بهینه‌شده با قابلیت‌های تحلیل بیشتر
- **Safe Fetch Wrapper**: wrapper امن برای درخواست‌های HTTP

#### ویژگی‌های جدید:

1. **تحلیل دقیق هدرها**: شناسایی بزرگترین هدرها و منابع مشکل
2. **هشدارهای هوشمند**: هشدار در 80% ظرفیت برای پیشگیری از مشکل
3. **مانیتورینگ real-time**: بررسی مداوم اندازه localStorage و cookies
4. **بهینه‌سازی خودکار**: کاهش خودکار اندازه cookies و هدرها
5. **Development Dashboard**: ابزار visual برای نظارت در development mode

#### نحوه استفاده:

```typescript
// استفاده از safeFetch در client
import { safeFetch } from "@/lib/client-header-utils";

const response = await safeFetch("/api/cart", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

```typescript
// استفاده از header monitoring در API routes
import { withHeaderMonitoring } from "@/lib/header-monitor";

export const GET = withHeaderMonitoring(async (req) => {
  // کد API شما
});
```

#### فعال‌سازی Dashboard:

Dashboard به صورت خودکار در development mode نمایش داده می‌شود. برای فعال‌سازی در component:

```tsx
import HeaderMonitorDashboard from "@/components/shared/header-monitor-dashboard";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <HeaderMonitorDashboard />
    </>
  );
}
```

## نتایج بهینه‌سازی

### بهبودهای اندازه:

- **Session Duration**: کاهش از 30 روز به 7 روز (-77%)
- **Cookie Expiry**: کاهش callback و CSRF از 1 ساعت به 30 دقیقه (-50%)
- **Header Validation**: بافر 2KB برای جلوگیری از edge cases
- **Client-side Validation**: پیشگیری از ارسال درخواست‌های بزرگ

### امنیت بهبود یافته:

- **Secure Cookie Names**: استفاده از پیشوند `__Host-`
- **Reduced Attack Surface**: کاهش زمان عمر توکن‌ها
- **Header Sanitization**: پاک‌سازی خودکار هدرهای غیرضروری

### نظارت و عیب‌یابی:

- **Real-time Monitoring**: مانیتورینگ مداوم اندازه هدرها
- **Detailed Logging**: لاگ دقیق برای troubleshooting
- **Visual Dashboard**: ابزار گرافیکی برای نظارت در development

## منابع

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [HTTP Headers Specification](https://tools.ietf.org/html/rfc7230)
- [Web Security Best Practices](https://owasp.org/www-project-web-security-testing-guide/)
- [Cookie Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
