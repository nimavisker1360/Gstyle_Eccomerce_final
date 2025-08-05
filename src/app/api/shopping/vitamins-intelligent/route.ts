import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
    const query = searchParams.get("q");
    if (!query)
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );

    console.log(`💊 Starting intelligent vitamins search for: "${query}"`);
    if (!process.env.SERPAPI_KEY)
      return NextResponse.json(
        { error: "Search service is not configured" },
        { status: 500 }
      );

    const turkishQuery = await translatePersianToTurkish(query);
    const enhancedQueries = await enhanceTurkishVitaminsQuery(turkishQuery);

    let allProducts: any[] = [];
    for (const enhancedQuery of enhancedQueries.slice(0, 3)) {
      try {
        const searchResults = await getJson({
          engine: "google_shopping",
          q:
            enhancedQuery +
            " site:eczane.com OR site:hepsiburada.com OR site:trendyol.com",
          gl: "tr",
          hl: "tr",
          num: 30,
          device: "desktop",
          api_key: process.env.SERPAPI_KEY,
        });
        if (searchResults.shopping_results?.length > 0) {
          allProducts.push(
            ...filterTurkishVitaminsProducts(searchResults.shopping_results)
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Search error:`, error);
      }
    }

    const uniqueProducts = allProducts.filter(
      (product, index, self) =>
        index ===
        self.findIndex(
          (p) =>
            (p.product_id && p.product_id === product.product_id) ||
            p.title === product.title
        )
    );

    if (uniqueProducts.length === 0) {
      return NextResponse.json({
        products: [],
        message: "هیچ ویتامین و داروی معتبر یافت نشد.",
        search_query: query,
        turkish_query: turkishQuery,
        enhanced_queries: enhancedQueries,
      });
    }

    const translatedProductsPromises = uniqueProducts
      .slice(0, 25)
      .map(async (product: any) => {
        try {
          const { title: persianTitle, description: persianDescription } =
            await translateTurkishToPersian(
              product.title,
              product.snippet || ""
            );

          let finalPrice = 0;
          if (product.extracted_price) finalPrice = product.extracted_price;
          else if (product.price) {
            const priceStr =
              typeof product.price === "string"
                ? product.price
                : product.price.toString();
            finalPrice =
              parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", ".")) ||
              0;
          }

          return {
            id: product.product_id || Math.random().toString(36).substr(2, 9),
            title: persianTitle,
            originalTitle: product.title,
            price: finalPrice,
            currency: product.currency || "TRY",
            image: product.thumbnail,
            description: persianDescription,
            link:
              product.link ||
              product.source_link ||
              product.merchant?.link ||
              "",
            source: product.source || "فروشگاه ترکی",
            delivery: "ارسال از ترکیه",
            category: "ویتامین و دارو",
            rating: product.rating || 0,
            reviews: product.reviews || 0,
            turkishKeywords: enhancedQueries,
          };
        } catch {
          return null;
        }
      });

    const finalProducts = (
      await Promise.all(translatedProductsPromises)
    ).filter(Boolean);

    return NextResponse.json({
      products: finalProducts,
      total: finalProducts.length,
      search_query: query,
      turkish_query: turkishQuery,
      enhanced_queries: enhancedQueries,
      message: `${finalProducts.length} ویتامین و دارو از سایت‌های معتبر ترکی یافت شد.`,
      turkish_sites_searched: TURKISH_VITAMINS_SITES.slice(0, 8),
    });
  } catch (error) {
    console.error("❌ Vitamins API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند ویتامین و دارو.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
