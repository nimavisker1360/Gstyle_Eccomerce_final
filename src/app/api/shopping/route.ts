import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { connectToDatabase } from "@/lib/db";
import GoogleShoppingProduct from "@/lib/db/models/google-shopping-product.model";

// Simple in-memory cache for search results
const searchCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    ttl: number;
  }
>();

// Cache duration: 5 minutes for searches
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

// Function to determine query type based on keywords
function getQueryType(query: string): string {
  // حیوانات خانگی - بررسی اول برای اولویت بالاتر
  const petsKeywords = [
    "حیوانات خانگی",
    "حیوانات",
    "pets",
    "سگ",
    "dog",
    "گربه",
    "cat",
    "حیوان خانگی",
    "pet",
    "غذای سگ",
    "غذای گربه",
    "تشویقی سگ",
    "تشویقی گربه",
    "قلاده",
    "محصولات بهداشتی حیوانات",
  ];

  // ورزشی - بررسی دوم
  const sportsKeywords = [
    "ورزشی",
    "sport",
    "sports",
    "ورزش",
    "فیتنس",
    "fitness",
    "دویدن",
    "running",
    "ساک ورزشی",
    "لوازم ورزشی",
    "کفش ورزشی",
    "لباس ورزشی",
    "ترموس",
    "قمقمه",
    "اسباب ورزشی",
  ];

  // ویتامین و دارو
  const vitaminKeywords = [
    "ویتامین",
    "vitamin",
    "دارو",
    "medicine",
    "مکمل",
    "supplement",
    "مولتی ویتامین",
    "کلسیم",
    "ملاتونین",
  ];

  // زیبایی و آرایش
  const beautyKeywords = [
    "زیبایی",
    "آرایش",
    "beauty",
    "cosmetics",
    "makeup",
    "perfume",
    "cologne",
    "لوازم آرایشی",
    "عطر",
    "ادکلن",
    "مراقبت از پوست",
    "ضد پیری",
    "محصولات آفتاب",
    "رنگ مو",
    "شامپو",
  ];

  // الکترونیک
  const electronicsKeywords = [
    "الکترونیک",
    "electronics",
    "موبایل",
    "mobile",
    "لپ تاپ",
    "laptop",
    "تبلت",
    "tablet",
    "هدفون",
    "headphone",
    "ساعت هوشمند",
    "smartwatch",
  ];

  // مد و پوشاک - بررسی آخر برای جلوگیری از تداخل
  const fashionKeywords = [
    "مد",
    "پوشاک",
    "fashion",
    "clothing",
    "dress",
    "shirt",
    "pants",
    "jeans",
    "skirt",
    "blouse",
    "t-shirt",
    "sweater",
    "jacket",
    "coat",
    "پیراهن",
    "تاپ",
    "شلوار",
    "شومیز",
    "دامن",
    "ژاکت",
    "کت",
    "کیف",
    "کیف دستی",
    "jewelry",
    "جواهرات",
    "زیورآلات",
  ];

  // تشخیص نوع کوئری با اولویت‌بندی
  if (petsKeywords.some((keyword) => query.includes(keyword))) {
    return "pets";
  } else if (sportsKeywords.some((keyword) => query.includes(keyword))) {
    return "sports";
  } else if (vitaminKeywords.some((keyword) => query.includes(keyword))) {
    return "vitamins";
  } else if (beautyKeywords.some((keyword) => query.includes(keyword))) {
    return "beauty";
  } else if (electronicsKeywords.some((keyword) => query.includes(keyword))) {
    return "electronics";
  } else if (fashionKeywords.some((keyword) => query.includes(keyword))) {
    return "fashion";
  }

  return "other";
}

