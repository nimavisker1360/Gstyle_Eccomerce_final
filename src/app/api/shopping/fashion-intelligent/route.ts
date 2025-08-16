import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

// معتبرترین سایت‌های ترکی برای مد و پوشاک
const TURKISH_FASHION_SITES = [
  "hepsiburada.com",
  "trendyol.com",
  "n11.com",
  "gittigidiyor.com",
  "amazon.com.tr",
  "zara.com.tr",
  "hm.com.tr",
  "mango.com.tr",
  "koton.com.tr",
  "lcwaikiki.com",
  "defacto.com.tr",
  "colin.com.tr",
  "boyner.com.tr",
  "beymen.com",
  "machka.com.tr",
  "ipekyol.com.tr",
  "network.com.tr",
  "vakko.com",
  "kinetix.com.tr",
  "flo.com.tr",
];

type GenderIntent = "men" | "women" | "kids" | null;
type SubcategoryIntent =
  | "jeans"
  | "pants"
  | "shirt"
  | "tshirt"
  | "dress"
  | "shoes"
  | "jacket"
  | "coat"
  | "skirt"
  | "sweater"
  | null;

interface FashionIntent {
  gender: GenderIntent;
  subcategory: SubcategoryIntent;
}

function detectFashionIntent(persianQuery: string): FashionIntent {
  const q = persianQuery.toLowerCase();
  let gender: GenderIntent = null;
  if (/(مردانه|آقایان|اقایان|مرد|پسرانه)/.test(q)) gender = "men";
  else if (/(زنانه|بانوان|خانم ها|خانم‌ها|دخترانه)/.test(q)) gender = "women";
  else if (/(بچه|کودک|نوزاد|پسرانه|دخترانه|کودکان)/.test(q)) gender = "kids";

  let subcategory: SubcategoryIntent = null;
  if (/(شلوار\s*جین|جین|لی)/.test(q)) subcategory = "jeans";
  else if (/شلوار/.test(q)) subcategory = "pants";
  else if (/(تی\s*شرت|تیشرت|تی-شرت)/.test(q)) subcategory = "tshirt";
  else if (/پیراهن/.test(q)) subcategory = "shirt";
  else if (/پیراهن\s*زنانه|لباس|لباس\s*مجلس|مجلس/.test(q))
    subcategory = "dress";
  else if (/(کفش|اسنیکرز|صندل|بوت)/.test(q)) subcategory = "shoes";
  else if (/(کاپشن|ژاکت|کت)/.test(q)) subcategory = "jacket";
  else if (/پالتو/.test(q)) subcategory = "coat";
  else if (/دامن/.test(q)) subcategory = "skirt";
  else if (/(سویشرت|ژاکت\s*بافت|بافت|پلوور|سوئیشرت)/.test(q))
    subcategory = "sweater";

  return { gender, subcategory };
}

function buildEnhancedQueriesFromIntent(
  baseTurkishQuery: string,
  intent: FashionIntent
): string[] {
  const queries: string[] = [];

  const genderMap: Record<Exclude<GenderIntent, null>, string[]> = {
    men: ["erkek"],
    women: ["kadın"],
    kids: ["çocuk", "bebek"],
  };

  const subcategoryMap: Record<Exclude<SubcategoryIntent, null>, string[]> = {
    jeans: ["jean", "kot", "denim", "pantolon"],
    pants: ["pantolon"],
    shirt: ["gömlek"],
    tshirt: ["tişört", "t-shirt"],
    dress: ["elbise"],
    shoes: ["ayakkabı", "sneaker", "spor ayakkabı", "bot"],
    jacket: ["ceket", "mont"],
    coat: ["mont", "kaban"],
    skirt: ["etek"],
    sweater: ["kazak", "sweatshirt", "hırka"],
  };

  const genderWords = intent.gender ? genderMap[intent.gender] : [];
  const subcatWords = intent.subcategory
    ? subcategoryMap[intent.subcategory]
    : [];

  if (genderWords.length === 0 && subcatWords.length === 0) {
    return [baseTurkishQuery];
  }

  const combinations: string[] = [];
  const base = baseTurkishQuery.replace(/\s+/g, " ").trim();

  if (genderWords.length && subcatWords.length) {
    for (const g of genderWords) {
      for (const s of subcatWords) {
        combinations.push(`${g} ${s}`);
        combinations.push(`${s} ${g}`);
      }
    }
  } else if (genderWords.length) {
    for (const g of genderWords) combinations.push(g);
  } else if (subcatWords.length) {
    for (const s of subcatWords) combinations.push(s);
  }

  for (const c of combinations) {
    queries.push(`${base} ${c}`.trim());
  }

  // Add a couple of targeted variants for jeans intent
  if (intent.subcategory === "jeans") {
    if (intent.gender === "men") {
      queries.push("erkek kot pantolon");
      queries.push("erkek jean pantolon");
    } else if (intent.gender === "women") {
      queries.push("kadın kot pantolon");
      queries.push("kadın jean pantolon");
    }
  }

  // Ensure uniqueness
  return Array.from(new Set(queries)).slice(0, 5);
}

