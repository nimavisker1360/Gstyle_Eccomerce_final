import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

// معتبرترین سایت‌های ترکی برای زیبایی و آرایش
const TURKISH_BEAUTY_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "sephora.com.tr",
  "douglas.com.tr",
  "gratis.com",
  "flormar.com.tr",
  "goldenrose.com.tr",
  "farmasi.com.tr",
  "rossman.com.tr",
  "watsons.com.tr",
  "avon.com.tr",
  "oriflame.com.tr",
  "yves-rocher.com.tr",
  "lorealparis.com.tr",
  "maybelline.com.tr",
  "clinique.com.tr",
  "esteelauder.com.tr",
];

// Function to filter products from Turkish beauty sites
function filterTurkishBeautyProducts(products: any[]): any[] {
  return products.filter((product) => {
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_BEAUTY_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );

    const title = (product.title || "").toLowerCase();
    const description = (product.snippet || "").toLowerCase();
    const combined = title + " " + description;

    const beautyKeywords = [
      "kozmetik",
      "cosmetics",
      "güzellik",
      "beauty",
      "makyaj",
      "makeup",
      "parfüm",
      "perfume",
      "ruj",
      "lipstick",
      "fondöten",
      "foundation",
      "maskara",
      "mascara",
      "göz kalemi",
      "eyeliner",
      "far",
      "eyeshadow",
      "allık",
      "blush",
      "pudra",
      "powder",
      "concealer",
      "kapatıcı",
      "cilt bakım",
      "skincare",
      "nemlendirici",
      "moisturizer",
      "temizleyici",
      "cleanser",
      "serum",
      "krem",
      "cream",
      "güneş kremi",
      "sunscreen",
      "şampuan",
      "shampoo",
      "saç bakım",
      "hair care",
      "saç boyası",
      "hair dye",
      "oje",
      "nail polish",
      "dudak balsamı",
      "lip balm",
      "makyaj fırçası",
      "makeup brush",
      "tırnak",
      "nail",
    ];

    const hasBeautyKeywords = beautyKeywords.some((keyword) =>
      combined.includes(keyword)
    );

    return isFromTurkishSite && hasBeautyKeywords;
  });
}

// Function to translate Persian to Turkish for beauty products
async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return persianQuery;
  }

  try {
    const translationPrompt = `
      شما یک مترجم متخصص در حوزه زیبایی و آرایش هستید. کوئری زیر را از فارسی به ترکی ترجمه کنید:

      کوئری فارسی: "${persianQuery}"

      راهنمایی‌ها:
      1. اگر نام برند (لورآل، میبلین، کلینیک و...) باشد، همان را نگه دارید
      2. اصطلاحات زیبایی و آرایش دقیق ترکی استفاده کنید
      3. کلمات کلیدی مناسب برای جستجو در سایت‌های ترکی اضافه کنید
      4. اگر رنگ یا نوع پوست ذکر شده، آن را دقیق ترجمه کنید

      مثال‌ها:
      - "رژ لب قرمز" → "kırmızı ruj"
      - "کرم آفتاب" → "güneş kremi"
      - "ماسکارا ضد آب" → "su geçirmez maskara"
      - "لوازم آرایش" → "makyaj malzemeleri"

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

// Function to enhance Turkish query for better beauty search
async function enhanceTurkishBeautyQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [turkishQuery];
  }

  try {
    const enhancementPrompt = `
      شما یک متخصص SEO برای فروشگاه‌های زیبایی ترکی هستید. کوئری ترکی زیر را برای جستجوی بهتر در سایت‌های زیبایی ترکی بهبود دهید:

      کوئری اصلی: "${turkishQuery}"

      لطفاً 3 تا 5 کوئری مختلف ایجاد کنید که:
      1. شامل کلمات کلیدی مختلف زیبایی باشد
      2. برندهای مختلف را در نظر بگیرد
      3. برای سایت‌های ترکی مثل Sephora، Gratis، Douglas بهینه باشد
      4. انواع محصولات مرتبط را شامل شود

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
      محصول زیبایی و آرایش زیر را از ترکی به فارسی ترجمه کنید:

      عنوان: ${title}
      توضیحات: ${description}

      راهنمایی‌ها:
      1. نام برندها را دست نخورید (L'Oreal, Maybelline, Clinique, ...)
      2. اصطلاحات زیبایی فارسی دقیق استفاده کنید
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

    console.log(`💄 Starting intelligent beauty search for: "${query}"`);

    // Use centralized cache service
    const result = await cacheService.getProducts(query, "beauty", {
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
    console.error("❌ Intelligent Beauty Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند زیبایی و آرایش. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
