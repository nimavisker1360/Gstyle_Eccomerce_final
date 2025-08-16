import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

interface SportProduct {
  id: string;
  title: string;
  originalTitle: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  image: string;
  description: string;
  originalDescription: string;
  link?: string;
  googleShoppingLink?: string;
  source: string;
  rating: number;
  reviews: number;
  delivery: string;
  category: string;
  turkishKeywords: string[];
}

// معتبرترین سایت‌های ترکی برای محصولات ورزشی
const TURKISH_SPORTS_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "decathlon.com.tr",
  "intersport.com.tr",
  "columbia.com.tr",
  "nike.com.tr",
  "adidas.com.tr",
  "puma.com.tr",
  "underarmour.com.tr",
  "newbalance.com.tr",
  "reebok.com.tr",
  "asics.com.tr",
  "converse.com.tr",
  "vans.com.tr",
  "flo.com.tr",
  "korayspor.com",
  "sportstores.com.tr",
];

// Function to filter products from Turkish sports sites
function filterTurkishSportsProducts(products: any[]): any[] {
  return products.filter((product) => {
    // Check if product link is from trusted Turkish sports sites
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_SPORTS_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );

    // Check if product is actually sports-related
    const title = (product.title || "").toLowerCase();
    const description = (product.snippet || "").toLowerCase();
    const combined = title + " " + description;

    const sportsKeywords = [
      "spor",
      "sport",
      "athletic",
      "fitness",
      "gym",
      "workout",
      "exercise",
      "running",
      "koşu",
      "jogging",
      "basketball",
      "basketbol",
      "football",
      "futbol",
      "tennis",
      "tenis",
      "golf",
      "yoga",
      "pilates",
      "crossfit",
      "training",
      "antrenman",
      "active",
      "performance",
      "performans",
      "sneaker",
      "spiker",
      "ayakkabı",
      "kıyafet",
      "giyim",
      "çanta",
      "malzeme",
      "ekipman",
      "equipment",
      "gear",
    ];

    const hasSportsKeywords = sportsKeywords.some((keyword) =>
      combined.includes(keyword)
    );

    return isFromTurkishSite && hasSportsKeywords;
  });
}

// Function to translate Persian to Turkish for sports products
async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return persianQuery; // Fallback to original query
  }

  try {
    const translationPrompt = `
      شما یک مترجم متخصص در حوزه محصولات ورزشی هستید. کوئری زیر را از فارسی به ترکی ترجمه کنید:

      کوئری فارسی: "${persianQuery}"

      راهنمایی‌ها:
      1. اگر نام برند (نایک، آدیداس، پوما و...) باشد، همان را نگه دارید
      2. اصطلاحات ورزشی دقیق ترکی استفاده کنید
      3. کلمات کلیدی مناسب برای جستجو در سایت‌های ترکی اضافه کنید
      4. اگر محصول خاصی ذکر شده، آن را به صورت دقیق ترجمه کنید

      مثال‌ها:
      - "کفش ورزشی نایک" → "Nike spor ayakkabısı"
      - "لباس ورزشی مردانه" → "erkek spor giyim"
      - "ساک ورزشی" → "spor çantası"
      - "لوازم فیتنس" → "fitness malzemeleri"

      فقط ترجمه ترکی را برگردانید، بدون توضیح اضافی:
    `;

    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: translationPrompt,
      maxOutputTokens: 100,
      temperature: 0.3,
    });

    return text.trim() || persianQuery;
  } catch (error) {
    console.error("❌ Translation error:", error);
    return persianQuery;
  }
}

// Function to enhance Turkish query for better sports product search
async function enhanceTurkishSportsQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [turkishQuery];
  }

  try {
    const enhancementPrompt = `
      شما یک متخصص SEO برای فروشگاه‌های ورزشی ترکی هستید. کوئری ترکی زیر را برای جستجوی بهتر در سایت‌های ورزشی ترکی بهبود دهید:

      کوئری اصلی: "${turkishQuery}"

      لطفاً 3 تا 5 کوئری مختلف ایجاد کنید که:
      1. شامل کلمات کلیدی مختلف ورزشی باشد
      2. برندهای مختلف را در نظر بگیرد
      3. برای سایت‌های ترکی مثل Hepsiburada، Trendyol، N11 بهینه باشد
      4. انواع محصولات مرتبط را شامل شود

      مثال:
      ورودی: "Nike spor ayakkabısı"
      خروجی:
      - Nike spor ayakkabısı koşu
      - Nike erkek kadın spor ayakkabı
      - Nike sneaker athletic shoes
      - spor ayakkabı Nike Adidas Puma
      - koşu ayakkabısı Nike

      فقط کوئری‌ها را خط به خط برگردانید:
    `;

    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: enhancementPrompt,
      maxOutputTokens: 200,
      temperature: 0.7,
    });

    const queries = text
      .trim()
      .split("\n")
      .filter((q) => q.trim().length > 0);
    return queries.length > 0 ? queries : [turkishQuery];
  } catch (error) {
    console.error("❌ Query enhancement error:", error);
    return [turkishQuery];
  }
}

// Function to translate Turkish results back to Persian
async function translateTurkishToPersian(
  title: string,
  description: string
): Promise<{ title: string; description: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { title, description };
  }

  try {
    const translationPrompt = `
      محصول ورزشی زیر را از ترکی به فارسی ترجمه کنید:

      عنوان: ${title}
      توضیحات: ${description}

      راهنمایی‌ها:
      1. نام برندها را دست نخورید (Nike, Adidas, Puma, ...)
      2. اصطلاحات ورزشی فارسی دقیق استفاده کنید
      3. ترجمه طبیعی و روان باشد
      4. برای فروش در ایران مناسب باشد

      پاسخ را در فرمت JSON برگردانید:
      {
        "title": "عنوان فارسی",
        "description": "توضیحات فارسی (جذاب و مناسب فروش، حداکثر 100 کلمه)"
      }
    `;

    const { text: response } = await generateText({
      model: openai("gpt-4"),
      prompt: translationPrompt,
      maxOutputTokens: 250,
      temperature: 0.5,
    });

    try {
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || title,
        description: parsed.description || description,
      };
    } catch (parseError) {
      console.error("❌ JSON parse error:", parseError);
      return { title, description };
    }
  } catch (error) {
    console.error("❌ Turkish to Persian translation error:", error);
    return { title, description };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`🏃‍♂️ Starting intelligent sports search for: "${query}"`);

    // Use centralized cache service
    const result = await cacheService.getProducts(query, "sports", {
      redisTTL: 60 * 60,
      mongoTTL: 3,
      maxProducts: 30,
    });

    return NextResponse.json({
      products: result.products,
      total: result.count,
      search_query: query,
      source: result.source,
    });
  } catch (error) {
    console.error("❌ Intelligent Sports Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند ورزشی. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
