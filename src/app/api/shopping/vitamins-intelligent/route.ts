import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

const TURKISH_VITAMINS_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "eczacibasi.com.tr",
  "solgar.com.tr",
  "supradyn.com.tr",
  "centrum.com.tr",
  "pharmaton.com.tr",
  "multibionta.com.tr",
  "eczane.com",
  "vitaminler.com",
  "naturevit.com.tr",
  "biobilim.com.tr",
  "koctas.com.tr",
  "rossman.com.tr",
];

function filterTurkishVitaminsProducts(products: any[]): any[] {
  return products.filter((product) => {
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_VITAMINS_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );

    const combined = (
      (product.title || "") +
      " " +
      (product.snippet || "")
    ).toLowerCase();
    const vitaminsKeywords = [
      "vitamin",
      "mineral",
      "takviye",
      "supplement",
      "multivitamin",
      "kalsiyum",
      "calcium",
      "magnezyum",
      "magnesium",
      "demir",
      "iron",
      "çinko",
      "zinc",
      "omega",
      "balık yağı",
      "probiyotik",
      "probiotic",
      "kolajen",
      "collagen",
      "ginseng",
      "echinacea",
      "melatonin",
      "biotin",
      "folik",
      "folic",
      "b12",
      "d3",
      "c vitamini",
      "sağlık",
      "health",
    ];

    return (
      isFromTurkishSite &&
      vitaminsKeywords.some((keyword) => combined.includes(keyword))
    );
  });
}

async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return persianQuery;
  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: `ترجمه فارسی به ترکی برای ویتامین: "${persianQuery}" مثال: "ویتامین سی" → "C vitamini"`,
      maxOutputTokens: 80,
      temperature: 0.3,
    });
    return text.trim() || persianQuery;
  } catch {
    return persianQuery;
  }
}

async function enhanceTurkishVitaminsQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [turkishQuery];
  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: `بهبود کوئری ویتامین: "${turkishQuery}" - 3 کوئری بساز:`,
      maxOutputTokens: 120,
      temperature: 0.7,
    });
    const queries = text
      .trim()
      .split("\n")
      .filter((q) => q.trim().length > 0);
    return queries.length > 0 ? queries : [turkishQuery];
  } catch {
    return [turkishQuery];
  }
}

async function translateTurkishToPersian(
  title: string,
  description: string
): Promise<{ title: string; description: string }> {
  if (!process.env.OPENAI_API_KEY) return { title, description };
  try {
    const { text: response } = await generateText({
      model: openai("gpt-4"),
      prompt: `ترجمه ویتامین از ترکی به فارسی: ${title} JSON: {"title": "...", "description": "..."}`,
      maxOutputTokens: 180,
      temperature: 0.5,
    });
    try {
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || title,
        description: parsed.description || description,
      };
    } catch {
      return { title, description };
    }
  } catch {
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

    console.log(`💊 Starting intelligent vitamins search for: "${query}"`);

    // Use centralized cache service
    const result = await cacheService.getProducts(query, "vitamins", {
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
    console.error("❌ Intelligent Vitamins Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند ویتامین و مکمل. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
