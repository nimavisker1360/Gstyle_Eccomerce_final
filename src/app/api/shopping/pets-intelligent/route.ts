import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

const TURKISH_PETS_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "petshop.com.tr",
  "patipet.com",
  "petyaşam.com",
  "beyazpati.com",
  "dostum.net",
  "petburada.com",
  "happydog.com.tr",
  "royalcanin.com.tr",
  "pedigreepet.com.tr",
  "whiskas.com.tr",
];

function filterTurkishPetsProducts(products: any[]): any[] {
  return products.filter((product) => {
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_PETS_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );

    const title = (product.title || "").toLowerCase();
    const description = (product.snippet || "").toLowerCase();
    const combined = title + " " + description;

    const petsKeywords = [
      "pet",
      "hayvan",
      "köpek",
      "dog",
      "kedi",
      "cat",
      "mama",
      "food",
      "yem",
      "oyuncak",
      "toy",
      "tasma",
      "collar",
      "gezdirme",
      "leash",
      "yatak",
      "bed",
      "kap",
      "bowl",
      "kafes",
      "cage",
      "akvaryum",
      "aquarium",
      "balık",
      "fish",
      "kuş",
      "bird",
      "hamster",
      "tavşan",
      "rabbit",
      "bakım",
      "care",
      "şampuan",
      "vitamin",
      "ilaç",
      "medicine",
      "veteriner",
      "vet",
      "tımar",
      "grooming",
    ];

    const hasPetsKeywords = petsKeywords.some((keyword) =>
      combined.includes(keyword)
    );

    return isFromTurkishSite && hasPetsKeywords;
  });
}

async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return persianQuery;

  try {
    const translationPrompt = `
      ترجمه فارسی به ترکی برای محصولات حیوانات خانگی: "${persianQuery}"
      
      مثال: "غذای سگ" → "köpek maması"
      فقط ترجمه برگردان:
    `;

    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: translationPrompt,
      maxOutputTokens: 100,
      temperature: 0.3,
    });

    return text.trim() || persianQuery;
  } catch (error) {
    return persianQuery;
  }
}

async function enhanceTurkishPetsQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) return [turkishQuery];

  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt: `بهبود کوئری حیوانات خانگی: "${turkishQuery}" - 3 کوئری مختلف بساز:`,
      maxOutputTokens: 150,
      temperature: 0.7,
    });

    const queries = text
      .trim()
      .split("\n")
      .filter((q) => q.trim().length > 0);
    return queries.length > 0 ? queries : [turkishQuery];
  } catch (error) {
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
      prompt: `ترجمه محصول حیوانات خانگی از ترکی به فارسی:
      عنوان: ${title}
      JSON: {"title": "...", "description": "..."}`,
      maxOutputTokens: 200,
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
  } catch (error) {
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

    console.log(`🐕 Starting intelligent pets search for: "${query}"`);

    // Use centralized cache service
    const result = await cacheService.getProducts(query, "pets", {
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
    console.error("❌ Intelligent Pets Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند حیوانات خانگی. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
