import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { redis } from "@/lib/redis";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "stats":
        return await getCacheStats();
      case "clear":
        return await clearCache(request);
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: stats, clear" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Error in cache manager:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}

async function getCacheStats() {
  try {
    // آمار Redis
    const redisKeys = await redis.dbsize();

    // آمار MongoDB
    await connectToDatabase();
    const mongoCount = await GoogleShoppingProduct.countDocuments();
    const mongoCategories = await GoogleShoppingProduct.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // آمار کلی
    const totalCacheSize = redisKeys + mongoCount;
    const cacheEfficiency =
      mongoCount > 0 ? ((mongoCount / (mongoCount + 1)) * 100).toFixed(2) : "0";

    return NextResponse.json({
      success: true,
      stats: {
        redis: {
          keys: redisKeys,
          status: "connected",
        },
        mongodb: {
          totalProducts: mongoCount,
          categories: mongoCategories,
        },
        overall: {
          totalCacheSize,
          cacheEfficiency: `${cacheEfficiency}%`,
          estimatedSerpApiSavings: `${cacheEfficiency}%`,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error getting cache stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
}

async function clearCache(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // redis, mongodb, all
    const category = searchParams.get("category");

    if (!type || !["redis", "mongodb", "all"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use: redis, mongodb, all" },
        { status: 400 }
      );
    }

    let clearedItems = 0;

    switch (type) {
      case "redis":
        if (category) {
          const pattern = `search:${category}:*`;
          await cacheService.clearRedisCache(pattern);
          clearedItems = 1;
        } else {
          await cacheService.clearRedisCache();
          clearedItems = 1;
        }
        break;

      case "mongodb":
        if (category) {
          await cacheService.clearMongoDBCache(category);
          clearedItems = 1;
        } else {
          await cacheService.clearMongoDBCache();
          clearedItems = 1;
        }
        break;

      case "all":
        await Promise.all([
          cacheService.clearRedisCache(),
          cacheService.clearMongoDBCache(),
        ]);
        clearedItems = 2;
        break;
    }

    return NextResponse.json({
      success: true,
      message: `Cache cleared successfully`,
      cleared: {
        type,
        category: category || "all",
        items: clearedItems,
      },
    });
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