// Function to filter products from Turkish fashion sites with strict intent matching
function filterTurkishFashionProducts(
  products: any[],
  intent?: FashionIntent
): any[] {
  const genderRequired: Record<Exclude<GenderIntent, null>, string[]> = {
    men: ["erkek"],
    women: ["kadın"],
    kids: ["çocuk", "bebek"],
  };

  const genderExclude: Record<Exclude<GenderIntent, null>, string[]> = {
    men: ["kadın"],
    women: ["erkek"],
    kids: [],
  };

  const subcatRequired: Record<Exclude<SubcategoryIntent, null>, string[]> = {
    jeans: ["jean", "kot", "denim", "pantolon"],
    pants: ["pantolon"],
    shirt: ["gömlek"],
    tshirt: ["tişört", "t-shirt"],
    dress: ["elbise"],
    shoes: ["ayakkabı", "sneaker", "spor ayakkabı", "bot"],
    jacket: ["ceket", "mont"],
    coat: ["kaban", "mont"],
    skirt: ["etek"],
    sweater: ["kazak", "sweatshirt", "hırka"],
  };

  return products.filter((product) => {
    const productLink =
      product.link || product.source_link || product.merchant?.link || "";
    const isFromTurkishSite = TURKISH_FASHION_SITES.some((site) =>
      productLink.toLowerCase().includes(site)
    );
    if (!isFromTurkishSite) return false;

    const title = (product.title || "").toLowerCase();
    const description = (product.snippet || "").toLowerCase();
    const combined = `${title} ${description}`;

    // If we have an intent, enforce it strictly
    if (intent) {
      if (intent.gender) {
        const must = genderRequired[intent.gender];
        const notAllowed = genderExclude[intent.gender];
        const hasGender = must.some((w) => combined.includes(w));
        const hasOpposite = notAllowed.some((w) => combined.includes(w));
        if (!hasGender || hasOpposite) return false;
      }
      if (intent.subcategory) {
        const must = subcatRequired[intent.subcategory];
        const hasSubcat = must.some((w) => combined.includes(w));
        if (!hasSubcat) return false;
      }
    } else {
      // Fallback broad fashion relevance
      const fashionKeywords = [
        "giyim",
        "clothing",
        "moda",
        "fashion",
        "elbise",
        "dress",
        "gömlek",
        "shirt",
        "pantolon",
        "pants",
        "jean",
        "denim",
        "etek",
        "skirt",
        "bluz",
        "blouse",
        "tişört",
        "t-shirt",
        "kazak",
        "sweater",
        "ceket",
        "jacket",
        "mont",
        "coat",
        "ayakkabı",
        "shoes",
        "bot",
        "boots",
        "spor ayakkabı",
        "sneakers",
        "çanta",
        "bag",
        "el çantası",
        "handbag",
        "aksesuar",
        "accessories",
        "takı",
        "jewelry",
      ];
      const hasFashionKeywords = fashionKeywords.some((keyword) =>
        combined.includes(keyword)
      );
      if (!hasFashionKeywords) return false;
    }

    return true;
  });
}

// Function to translate Persian to Turkish for fashion products
async function translatePersianToTurkish(
  persianQuery: string
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return persianQuery;
  }

  try {
    const translationPrompt = `
      شما یک مترجم متخصص در حوزه مد و پوشاک هستید. کوئری زیر را از فارسی به ترکی ترجمه کنید:

      کوئری فارسی: "${persianQuery}"

      راهنمایی‌ها:
      1. اگر نام برند (زارا، اچ اند ام، مانگو و...) باشد، همان را نگه دارید
      2. اصطلاحات مد و پوشاک دقیق ترکی استفاده کنید
      3. کلمات کلیدی مناسب برای جستجو در سایت‌های ترکی اضافه کنید
      4. اگر سایز یا رنگ ذکر شده، آن را دقیق ترجمه کنید

      مثال‌ها:
      - "لباس زنانه زارا" → "Zara kadın giyim"
      - "کفش مردانه" → "erkek ayakkabı"
      - "کیف دستی" → "el çantası"
      - "پیراهن آبی" → "mavi gömlek"

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

// Function to enhance Turkish query for better fashion search
async function enhanceTurkishFashionQuery(
  turkishQuery: string
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    return [turkishQuery];
  }

  try {
    const enhancementPrompt = `
      شما یک متخصص SEO برای فروشگاه‌های مد ترکی هستید. کوئری ترکی زیر را برای جستجوی بهتر در سایت‌های مد ترکی بهبود دهید:

      کوئری اصلی: "${turkishQuery}"

      لطفاً 3 تا 5 کوئری مختلف ایجاد کنید که:
      1. شامل کلمات کلیدی مختلف مد باشد
      2. برندهای مختلف را در نظر بگیرد
      3. برای سایت‌های ترکی مثل Trendyol، LC Waikiki، Zara بهینه باشد
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
      محصول مد و پوشاک زیر را از ترکی به فارسی ترجمه کنید:

      عنوان: ${title}
      توضیحات: ${description}

      راهنمایی‌ها:
      1. نام برندها را دست نخورید (Zara, H&M, Mango, ...)
      2. اصطلاحات مد فارسی دقیق استفاده کنید
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

    console.log(`👗 Starting intelligent fashion search for: "${query}"`);

    // Use centralized cache service
    const result = await cacheService.getProducts(query, "fashion", {
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
    console.error("❌ Intelligent Fashion Search API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی هوشمند مد و پوشاک. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
