import { redis } from "@/lib/redis";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";
import { getJson } from "serpapi";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

export interface CacheConfig {
  redisTTL: number; // Redis TTL in seconds
  mongoTTL: number; // MongoDB TTL in days
  maxProducts: number; // Maximum products to return
}

export interface SearchResult {
  products: any[];
  source: "redis" | "mongodb" | "serpapi";
  count: number;
  category: string;
  category_fa?: string;
  cachedAt: Date;
}

export class CacheService {
  private static instance: CacheService;
  private defaultConfig: CacheConfig = {
    redisTTL: 3600, // 1 hour
    mongoTTL: 3, // 3 days
    maxProducts: 20,
  };

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * نرمال‌سازی عبارت جستجو برای یکسان‌سازی کلیدهای کش
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // تبدیل چندین فاصله به یک فاصله
      .replace(/[^\w\s\u0600-\u06FF]/g, "") // حذف کاراکترهای خاص، نگه داشتن حروف فارسی
      .trim();
  }

  /**
   * تولید کلید کش برای Redis
   */
  private getRedisKey(category: string, query: string): string {
    const normalizedQuery = this.normalizeQuery(query);
    return `search:${category}:${normalizedQuery}`;
  }

  /**
   * بررسی کش Redis
   */
  private async getFromRedis(key: string): Promise<any[] | null> {
    try {
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Found in Redis cache: ${key}`);
        if (typeof cached === "string") {
          try {
            return JSON.parse(cached);
          } catch {
            // if non-JSON string, return empty to avoid corrupt data usage
            return null;
          }
        }
        return cached as any[];
      }
      return null;
    } catch (error) {
      console.error("❌ Redis error:", error);
      return null;
    }
  }

  /**
   * ذخیره در کش Redis
   */
  private async setInRedis(
    key: string,
    data: any[],
    ttl: number
  ): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
      console.log(`💾 Cached in Redis: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error("❌ Redis set error:", error);
    }
  }

  /**
   * بررسی کش MongoDB
   */
  private async getFromMongoDB(
    category: string,
    query: string
  ): Promise<any[] | null> {
    try {
      await connectToDatabase();

      const normalizedQuery = this.normalizeQuery(query);
      const regex = new RegExp(normalizedQuery, "i");

      const products = await GoogleShoppingProduct.find({
        category,
        $or: [{ title: { $regex: regex } }, { title_fa: { $regex: regex } }],
        expiresAt: { $gt: new Date() },
      })
        .sort({ createdAt: -1 })
        .limit(this.defaultConfig.maxProducts)
        .lean();

      if (products.length > 0) {
        console.log(`✅ Found ${products.length} products in MongoDB cache`);
        return products;
      }

      return null;
    } catch (error) {
      console.error("❌ MongoDB error:", error);
      return null;
    }
  }

  /**
   * ذخیره در MongoDB
   */
  private async saveToMongoDB(
    products: any[],
    category: string
  ): Promise<void> {
    try {
      await connectToDatabase();

      for (const product of products) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.defaultConfig.mongoTTL);

        const productData = {
          ...product,
          category,
          expiresAt,
          createdAt: new Date(),
        };

        const newProduct = new GoogleShoppingProduct(productData);
        await newProduct.save();
      }

      console.log(`💾 Saved ${products.length} products to MongoDB`);
    } catch (error) {
      console.error("❌ MongoDB save error:", error);
    }
  }

  /**
   * جستجو از SerpApi
   */
  private async searchFromSerpApi(
    query: string,
    category: string
  ): Promise<any[]> {
    try {
      const serpApiKey = process.env.SERPAPI_KEY;
      if (!serpApiKey) {
        throw new Error("SERPAPI_KEY environment variable is required");
      }

      console.log(`🔍 Searching SerpApi for: ${query} (${category})`);

      const searchResults = await getJson({
        engine: "google_shopping",
        q: query,
        api_key: serpApiKey,
        gl: "tr",
        hl: "tr",
        location: "Turkey",
        num: this.defaultConfig.maxProducts,
      });

      if (
        !searchResults.shopping_results ||
        searchResults.shopping_results.length === 0
      ) {
        return [];
      }

      const products = searchResults.shopping_results;
      const translatedProducts = [];

      // ترجمه عنوان محصولات به فارسی
      for (const product of products) {
        try {
          const translationResult = await generateText({
            model: openai("gpt-3.5-turbo"),
            prompt: `Translate the following product title to Persian (Farsi). 
            Return only the Persian translation, nothing else. 
            Make it a coherent sentence of 5-10 words, not word-for-word literal translation.
            
            Product title: "${product.title}"
            
            Persian translation:`,
            maxOutputTokens: 100,
          });

          const title_fa = translationResult.text.trim();

          const productData = {
            id:
              product.product_id ||
              `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: product.title,
            title_fa: title_fa,
            price: product.price || "قیمت نامشخص",
            link: product.link || product.product_link,
            thumbnail: product.thumbnail || product.image,
            source: product.source || "Google Shopping",
            category: category,
          };

          translatedProducts.push(productData);
        } catch (error) {
          console.error("❌ Translation error:", error);
          // ادامه با محصولات دیگر حتی اگر یکی شکست بخورد
        }
      }

      return translatedProducts;
    } catch (error) {
      console.error("❌ SerpApi error:", error);
      throw error;
    }
  }

  /**
   * تابع اصلی جستجو با سیستم کش هوشمند
   */
  public async getProducts(
    query: string,
    category: string,
    config?: Partial<CacheConfig>
  ): Promise<SearchResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const redisKey = this.getRedisKey(category, query);

    try {
      // 1. بررسی کش Redis (کش کوتاه‌مدت)
      let products = await this.getFromRedis(redisKey);
      if (products) {
        return {
          products,
          source: "redis",
          count: products.length,
          category,
          cachedAt: new Date(),
        };
      }

      // 2. بررسی کش MongoDB (کش بلندمدت)
      products = await this.getFromMongoDB(category, query);
      if (products) {
        // کپی در Redis برای دسترسی سریع‌تر
        await this.setInRedis(redisKey, products, finalConfig.redisTTL);

        return {
          products,
          source: "mongodb",
          count: products.length,
          category,
          cachedAt: new Date(),
        };
      }

      // 3. جستجو از SerpApi
      console.log(`🚀 No cache found, calling SerpApi for: ${query}`);
      products = await this.searchFromSerpApi(query, category);

      if (products.length === 0) {
        return {
          products: [],
          source: "serpapi",
          count: 0,
          category,
          cachedAt: new Date(),
        };
      }

      // 4. ذخیره در هر دو کش
      await Promise.all([
        this.setInRedis(redisKey, products, finalConfig.redisTTL),
        this.saveToMongoDB(products, category),
      ]);

      return {
        products,
        source: "serpapi",
        count: products.length,
        category,
        cachedAt: new Date(),
      };
    } catch (error) {
      console.error("❌ Cache service error:", error);
      throw error;
    }
  }

  /**
   * پاک کردن کش Redis
   */
  public async clearRedisCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(
            `🗑️ Cleared ${keys.length} Redis keys with pattern: ${pattern}`
          );
        }
      } else {
        await redis.flushdb();
        console.log("🗑️ Cleared all Redis cache");
      }
    } catch (error) {
      console.error("❌ Redis clear error:", error);
    }
  }

  /**
   * پاک کردن کش MongoDB
   */
  public async clearMongoDBCache(category?: string): Promise<void> {
    try {
      await connectToDatabase();

      if (category) {
        await GoogleShoppingProduct.deleteMany({ category });
        console.log(`🗑️ Cleared MongoDB cache for category: ${category}`);
      } else {
        await GoogleShoppingProduct.deleteMany({});
        console.log("🗑️ Cleared all MongoDB cache");
      }
    } catch (error) {
      console.error("❌ MongoDB clear error:", error);
    }
  }
}

export const cacheService = CacheService.getInstance();
