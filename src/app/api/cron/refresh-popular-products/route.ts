import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";

// لیست عبارات جستجوی محبوب برای هر دسته‌بندی
const popularQueries = {
  fashion: [
    "jeans",
    "t-shirt",
    "dress",
    "shoes",
    "jacket",
    "sneakers",
    "shirt",
    "pants",
  ],
  beauty: [
    "makeup",
    "skincare",
    "perfume",
    "cosmetics",
    "beauty products",
    "hair care",
  ],
  electronics: [
    "smartphone",
    "laptop",
    "headphones",
    "tablet",
    "camera",
    "gaming console",
  ],
  sports: [
    "running shoes",
    "gym equipment",
    "sports clothing",
    "fitness tracker",
  ],
  pets: ["pet food", "pet toys", "pet accessories", "dog collar", "cat food"],
  vitamins: [
    "vitamin c",
    "omega 3",
    "multivitamin",
    "protein powder",
    "supplements",
  ],
  accessories: ["watch", "bag", "wallet", "sunglasses", "jewelry", "belt"],
};

export async function GET(request: NextRequest) {
  try {
    // بررسی API Key برای امنیت
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.CRON_SECRET_KEY;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting popular products refresh job...");

    const results = [];
    const startTime = Date.now();

    // به‌روزرسانی محصولات محبوب برای هر دسته‌بندی
    for (const [category, queries] of Object.entries(popularQueries)) {
      console.log(`📦 Processing category: ${category}`);

      for (const query of queries) {
        try {
          console.log(`🔍 Refreshing: ${query} in ${category}`);

          // استفاده از سرویس کش برای به‌روزرسانی
          const result = await cacheService.getProducts(query, category, {
            redisTTL: 7200, // 2 hours for popular products
            mongoTTL: 7, // 7 days for popular products
            maxProducts: 30, // بیشتر محصولات برای محبوب‌ها
          });

          results.push({
            category,
            query,
            source: result.source,
            count: result.count,
            success: true,
          });

          // کمی صبر بین درخواست‌ها برای جلوگیری از rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Error refreshing ${query} in ${category}:`, error);
          results.push({
            category,
            query,
            source: "error",
            count: 0,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Popular products refresh completed in ${duration}ms`);

    // آمار کلی
    const totalQueries = results.length;
    const successfulQueries = results.filter((r) => r.success).length;
    const totalProducts = results.reduce((sum, r) => sum + r.count, 0);

    return NextResponse.json({
      success: true,
      message: "Popular products refresh completed",
      stats: {
        totalQueries,
        successfulQueries,
        failedQueries: totalQueries - successfulQueries,
        totalProducts,
        durationMs: duration,
      },
      results,
    });
  } catch (error) {
    console.error("❌ Error in popular products refresh job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST method برای فراخوانی دستی
export async function POST(request: NextRequest) {
  return GET(request);
}
