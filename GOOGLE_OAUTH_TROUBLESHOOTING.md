# Google OAuth Troubleshooting Guide

## مشکلات رایج Google OAuth و راه‌حل‌ها

### 🚨 علائم مشکل REQUEST_HEADER_TOO_LARGE در Google OAuth

1. **خطای 431 Request Header Fields Too Large**
2. **عدم تکمیل فرآیند sign-in**
3. **redirect بی‌نهایت در صفحه login**
4. **خطای CSRF در console**

### 🔍 علل احتمالی

#### 1. **Cookie Names با `__Host-` Prefix**

```typescript
// مشکل در development:
name: `__Host-next-auth.session-token`; // نیاز به HTTPS دارد
```

**راه‌حل:** استفاده از conditional naming

```typescript
name: process.env.NODE_ENV === "production"
  ? `__Host-next-auth.session-token`
  : `next-auth.session-token`;
```

#### 2. **Google OAuth Scopes زیاد**

```typescript
// مشکل: scope های اضافی
scope: "openid email profile https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";
```

**راه‌حل:** محدود کردن scope

```typescript
scope: "openid email profile"; // فقط ضروری‌ها
```

#### 3. **Profile Data زیاد**

```typescript
// مشکل: ذخیره تمام profile data
profile(profile) {
  return profile; // همه چیز ذخیره می‌شود
}
```

**راه‌حل:** فیلتر کردن داده‌ها

```typescript
profile(profile) {
  return {
    id: profile.sub,
    name: profile.name,
    email: profile.email,
    image: profile.picture,
    // فقط فیلدهای ضروری
  };
}
```

### 🛠 راه‌حل‌های پیاده‌سازی شده

#### 1. **بهینه‌سازی Cookie Configuration**

✅ **Cookie Names**: conditional naming برای development و production  
✅ **Cookie Expiry**: کاهش زمان انقضاء  
✅ **Cookie Size**: محدود کردن اندازه

#### 2. **Google Provider Optimization**

✅ **Scope Limitation**: محدود کردن به `openid email profile`  
✅ **Profile Filtering**: فقط فیلدهای ضروری  
✅ **Authorization Params**: بهینه‌سازی parameters

#### 3. **Session Management**

✅ **JWT Strategy**: استفاده از JWT به جای database session  
✅ **Session Duration**: کاهش از 30 روز به 7 روز  
✅ **Token Size**: کاهش اندازه JWT token

### 🔧 ابزارهای عیب‌یابی

#### 1. **Google OAuth Debug Component**

```tsx
import GoogleOAuthDebug from "@/components/shared/google-oauth-debug";

// اضافه کردن به layout برای development
<GoogleOAuthDebug />;
```

#### 2. **Header Monitor Dashboard**

```tsx
import HeaderMonitorDashboard from "@/components/shared/header-monitor-dashboard";

<HeaderMonitorDashboard />;
```

### 📋 مراحل عیب‌یابی

#### مرحله 1: بررسی محیط

```bash
# بررسی متغیرهای محیطی
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET
echo $NEXTAUTH_SECRET
echo $NEXTAUTH_URL
```

#### مرحله 2: بررسی Cookies

1. باز کردن Developer Tools → Application → Cookies
2. بررسی cookies با پیشوند `next-auth`
3. محاسبه اندازه کل cookies

#### مرحله 3: تست Manual

```typescript
// تست مستقیم Google OAuth
window.location.href = "/api/auth/signin/google";
```

#### مرحله 4: پاک کردن State

```javascript
// پاک کردن تمام auth cookies
const authCookies = document.cookie
  .split(";")
  .filter((cookie) => cookie.includes("next-auth"))
  .forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
```

### 🚀 تست و Verification

#### 1. **Development Test**

```bash
npm run dev
# باز کردن http://localhost:3000/sign-in
# تست Google sign-in
```

#### 2. **Production Test**

```bash
npm run build
npm run start
# تست در production mode
```

#### 3. **Header Size Monitoring**

```typescript
// استفاده از header monitor
import { analyzeRequestHeaders } from "@/lib/header-monitor";

const analysis = analyzeRequestHeaders(req);
console.log("Header Analysis:", analysis);
```

### 🔒 تنظیمات امنیتی

#### Google Cloud Console Settings:

1. **Authorized JavaScript origins**:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)

2. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### 📊 نظارت و Monitoring

#### 1. **Real-time Cookie Monitoring**

- استفاده از Google OAuth Debug component
- نظارت مداوم اندازه cookies
- هشدار زمان نزدیک شدن به حد مجاز

#### 2. **Production Logging**

```typescript
// لاگ کردن مشکلات Google OAuth
console.log("Google OAuth Error:", {
  timestamp: new Date(),
  error: error.message,
  cookieSize: document.cookie.length,
  userAgent: navigator.userAgent.substring(0, 100),
});
```

### ⚡ نکات عملکرد

1. **Cookie Management**: حذف خودکار cookies منقضی شده
2. **Session Cleanup**: پاک کردن session های قدیمی
3. **Header Compression**: فشرده‌سازی هدرها در production
4. **CDN Configuration**: تنظیمات مناسب CDN برای auth routes

### 🔄 مراحل بازیابی

در صورت بروز مشکل:

1. **پاک کردن Browser Cache**
2. **حذف تمام Cookies مربوط به NextAuth**
3. **Restart Development Server**
4. **بررسی Network Tab در DevTools**
5. **تست با مرورگر incognito**

### 📞 Support و منابع

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Vercel Header Limits](https://vercel.com/docs/concepts/limits/overview)

### 🆕 ویژگی‌های جدید در این پیاده‌سازی

✅ **Development/Production Cookie Names**  
✅ **Optimized Google Profile Handling**  
✅ **Real-time OAuth State Monitoring**  
✅ **Automatic Cookie Cleanup**  
✅ **Header Size Validation**  
✅ **Visual Debug Dashboard**

این راه‌حل‌ها مشکل REQUEST_HEADER_TOO_LARGE در Google OAuth را به طور کامل حل می‌کنند.
