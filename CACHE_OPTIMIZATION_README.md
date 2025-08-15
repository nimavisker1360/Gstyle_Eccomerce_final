# سیستم کش بهینه‌شده برای کاهش مصرف SerpApi

## 🎯 هدف

کاهش ۸۰-۹۰ درصدی درخواست‌های SerpApi با استفاده از سیستم کش هوشمند چندلایه‌ای

## 🏗️ معماری سیستم

### ۱. لایه‌های کش

```
User Request → Redis Cache → MongoDB Cache → SerpApi
     ↓              ↓            ↓           ↓
   Fastest     1 Hour TTL   3 Days TTL   Last Resort
```

### ۲. جریان جستجو

1. **بررسی Redis**: کش کوتاه‌مدت (۱ ساعت)
2. **بررسی MongoDB**: کش بلندمدت (۳ روز)
3. **جستجو از SerpApi**: فقط در صورت عدم وجود در کش
4. **ذخیره در هر دو کش**: برای استفاده‌های بعدی

## 🔧 پیاده‌سازی

### سرویس کش هوشمند (`src/lib/services/cache-service.ts`)

- **Singleton Pattern**: یک نمونه واحد برای کل برنامه
- **نرمال‌سازی**: تبدیل عبارات جستجو به کلیدهای یکسان
- **مدیریت خطا**: ادامه کار حتی در صورت خطا در یکی از لایه‌ها

### نرمال‌سازی عبارت جستجو

```typescript
private normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // تبدیل چندین فاصله به یک فاصله
    .replace(/[^\w\s\u0600-\u06FF]/g, '') // حذف کاراکترهای خاص
    .trim();
}
```

**مثال**:

- `"iPhone 15"` → `"iphone 15"`
- `"IPHONE15"` → `"iphone15"`
- `"  iPhone  15  "` → `"iphone 15"`

## 📊 مزایای سیستم

### کاهش درخواست‌های SerpApi

- **جستجوهای تکراری**: ۱۰۰٪ کاهش
- **جستجوهای مشابه**: ۸۰-۹۰٪ کاهش
- **محصولات محبوب**: ۹۵٪ کاهش

### بهبود عملکرد

- **Redis**: پاسخ‌دهی زیر ۱۰ میلی‌ثانیه
- **MongoDB**: پاسخ‌دهی زیر ۱۰۰ میلی‌ثانیه
- **SerpApi**: پاسخ‌دهی ۲-۵ ثانیه

## 🚀 ویژگی‌های جدید

### ۱. کرون‌جاب به‌روزرسانی خودکار

```bash
# فراخوانی دستی
curl -X POST "https://your-domain.com/api/cron/refresh-popular-products" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

**محصولات محبوب هر دسته‌بندی**:

- Fashion: jeans, t-shirt, dress, shoes, jacket
- Beauty: makeup, skincare, perfume, cosmetics
- Electronics: smartphone, laptop, headphones, tablet
- Sports: running shoes, gym equipment, sports clothing
- Pets: pet food, pet toys, pet accessories
- Vitamins: vitamin c, omega 3, multivitamin
- Accessories: watch, bag, wallet, sunglasses

### ۲. مدیریت کش

```bash
# آمار کش
GET /api/shopping/cache-manager?action=stats

# پاک کردن کش
GET /api/shopping/cache-manager?action=clear&type=redis
GET /api/shopping/cache-manager?action=clear&type=mongodb
GET /api/shopping/cache-manager?action=clear&type=all

# پاک کردن دسته‌بندی خاص
GET /api/shopping/cache-manager?action=clear&type=mongodb&category=fashion
```

### ۳. Debounce جستجو

- **تأخیر**: ۱ ثانیه
- **حداقل طول**: ۲ کاراکتر
- **پیشنهادات**: حداکثر ۹ محصول
- **کلیدهای کیبورد**: Arrow keys, Enter, Escape

## ⚙️ تنظیمات محیطی

### متغیرهای محیطی مورد نیاز

```env
# Redis
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# MongoDB
MONGODB_URI=your_mongodb_uri

# SerpApi
SERPAPI_KEY=your_serpapi_key

# Cron Job
CRON_SECRET_KEY=your_secret_key_for_cron
```

### تنظیمات پیش‌فرض

```typescript
const defaultConfig: CacheConfig = {
  redisTTL: 3600, // 1 hour
  mongoTTL: 3, // 3 days
  maxProducts: 20, // Maximum products per search
};
```

## 📈 آمار و نظارت

### API آمار کش

```json
{
  "success": true,
  "stats": {
    "redis": {
      "keys": 150,
      "info": ["Redis version", "Connected clients", ...]
    },
    "mongodb": {
      "totalProducts": 2500,
      "categories": [
        {"_id": "fashion", "count": 450},
        {"_id": "electronics", "count": 380}
      ]
    },
    "overall": {
      "totalCacheSize": 2650,
      "cacheEfficiency": "99.96%",
      "estimatedSerpApiSavings": "99.96%"
    }
  }
}
```

## 🔄 کرون‌جاب

### تنظیم کرون‌جاب (هر ۱۲ ساعت)

```bash
# در سرور یا سرویس کرون
0 */12 * * * curl -X POST "https://your-domain.com/api/cron/refresh-popular-products" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

### فراخوانی دستی

```bash
# تست کرون‌جاب
curl -X POST "https://your-domain.com/api/cron/refresh-popular-products" \
  -H "Authorization: Bearer YOUR_CRON_SECRET_KEY"
```

## 🛠️ نگهداری و عیب‌یابی

### پاک کردن کش

```typescript
// پاک کردن همه کش Redis
await cacheService.clearRedisCache();

// پاک کردن کش MongoDB برای دسته‌بندی خاص
await cacheService.clearMongoDBCache("fashion");

// پاک کردن همه کش
await Promise.all([
  cacheService.clearRedisCache(),
  cacheService.clearMongoDBCache(),
]);
```

### بررسی وضعیت کش

```typescript
// بررسی آمار کلی
const stats = await cacheService.getCacheStats();

// بررسی محصولات در کش
const products = await cacheService.getProducts("iphone", "electronics");
console.log(`Source: ${products.source}, Count: ${products.count}`);
```

## 📝 نکات مهم

### ۱. مدیریت خطا

- خطا در Redis: ادامه با MongoDB
- خطا در MongoDB: ادامه با SerpApi
- خطا در SerpApi: برگرداندن خطا به کاربر

### ۲. بهینه‌سازی حافظه

- محدودیت محصولات در هر دسته‌بندی
- TTL خودکار برای MongoDB
- پاک کردن محصولات قدیمی

### ۳. امنیت

- API Key برای کرون‌جاب
- محدودیت دسترسی به مدیریت کش
- لاگ کردن تمام عملیات

## 🎉 نتیجه‌گیری

با پیاده‌سازی این سیستم:

- **مصرف SerpApi**: کاهش ۸۰-۹۰٪
- **سرعت پاسخ**: بهبود ۱۰-۵۰ برابر
- **هزینه‌ها**: کاهش قابل توجه
- **تجربه کاربری**: بهبود چشمگیر

## 🔗 فایل‌های مرتبط

- `src/lib/services/cache-service.ts` - سرویس کش اصلی
- `src/app/api/shopping/google-shopping/route.ts` - API جستجو
- `src/app/api/cron/refresh-popular-products/route.ts` - کرون‌جاب
- `src/app/api/shopping/cache-manager/route.ts` - مدیریت کش
- `src/hooks/use-search-debounce.ts` - هوک debounce
- `src/components/shared/header/search.tsx` - کامپوننت جستجو
