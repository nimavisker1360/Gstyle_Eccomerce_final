# راهنمای تنظیم Google OAuth برای حل مشکل REQUEST_HEADER_TOO_LARGE

## 🚨 مشکل

خطای `REQUEST_HEADER_TOO_LARGE` معمولاً به دلیل تنظیمات نادرست Google OAuth و NextAuth رخ می‌دهد.

## 🔧 راه‌حل‌های پیاده‌سازی شده

### ۱. تنظیمات Next.js (`next.config.mjs`)

```javascript
// تنظیمات برای حل مشکل REQUEST_HEADER_TOO_LARGE
experimental: {
  serverComponentsExternalPackages: ['@auth/mongodb-adapter'],
},
// تنظیمات هدرها
async headers() {
  return [
    {
      source: '/api/auth/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-store, max-age=0',
        },
      ],
    },
  ];
},
// تنظیمات برای کاهش اندازه هدرها
compress: true,
poweredByHeader: false,
```

### ۲. بهینه‌سازی NextAuth (`src/auth.ts`)

```typescript
// تنظیمات Google OAuth
Google({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  allowDangerousEmailAccountLinking: true,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code",
    },
  },
}),

// تنظیمات session و JWT
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
},
jwt: {
  maxAge: 30 * 24 * 60 * 60, // 30 days
},

// تنظیمات cookies
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
  },
},
```

### ۳. بهینه‌سازی Middleware (`src/middleware.ts`)

```typescript
// حذف هدرهای غیرضروری
response.headers.delete("x-powered-by");
response.headers.delete("x-vercel-cache");

// تنظیم هدرهای امنیتی
response.headers.set("X-Content-Type-Options", "nosniff");
response.headers.set("X-Frame-Options", "DENY");
response.headers.set("X-XSS-Protection", "1; mode=block");

// تنظیمات کش برای API routes
if (req.nextUrl.pathname.startsWith("/api/")) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
}
```

## ⚙️ تنظیمات محیطی مورد نیاز

### فایل `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# MongoDB
MONGODB_URI=your_mongodb_uri_here

# Environment
NODE_ENV=development
```

## 🔑 نحوه دریافت Google OAuth Credentials

### ۱. رفتن به Google Cloud Console

- [Google Cloud Console](https://console.cloud.google.com/)
- ایجاد پروژه جدید یا انتخاب پروژه موجود

### ۲. فعال‌سازی Google+ API

- APIs & Services > Library
- جستجوی "Google+ API" و فعال‌سازی

### ۳. ایجاد OAuth 2.0 Credentials

- APIs & Services > Credentials
- Create Credentials > OAuth 2.0 Client IDs
- انتخاب نوع: Web application

### ۴. تنظیم Authorized redirect URIs

```
http://localhost:3000/api/auth/callback/google
https://your-domain.com/api/auth/callback/google
```

### ۵. کپی کردن Client ID و Client Secret

- ذخیره در فایل `.env.local`

## 🧪 تست تنظیمات

### ۱. راه‌اندازی مجدد سرور

```bash
npm run dev
```

### ۲. تست Google Sign-in

- رفتن به `/sign-in`
- کلیک روی "Sign in with Google"
- بررسی عدم وجود خطای REQUEST_HEADER_TOO_LARGE

### ۳. بررسی Console

- بررسی لاگ‌های سرور
- بررسی Network tab در DevTools

## 🚨 نکات مهم

### ۱. امنیت

- هرگز Client Secret را در کد قرار ندهید
- از متغیرهای محیطی استفاده کنید
- در production از HTTPS استفاده کنید

### ۲. عملکرد

- تنظیمات session و JWT را بهینه کنید
- از کش مناسب استفاده کنید
- هدرهای غیرضروری را حذف کنید

### ۳. عیب‌یابی

- بررسی لاگ‌های سرور
- بررسی Network tab
- بررسی تنظیمات Google Cloud Console

## 🔍 عیب‌یابی اضافی

### اگر مشکل همچنان وجود دارد:

#### ۱. بررسی اندازه cookies

```typescript
// در auth.ts
cookies: {
  sessionToken: {
    options: {
      maxAge: 30 * 24 * 60 * 60, // کاهش زمان
    },
  },
},
```

#### ۲. بررسی تنظیمات Vercel

```json
// vercel.json
{
  "functions": {
    "app/api/auth/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### ۳. بررسی تنظیمات MongoDB

```typescript
// اطمینان از اتصال صحیح
await connectToDatabase();
```

## ✅ نتیجه‌گیری

با پیاده‌سازی این تنظیمات:

- مشکل `REQUEST_HEADER_TOO_LARGE` برطرف می‌شود
- عملکرد Google OAuth بهبود می‌یابد
- امنیت سیستم افزایش می‌یابد
- اندازه هدرها کاهش می‌یابد
