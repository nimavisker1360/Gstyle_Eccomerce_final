import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    console.log(`🐕 Starting intelligent pets search for: "${query}"`);

    if (!process.env.SERPAPI_KEY) {
      return NextResponse.json(
        { error: "Search service is not configured" },
        { status: 500 }
      );
    }

    const turkishQuery = await translatePersianToTurkish(query);
    const enhancedQueries = await enhanceTurkishPetsQuery(turkishQuery);

    let allProducts: any[] = [];

    for (const enhancedQuery of enhancedQueries.slice(0, 3)) {
      try {
        const serpApiParams = {
          engine: "google_shopping",
          q:
            enhancedQuery +
            " site:petshop.com.tr OR site:hepsiburada.com OR site:trendyol.com",
          gl: "tr",
          hl: "tr",
          num: 35,
          device: "desktop",
          api_key: process.env.SERPAPI_KEY,
        };

        const searchResults = await getJson(serpApiParams);
        if (searchResults.shopping_results?.length > 0) {
          const filteredProducts = filterTurkishPetsProducts(
            searchResults.shopping_results
          );
          allProducts.push(...filteredProducts);
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
        message: "هیچ محصول حیوانات خانگی یافت نشد.",
        search_query: query,
        turkish_query: turkishQuery,
        enhanced_queries: enhancedQueries,
      });
    }

    const translatedProductsPromises = uniqueProducts
      .slice(0, 30)
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
            category: "حیوانات خانگی",
            rating: product.rating || 0,
            reviews: product.reviews || 0,
            turkishKeywords: enhancedQueries,
          };
        } catch (error) {
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
      message: `${finalProducts.length} محصول حیوانات خانگی از سایت‌های معتبر ترکی یافت شد.`,
      turkish_sites_searched: TURKISH_PETS_SITES.slice(0, 8),
    });
  } catch (error) {
    console.error("❌ Pets API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند حیوانات خانگی.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
