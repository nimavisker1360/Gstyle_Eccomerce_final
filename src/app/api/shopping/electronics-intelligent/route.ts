import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

// معتبرترین سایت‌های ترکی برای الکترونیک
const TURKISH_ELECTRONICS_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "teknosa.com",
  "vatan.com",
  "mediamarkt.com.tr",
  "bimeks.com.tr",
  "elektrix.com",
  "incehesap.com",
  "epey.com",
  "akakce.com",
  "cimri.com",
  "apple.com.tr",
  "samsung.com.tr",
  "lg.com.tr",
  "arcelik.com.tr",
  "vestel.com.tr",
  "philips.com.tr",
];

function filterTurkishElectronicsProducts(products: any[]): any[] {
  return products.filter((product) => {
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_ELECTRONICS_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );

    const title = (product.title || "").toLowerCase();
    const description = (product.snippet || "").toLowerCase();
    const combined = title + " " + description;

    const electronicsKeywords = [
      "elektronik",
      "electronics",
      "telefon",
      "phone",
      "mobil",
      "mobile",
      "laptop",
      "bilgisayar",
      "computer",
      "tablet",
      "ipad",
      "monitor",
      "ekran",
      "screen",
      "kulaklık",
      "headphone",
      "hoparlör",
      "speaker",
      "kamera",
      "camera",
      "oyun",
      "gaming",
      "konsol",
      "console",
      "playstation",
      "xbox",
      "nintendo",
      "televizyon",
      "tv",
      "akıllı saat",
      "smartwatch",
      "fitbit",
      "apple watch",
      "şarj",
      "charger",
      "kablo",
      "cable",
      "powerbank",
      "bluetooth",
      "wifi",
      "drone",
      "robot",
      "teknik",
      "technical",
      "dijital",
      "digital",
    ];

    const hasElectronicsKeywords = electronicsKeywords.some((keyword) =>
      combined.includes(keyword)
    );

    return isFromTurkishSite && hasElectronicsKeywords;
  });
}

async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return persianQuery;
  }

  try {
    const translationPrompt = `
      شما یک مترجم متخصص در حوزه الکترونیک هستید. کوئری زیر را از فارسی به ترکی ترجمه کنید:

      کوئری فارسی: "${persianQuery}"

      راهنمایی‌ها:
      1. اگر نام برند (اپل، سامسونگ، ال جی و...) باشد، همان را نگه دارید
      2. اصطلاحات فنی الکترونیک دقیق ترکی استفاده کنید
      3. کلمات کلیدی مناسب برای جستجو در سایت‌های ترکی اضافه کنید

      مثال‌ها:
      - "موبایل سامسونگ" → "Samsung telefon"
      - "لپ تاپ ایسوس" → "Asus laptop"
      - "هدفون بلوتوث" → "bluetooth kulaklık"
      - "ساعت هوشمند" → "akıllı saat"

      فقط ترجمه ترکی را برگردانید:
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

async function enhanceTurkishElectronicsQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [turkishQuery];
  }

  try {
    const enhancementPrompt = `
      کوئری الکترونیک ترکی زیر را بهبود دهید: "${turkishQuery}"

      3 تا 5 کوئری مختلف ایجاد کنید برای سایت‌های ترکی مثل Hepsiburada، Teknosa، Vatan:
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

async function translateTurkishToPersian(
  title: string,
  description: string
): Promise<{ title: string; description: string }> {
  if (!process.env.OPENAI_API_KEY) {
    return { title, description };
  }

  try {
    const translationPrompt = `
      محصول الکترونیک زیر را از ترکی به فارسی ترجمه کنید:

      عنوان: ${title}
      توضیحات: ${description}

      پاسخ JSON:
      {
        "title": "عنوان فارسی",
        "description": "توضیحات فارسی (حداکثر 100 کلمه)"
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
      return { title, description };
    }
  } catch (error) {
    console.error("❌ Translation error:", error);
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

    console.log(`📱 Starting intelligent electronics search for: "${query}"`);

    // Use centralized cache service to minimize SerpApi calls
    const result = await cacheService.getProducts(query, "electronics", {
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
    console.error("❌ Intelligent Electronics Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند الکترونیک. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