// Function to extract and validate product links from SERP API
function extractProductLink(product: any): string | null {
  // List of valid store domains we want to accept
  const validStoreDomains = [
    "hepsiburada.com",
    "trendyol.com",
    "n11.com",
    "gittigidiyor.com",
    "amazon.com.tr",
    "amazon.com",
    "amazon.de",
    "amazon.co.uk",
    "ebay.com",
    "ebay.de",
    "ebay.co.uk",
    "etsy.com",
    "asos.com",
    "zara.com",
    "hm.com",
    "mango.com",
    "pullandbear.com",
    "bershka.com",
    "stradivarius.com",
    "massimodutti.com",
    "oysho.com",
    "zara.com.tr",
    "hm.com.tr",
    "mango.com.tr",
    "sephora.com",
    "sephora.com.tr",
    "douglas.com",
    "douglas.com.tr",
    "flormar.com.tr",
    "goldenrose.com.tr",
    "lorealparis.com.tr",
    "maybelline.com.tr",
    "nyxcosmetics.com.tr",
    "mac.com.tr",
    "benefitcosmetics.com.tr",
    "clinique.com.tr",
    "esteelauder.com.tr",
    "lancome.com.tr",
    "dior.com",
    "chanel.com",
    "ysl.com",
    "gucci.com",
    "prada.com",
    "louisvuitton.com",
    "hermes.com",
    "cartier.com",
    "tiffany.com",
    "swarovski.com",
    "pandora.com",
    "cartier.com.tr",
    "tiffany.com.tr",
    "swarovski.com.tr",
    "pandora.com.tr",
  ];

  // Function to check if URL is from a valid store
  function isValidStoreUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;

    // Exclude Google Shopping links
    if (
      url.includes("google.com/shopping") ||
      url.includes("google.com.tr/shopping") ||
      url.includes("google.com/search?tbm=shop")
    ) {
      return false;
    }

    // Check if URL contains any valid store domain
    return validStoreDomains.some((domain) => url.includes(domain));
  }

  // Priority order for extracting product links
  const linkSources = [
    product.merchant?.link,
    product.merchant?.url,
    product.source_link,
    product.product_link,
    product.offers?.link,
    product.offers?.url,
    product.link,
  ];

  // Debug: Log all available links for this product
  console.log(`🔍 Debugging product: ${product.title}`);
  console.log(`  Available links:`);
  linkSources.forEach((link, index) => {
    if (link) {
      console.log(`    ${index + 1}. ${link}`);
    }
  });

  // Find the first valid store link
  for (const link of linkSources) {
    if (link && isValidStoreUrl(link)) {
      console.log(`✅ Found valid store link: ${link}`);
      return link;
    }
  }

  // If no valid store link found, try to construct one from merchant domain
  if (product.merchant?.domain) {
    const domain = product.merchant.domain;
    console.log(`  Checking merchant domain: ${domain}`);
    if (
      domain &&
      !domain.includes("google.com") &&
      validStoreDomains.some((validDomain) => domain.includes(validDomain))
    ) {
      const constructedLink = `https://${domain}`;
      console.log(`✅ Constructed store link from domain: ${constructedLink}`);
      return constructedLink;
    }
  }

  // RELAXED FILTERING: Accept any non-Google link for better results
  console.log(
    `⚠️ No valid store link found, accepting any non-Google link for better results`
  );
  for (const link of linkSources) {
    if (link && !link.includes("google.com")) {
      console.log(`🔧 RELAXED: Accepting link: ${link}`);
      return link;
    }
  }

  // FINAL FALLBACK: Return Google Shopping link if nothing else works
  if (product.product_link) {
    console.log(
      `🔧 FINAL FALLBACK: Using Google Shopping link: ${product.product_link}`
    );
    return product.product_link;
  }

  console.log(`❌ No valid store link found for product: ${product.title}`);
  return null;
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

    // Check database cache first - use the exact query for cache key
    let queryType = getQueryType(query.toLowerCase());
    let hasCachedProducts = false;

    // Create a more specific cache key that includes the exact query
    const cacheKey = `${queryType}_${encodeURIComponent(query.trim())}`;
    console.log(`🔍 Cache key: "${cacheKey}"`);

    try {
      hasCachedProducts = await GoogleShoppingProduct.hasEnoughCachedProducts(
        cacheKey,
        30
      );
    } catch (dbError) {
      console.error("❌ Database cache check failed:", dbError);
      // Continue without cache if database fails
    }

    if (hasCachedProducts) {
      try {
        console.log(
          `✅ Returning cached products from database for cache key: "${cacheKey}"`
        );
        const cachedProducts = await GoogleShoppingProduct.getCachedProducts(
          cacheKey,
          60
        );

        const formattedProducts = cachedProducts.map((p) => ({
          id: p.id,
          title: p.title_fa,
          originalTitle: p.title,
          price: parseFloat(p.price),
          image: p.thumbnail,
          link: p.link,
          source: p.source,
          createdAt: p.createdAt,
        }));

        return NextResponse.json({
          products: formattedProducts,
          total: formattedProducts.length,
          search_query: query,
          query_type: queryType,
          message:
            "\u202Aبرای سفارش محصول روی + کلیک کنید تا محصول به سبد خرید انتقال داده بشه\u202C",
          cached: true,
          from_database: true,
        });
      } catch (cacheError) {
        console.error("❌ Failed to retrieve cached products:", cacheError);
        // Continue with fresh search if cache retrieval fails
      }
    }

    console.log(`🔍 Starting search for query: "${query}"`);

    // Check if API keys are available
    if (!process.env.SERPAPI_KEY) {
      console.error("❌ SERPAPI_KEY is not configured");

      // Try to return cached products even if API is not configured
      try {
        const cachedProducts = await GoogleShoppingProduct.getCachedProducts(
          queryType,
          30
        );

        if (cachedProducts.length > 0) {
          console.log(
            `✅ Returning ${cachedProducts.length} cached products despite missing API key`
          );
          const formattedProducts = cachedProducts.map((p) => ({
            id: p.id,
            title: p.title_fa,
            originalTitle: p.title,
            price: parseFloat(p.price),
            image: p.thumbnail,
            link: p.link,
            source: p.source,
            createdAt: p.createdAt,
          }));

          return NextResponse.json({
            products: formattedProducts,
            total: formattedProducts.length,
            search_query: query,
            query_type: queryType,
            message:
              "\u202Aبرای سفارش محصول روی + کلیک کنید تا محصول به سبد خرید انتقال داده بشه\u202C",
            cached: true,
            from_database: true,
            api_configured: false,
          });
        }
      } catch (dbError) {
        console.error("❌ Database connection failed:", dbError);
      }

      // If no cached products, redirect to sample products API
      console.log("🔄 Redirecting to sample products API");
      const sampleResponse = await fetch(
        `${request.nextUrl.origin}/api/shopping/sample-products?q=${encodeURIComponent(query)}`
      );
      const sampleData = await sampleResponse.json();

      return NextResponse.json({
        ...sampleData,
        message:
          "محصولات نمونه نمایش داده می‌شوند. برای نتایج واقعی، لطفاً API keys را تنظیم کنید.",
        api_configured: false,
        sample_data: true,
      });
    }

    // Connect to database
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error("❌ Database connection failed:", dbError);
      // Continue without database if connection fails
      // The search will still work, just without caching
    }

    // Add randomization to search results by modifying query slightly
    // Remove timestamp if present to clean the query
    let cleanQuery = query.replace(/\s+\d{13}$/, "").trim();

    // Add query-specific enhancements for better differentiation
    const queryLower = cleanQuery.toLowerCase();

    // Add gender-specific keywords for fashion queries
    if (
      queryLower.includes("مردانه") ||
      queryLower.includes("men") ||
      queryLower.includes("erkek")
    ) {
      cleanQuery = `${cleanQuery} erkek giyim erkek moda erkek kıyafet`;
      console.log(`👔 Added men's fashion keywords`);
    } else if (
      queryLower.includes("زنانه") ||
      queryLower.includes("women") ||
      queryLower.includes("kadın")
    ) {
      cleanQuery = `${cleanQuery} kadın giyim kadın moda kadın kıyafet`;
      console.log(`👗 Added women's fashion keywords`);
    }

    // Add random variation words for diverse results
    const randomVariations = [
      "kaliteli",
      "uygun fiyat",
      "en iyi",
      "popüler",
      "trend",
      "yeni",
      "özel",
      "indirimli",
      "ucuz",
      "premium",
      "marka",
      "orijinal",
    ];
    const randomWord =
      randomVariations[Math.floor(Math.random() * randomVariations.length)];
    const shouldAddVariation = Math.random() > 0.3; // 70% chance for more variety

    if (shouldAddVariation) {
      cleanQuery = `${cleanQuery} ${randomWord}`;
      console.log(`🎲 Added random variation: "${randomWord}"`);
    }

    // Add timestamp to ensure unique queries and avoid caching issues
    const timestamp = Date.now();
    cleanQuery = `${cleanQuery} ${timestamp}`;
    console.log(`⏰ Added timestamp to query: ${timestamp}`);

    // ترجمه و بهبود کوئری جستجو با OpenAI - فقط اگر API key موجود باشد
    let enhancedQuery = cleanQuery;
    if (process.env.OPENAI_API_KEY) {
      try {
        const enhancedQueryPrompt = `
          من یک کوئری جستجو به زبان فارسی دارم که باید آن را برای جستجو در فروشگاه‌های آنلاین ترکیه بهبود دهم.

          کوئری اصلی: "${cleanQuery}"

          لطفاً:
          1. این کوئری را به ترکی ترجمه کنید
          2. آن را دقیق‌تر کنید (مثلاً اگر "لباس زارا" است، فقط لباس‌های برند زارا را در نظر بگیرید)
          3. کلمات کلیدی مناسب برای جستجو در Google Shopping اضافه کنید
          4. اگر کوئری خیلی عمومی است، آن را گسترش دهید

          فقط کوئری بهبود یافته را به زبان ترکی برگردانید، بدون توضیح اضافی:
        `;

        const { text } = await generateText({
          model: openai("gpt-3.5-turbo"),
          prompt: enhancedQueryPrompt,
          maxOutputTokens: 100,
          temperature: 0.3,
        });

        enhancedQuery = text.trim() || cleanQuery;

        console.log(`✅ Query enhanced: "${query}" → "${enhancedQuery}"`);
      } catch (error) {
        console.error("❌ Error enhancing query:", error);
        // اگر OpenAI کار نکرد، از کوئری اصلی استفاده کن
        enhancedQuery = cleanQuery;
      }
    } else {
      console.log("⚠️ OpenAI API key not configured, using original query");
    }

    // جستجو در Google Shopping برای محصولات از ترکیه
    console.log(`🔍 Searching with query: "${enhancedQuery}"`);

    // تشخیص نوع کتگوری برای تعیین تعداد نتایج
    const lowerQuery = enhancedQuery.toLowerCase();

    // حیوانات خانگی - بررسی اول برای اولویت بالاتر
    const petsKeywords = [
      "حیوانات خانگی",
      "حیوانات",
      "pets",
      "سگ",
      "dog",
      "گربه",
      "cat",
      "حیوان خانگی",
      "pet",
      "غذای سگ",
      "غذای گربه",
      "تشویقی سگ",
      "تشویقی گربه",
      "قلاده",
      "محصولات بهداشتی حیوانات",
    ];

    // ورزشی - بررسی دوم
    const sportsKeywords = [
      "ورزشی",
      "sport",
      "sports",
      "ورزش",
      "فیتنس",
      "fitness",
      "دویدن",
      "running",
      "ساک ورزشی",
      "لوازم ورزشی",
      "کفش ورزشی",
      "لباس ورزشی",
      "ترموس",
      "قمقمه",
      "اسباب ورزشی",
    ];

    // ویتامین و دارو
    const vitaminKeywords = [
      "ویتامین",
      "vitamin",
      "دارو",
      "medicine",
      "مکمل",
      "supplement",
      "مولتی ویتامین",
      "کلسیم",
      "ملاتونین",
    ];

    // زیبایی و آرایش
    const beautyKeywords = [
      "زیبایی",
      "آرایش",
      "beauty",
      "cosmetics",
      "makeup",
      "perfume",
      "cologne",
      "لوازم آرایشی",
      "عطر",
      "ادکلن",
      "مراقبت از پوست",
      "ضد پیری",
      "محصولات آفتاب",
      "رنگ مو",
      "شامپو",
    ];

    // الکترونیک
    const electronicsKeywords = [
      "الکترونیک",
      "electronics",
      "موبایل",
      "mobile",
      "لپ تاپ",
      "laptop",
      "تبلت",
      "tablet",
      "هدفون",
      "headphone",
      "ساعت هوشمند",
      "smartwatch",
    ];

    // مد و پوشاک - بررسی آخر برای جلوگیری از تداخل
    const fashionKeywords = [
      "مد",
      "پوشاک",
      "fashion",
      "clothing",
      "dress",
      "shirt",
      "pants",
      "jeans",
      "skirt",
      "blouse",
      "t-shirt",
      "sweater",
      "jacket",
      "coat",
      "پیراهن",
      "تاپ",
      "شلوار",
      "شومیز",
      "دامن",
      "ژاکت",
      "کت",
      "کیف",
      "کیف دستی",
      "jewelry",
      "جواهرات",
      "زیورآلات",
    ];

    // تشخیص نوع کوئری با اولویت‌بندی
    let isFashionQuery = false;

    if (petsKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      queryType = "pets";
    } else if (sportsKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      queryType = "sports";
    } else if (
      vitaminKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      queryType = "vitamins";
    } else if (beautyKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      queryType = "beauty";
      isFashionQuery = true; // زیبایی هم تعداد نتایج بیشتری نیاز دارد
    } else if (
      electronicsKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      queryType = "electronics";
    } else if (
      fashionKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      queryType = "fashion";
      isFashionQuery = true;
    }

    // بهبود کوئری بر اساس نوع تشخیص داده شده
    if (queryType === "sports") {
      // برای کوئری‌های ورزشی، کلمات کلیدی دقیق‌تر اضافه کن
      if (lowerQuery.includes("لوازم ورزشی") || lowerQuery.includes("ورزشی")) {
        enhancedQuery = enhancedQuery + " spor malzemeleri fitness gym";
      }
      if (lowerQuery.includes("کفش ورزشی")) {
        enhancedQuery = enhancedQuery + " spor ayakkabı sneaker athletic shoes";
      }
      if (lowerQuery.includes("لباس ورزشی")) {
        enhancedQuery =
          enhancedQuery + " spor giyim atletik kıyafet sportswear";
      }
      if (lowerQuery.includes("ساک ورزشی")) {
        enhancedQuery = enhancedQuery + " spor çantası gym bag";
      }
      if (lowerQuery.includes("ترموس ورزشی")) {
        enhancedQuery = enhancedQuery + " spor termos water bottle";
      }
      console.log(`🏃‍♂️ Sports query enhanced: "${enhancedQuery}"`);
    } else if (queryType === "pets") {
      // برای کوئری‌های حیوانات خانگی
      if (lowerQuery.includes("غذای سگ")) {
        enhancedQuery = enhancedQuery + " köpek maması dog food";
      }
      if (lowerQuery.includes("غذای گربه")) {
        enhancedQuery = enhancedQuery + " kedi maması cat food";
      }
      if (lowerQuery.includes("قلاده")) {
        enhancedQuery = enhancedQuery + " köpek tasması pet collar";
      }
      console.log(`🐕 Pet query enhanced: "${enhancedQuery}"`);
    } else if (queryType === "fashion") {
      // برای کوئری‌های مد و پوشاک
      if (lowerQuery.includes("پیراهن")) {
        enhancedQuery = enhancedQuery + " gömlek shirt";
      }
      if (lowerQuery.includes("کیف")) {
        enhancedQuery = enhancedQuery + " çanta bag handbag";
      }
      if (lowerQuery.includes("جین")) {
        enhancedQuery = enhancedQuery + " jean denim";
      }
      console.log(`👔 Fashion query enhanced: "${enhancedQuery}"`);
    }

    const resultCount = isFashionQuery ? 60 : 50;

    console.log(`🎯 Query type: ${queryType}`);
    console.log(`📊 Result count: ${resultCount}`);
    console.log(`🔍 Original query: "${query}"`);
    console.log(`🔍 Enhanced query: "${enhancedQuery}"`);

    const serpApiParams = {
      engine: "google_shopping",
      q: enhancedQuery,
      gl: "tr", // ترکیه
      hl: "tr", // زبان ترکی
      location: "Turkey",
      num: resultCount, // تعداد نتایج بر اساس نوع کوئری
      device: "desktop", // اجباری برای دسکتاپ
      api_key: process.env.SERPAPI_KEY,
    };

    console.log("🔍 Search parameters:", serpApiParams);

    let shoppingResults;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        console.log(`🔍 SERPAPI attempt ${retryCount + 1}/${maxRetries + 1}`);
        shoppingResults = await getJson(serpApiParams);
        console.log("✅ SERPAPI request successful");
        break; // Success, exit retry loop
      } catch (serpError) {
        retryCount++;
        console.error(`❌ SERPAPI Error (attempt ${retryCount}):`, serpError);

        // Check if it's an API key issue
        if (serpError instanceof Error) {
          if (
            serpError.message.includes("API key") ||
            serpError.message.includes("authentication")
          ) {
            throw new Error("SERPAPI_KEY is invalid or missing");
          } else if (
            serpError.message.includes("quota") ||
            serpError.message.includes("rate limit")
          ) {
            throw new Error("SERPAPI rate limit exceeded");
          } else if (
            serpError.message.includes("timeout") ||
            serpError.message.includes("network")
          ) {
            if (retryCount <= maxRetries) {
              console.log(
                `🔄 Retrying due to timeout... (${retryCount}/${maxRetries})`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, 1000 * retryCount)
              ); // Exponential backoff
              continue;
            } else {
              throw new Error("SERPAPI request timeout after retries");
            }
          }
        }

        // If we've exhausted retries, throw the error
        if (retryCount > maxRetries) {
          throw new Error(
            `SERPAPI request failed after ${maxRetries + 1} attempts: ${serpError instanceof Error ? serpError.message : "Unknown error"}`
          );
        }

        // For other errors, wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    console.log("🔍 Raw search results:", {
      hasResults: !!shoppingResults?.shopping_results,
      resultCount: shoppingResults?.shopping_results?.length || 0,
      searchInfo: shoppingResults?.search_information,
    });

    // Debug: log کردن ساختار داده برای بهبود
    if (
      shoppingResults?.shopping_results &&
      shoppingResults.shopping_results.length > 0
    ) {
      const sampleProduct = shoppingResults.shopping_results[0];
      console.log("📋 Sample product structure:");
      console.log("- product.link:", sampleProduct.link);
      console.log("- product.source_link:", sampleProduct.source_link);
      console.log("- product.merchant:", sampleProduct.merchant);
      console.log("- product.product_id:", sampleProduct.product_id);
      console.log("- product.title:", sampleProduct.title);
      console.log("- product.price:", sampleProduct.price);
    }

    if (
      !shoppingResults?.shopping_results ||
      shoppingResults.shopping_results.length === 0
    ) {
      console.log("❌ No search results found");
      return NextResponse.json({
        products: [],
        message: "هیچ محصولی یافت نشد. لطفاً کلمات کلیدی دیگری امتحان کنید.",
        search_query: query,
        enhanced_query: enhancedQuery,
      });
    }

    // نمایش همه محصولات (بدون فیلتر اولیه)
    console.log(
      `🔍 Total products from SerpAPI: ${shoppingResults?.shopping_results?.length || 0}`
    );

    // اگر برای کوئری مد و پوشاک نتایج کم است، سعی کن با چندین جستجوی موازی
    let limitedResults =
      shoppingResults?.shopping_results?.slice(0, resultCount) || [];

    if (isFashionQuery && limitedResults.length < 30) {
      console.log(
        `⚠️ Fashion query returned only ${limitedResults.length} results, trying multiple broader searches...`
      );

      const additionalQueries = [];

      // اضافه کردن کوئری‌های مختلف برای نتایج بیشتر
      if (
        enhancedQuery.includes("kadın") ||
        enhancedQuery.includes("women") ||
        enhancedQuery.includes("زنانه")
      ) {
        additionalQueries.push("kadın giyim", "women clothing", "kadın moda");
      } else if (
        enhancedQuery.includes("erkek") ||
        enhancedQuery.includes("men") ||
        enhancedQuery.includes("مردانه")
      ) {
        additionalQueries.push("erkek giyim", "men clothing", "erkek moda");
      } else {
        additionalQueries.push("giyim", "moda", "clothing", "fashion");
      }

      // انجام جستجوهای اضافی
      for (const additionalQuery of additionalQueries) {
        try {
          const additionalParams = {
            ...serpApiParams,
            q: additionalQuery,
            num: 40,
          };

          console.log(`🔄 Additional search with: "${additionalQuery}"`);
          const additionalResults = await getJson(additionalParams);

          if (
            additionalResults.shopping_results &&
            additionalResults.shopping_results.length > 0
          ) {
            console.log(
              `✅ Additional search found ${additionalResults.shopping_results.length} results`
            );

            // ترکیب نتایج و حذف تکراری‌ها
            const existingIds = new Set(
              limitedResults.map((p: any) => p.product_id || p.title)
            );
            const newResults = additionalResults.shopping_results.filter(
              (p: any) => !existingIds.has(p.product_id || p.title)
            );

            limitedResults = [...limitedResults, ...newResults].slice(0, 60);
            console.log(
              `📊 Combined results: ${limitedResults.length} products`
            );

            if (limitedResults.length >= 50) break; // اگر به تعداد کافی رسیدیم، توقف کن
          }
        } catch (error) {
          console.error(
            `❌ Additional search failed for "${additionalQuery}":`,
            error
          );
        }
      }
    }

    console.log(`📊 Processing ${limitedResults.length} products`);

    // فیلتر محصولات بر اساس نوع کوئری
    let filteredResults = limitedResults;

    if (queryType === "sports") {
      // برای کوئری‌های ورزشی، فقط محصولاتی را نگه دار که واقعاً ورزشی هستند
      filteredResults = limitedResults.filter((product: any) => {
        const title = product.title?.toLowerCase() || "";
        const snippet = product.snippet?.toLowerCase() || "";
        const combined = title + " " + snippet;

        // کلمات کلیدی ورزشی مثبت
        const sportsPositive = [
          "spor",
          "sport",
          "athletic",
          "fitness",
          "gym",
          "workout",
          "exercise",
          "running",
          "jogging",
          "basketball",
          "football",
          "tennis",
          "golf",
          "yoga",
          "pilates",
          "crossfit",
          "training",
          "active",
          "performance",
        ];

        // کلمات کلیدی غیر ورزشی (باید حذف شوند)
        const sportsNegative = [
          "formal",
          "business",
          "casual",
          "evening",
          "party",
          "wedding",
          "office",
          "dress",
          "elegant",
          "fashion",
          "style",
          "chic",
        ];

        const hasPositive = sportsPositive.some((word) =>
          combined.includes(word)
        );
        const hasNegative = sportsNegative.some((word) =>
          combined.includes(word)
        );

        return hasPositive && !hasNegative;
      });

      console.log(
        `🏃‍♂️ Sports filter: ${limitedResults.length} → ${filteredResults.length} products`
      );
    } else if (queryType === "pets") {
      // برای کوئری‌های حیوانات خانگی
      filteredResults = limitedResults.filter((product: any) => {
        const title = product.title?.toLowerCase() || "";
        const snippet = product.snippet?.toLowerCase() || "";
        const combined = title + " " + snippet;

        const petKeywords = [
          "pet",
          "köpek",
          "kedi",
          "dog",
          "cat",
          "animal",
          "hayvan",
          "mama",
          "food",
          "toy",
          "collar",
          "leash",
          "bed",
          "bowl",
        ];

        return petKeywords.some((word) => combined.includes(word));
      });

      console.log(
        `🐕 Pet filter: ${limitedResults.length} → ${filteredResults.length} products`
      );
    }

    // Step 4: Translate products to Persian and save to database
    console.log(
      "🔄 Step 4: Translating products to Persian and saving to database..."
    );
    const translatedProductsPromises = filteredResults.map(
      async (product: any, index: number) => {
        try {
          console.log(`🔄 Translating product ${index + 1}: ${product.title}`);

          // ترجمه عنوان و توضیحات به فارسی
          const translationResult = await generateText({
            model: openai("gpt-3.5-turbo"),
            prompt: `Translate the following product title and description to Persian (Farsi). 
          Return only the Persian translation, nothing else. 
          Make it a coherent sentence of 5-10 words, not word-for-word literal translation.
          
          Product title: "${product.title}"
          Product description: "${product.snippet || ""}"
          
          Persian translation:`,
            maxOutputTokens: 150,
          });

          const persianTitle = translationResult.text.trim();

          // ترجمه جداگانه توضیحات
          const descriptionTranslationResult = await generateText({
            model: openai("gpt-3.5-turbo"),
            prompt: `Translate the following product description to Persian (Farsi). 
          Return only the Persian translation, nothing else. 
          Make it natural and readable.
          
          Product description: "${product.snippet || ""}"
          
          Persian translation:`,
            maxOutputTokens: 200,
          });

          const persianDescription = descriptionTranslationResult.text.trim();

          // استخراج قیمت
          let finalPrice = 0;
          let finalOriginalPrice = null;
          let currency = "TRY";

          if (product.extracted_price) {
            finalPrice = product.extracted_price;
          } else if (product.price) {
            const priceStr =
              typeof product.price === "string"
                ? product.price
                : product.price.toString();
            finalPrice =
              parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", ".")) ||
              0;
          }

          if (product.original_price) {
            const originalPriceStr =
              typeof product.original_price === "string"
                ? product.original_price
                : product.original_price.toString();
            finalOriginalPrice =
              parseFloat(
                originalPriceStr.replace(/[^\d.,]/g, "").replace(",", ".")
              ) || null;
          }

          // واحد پول
          if (product.currency) {
            currency = product.currency;
          } else if (product.price && typeof product.price === "string") {
            if (product.price.includes("₺")) currency = "TRY";
            else if (product.price.includes("€")) currency = "EUR";
            else if (product.price.includes("$")) currency = "USD";
          }

          // Extract product link using the new filtering function
          const storeLink = extractProductLink(product);

          // If no valid store link found, skip this product
          if (!storeLink) {
            console.log(
              `❌ Skipping product "${product.title}" - no valid store link`
            );
            return null;
          }

          let googleShoppingLink = "";
          if (product.product_id) {
            googleShoppingLink = `https://www.google.com.tr/shopping/product/${product.product_id}?gl=tr`;
          } else if (product.product_link) {
            googleShoppingLink = product.product_link;
          } else {
            googleShoppingLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(product.title)}`;
          }

          console.log(`✅ Successfully processed product: ${persianTitle}`);

          // Create product data for database
          const productData = {
            id:
              product.product_id ||
              `general_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: product.title,
            title_fa: persianTitle,
            price: finalPrice.toString(),
            link: storeLink,
            thumbnail: product.thumbnail || product.image,
            source: product.source || "فروشگاه آنلاین",
            category: queryType,
            createdAt: new Date(),
          };

          // Save to MongoDB with cache management
          try {
            const productData = {
              id:
                product.product_id ||
                `general_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: product.title,
              title_fa: persianTitle,
              price: finalPrice.toString(),
              link: storeLink,
              thumbnail: product.thumbnail || product.image,
              source: product.source || "فروشگاه آنلاین",
              category: cacheKey, // Use the specific cache key instead of queryType
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            };

            const savedProduct = new GoogleShoppingProduct(productData);
            await savedProduct.save();
            console.log(`💾 Saved to database: ${persianTitle}`);
          } catch (dbError) {
            console.error(
              `❌ Database save error for ${persianTitle}:`,
              dbError
            );
            // Continue even if database save fails
          }

          return {
            id: product.product_id || Math.random().toString(36).substr(2, 9),
            title: persianTitle,
            originalTitle: product.title,
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            currency: currency,
            image: product.thumbnail,
            description: persianDescription,
            originalDescription: product.snippet,
            link: storeLink, // لینک فروشگاه اصلی (hepsiburada, sephora, etc.)
            googleShoppingLink: googleShoppingLink, // لینک Google Shopping
            source: product.source || "فروشگاه آنلاین",
            rating: product.rating || 0,
            reviews: product.reviews || 0,
            delivery: product.delivery || "اطلاعات ارسال نامشخص",
            position: product.position,
            product_id: product.product_id,
          };
        } catch (error) {
          console.error(`❌ Error processing product ${index + 1}:`, error);

          // در صورت خطا، از مقادیر پیش‌فرض استفاده کن
          let googleShoppingLink = "";
          if (product.product_id) {
            googleShoppingLink = `https://www.google.com.tr/shopping/product/${product.product_id}?gl=tr`;
          } else if (product.product_link) {
            googleShoppingLink = product.product_link;
          } else {
            googleShoppingLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(product.title)}`;
          }

          // استخراج قیمت برای fallback case
          let finalPrice = 0;
          let finalOriginalPrice = null;
          let currency = "TRY";

          if (product.extracted_price) {
            finalPrice = product.extracted_price;
          } else if (product.price) {
            const priceStr =
              typeof product.price === "string"
                ? product.price
                : product.price.toString();
            finalPrice =
              parseFloat(priceStr.replace(/[^\d.,]/g, "").replace(",", ".")) ||
              0;
          }

          if (product.original_price) {
            const originalPriceStr =
              typeof product.original_price === "string"
                ? product.original_price
                : product.original_price.toString();
            finalOriginalPrice =
              parseFloat(
                originalPriceStr.replace(/[^\d.,]/g, "").replace(",", ".")
              ) || null;
          }

          if (product.currency) {
            currency = product.currency;
          } else if (product.price && typeof product.price === "string") {
            if (product.price.includes("₺")) currency = "TRY";
            else if (product.price.includes("€")) currency = "EUR";
            else if (product.price.includes("$")) currency = "USD";
          }

          // Extract product link using the new filtering function for fallback
          const storeLink = extractProductLink(product);

          // If no valid store link found in fallback, skip this product
          if (!storeLink) {
            console.log(
              `❌ Skipping product "${product.title}" (fallback) - no valid store link`
            );
            return null;
          }

          return {
            id: product.product_id || Math.random().toString(36).substr(2, 9),
            title: product.title,
            originalTitle: product.title,
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            currency: currency,
            image: product.thumbnail,
            description: product.snippet || "توضیحات این محصول در دسترس نیست.",
            originalDescription: product.snippet,
            link: storeLink, // لینک فروشگاه اصلی
            googleShoppingLink: googleShoppingLink,
            source: product.source || "فروشگاه آنلاین",
            rating: product.rating || 0,
            reviews: product.reviews || 0,
            delivery: product.delivery || "اطلاعات ارسال نامشخص",
            position: product.position,
            product_id: product.product_id,
          };
        }
      }
    );

    // فیلتر کردن null values و اجرای Promise.all
    const enhancedProducts = (
      await Promise.all(translatedProductsPromises)
    ).filter(Boolean);

    console.log(`✅ Final processed products: ${enhancedProducts.length}`);

    // Manage cache after saving products
    if (enhancedProducts.length > 0) {
      try {
        await GoogleShoppingProduct.limitProductsPerCategory(cacheKey, 60);
        console.log(`🗂️ Cache managed for category: ${queryType}`);
      } catch (cacheError) {
        console.error(`❌ Cache management error:`, cacheError);
      }
    }

    let message = "";
    if (enhancedProducts.length === 0) {
      message = "هیچ محصولی یافت نشد. لطفاً کلمات کلیدی دیگری امتحان کنید.";
    } else if (isFashionQuery && enhancedProducts.length < 20) {
      message = `${enhancedProducts.length} محصول مد و پوشاک یافت شد. برای نتایج بیشتر کلمات کلیدی مختلفی امتحان کنید.`;
    } else if (isFashionQuery) {
      message = `${enhancedProducts.length} محصول مد و پوشاک یافت شد.`;
    }

    const responseData = {
      products: enhancedProducts,
      total: shoppingResults.search_information?.total_results || 0,
      search_query: query,
      enhanced_query: enhancedQuery,
      query_type: queryType,
      is_fashion_query: isFashionQuery,
      message: message,
      cached: false,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Shopping API Error:", error);

    // Provide more specific error messages based on error type
    let errorMessage = "خطا در جستجوی محصولات. لطفاً دوباره تلاش کنید.";
    let statusCode = 500;

    if (error instanceof Error) {
      if (
        error.message.includes("SERPAPI_KEY") ||
        error.message.includes("API key")
      ) {
        errorMessage = "خطا در تنظیمات API. لطفاً با پشتیبانی تماس بگیرید.";
        statusCode = 500;
      } else if (
        error.message.includes("MONGODB_URI") ||
        error.message.includes("database")
      ) {
        errorMessage = "خطا در اتصال به پایگاه داده. لطفاً دوباره تلاش کنید.";
        statusCode = 500;
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("network")
      ) {
        errorMessage = "زمان انتظار به پایان رسید. لطفاً دوباره تلاش کنید.";
        statusCode = 408;
      } else if (
        error.message.includes("rate limit") ||
        error.message.includes("quota")
      ) {
        errorMessage = "محدودیت استفاده از API. لطفاً بعداً تلاش کنید.";
        statusCode = 429;
      } else {
        errorMessage = error.message;
        statusCode = 500;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: statusCode }
    );
  }
}
