import { NextRequest, NextResponse } from "next/server";
import { getJson } from "serpapi";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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

    // Check cache first
    const cacheKey = `search:${query.toLowerCase().trim()}`;
    const now = Date.now();
    const cachedResult = searchCache.get(cacheKey);

    if (cachedResult && now - cachedResult.timestamp < cachedResult.ttl) {
      console.log(`✅ Returning cached search results for: "${query}"`);
      return NextResponse.json({
        ...cachedResult.data,
        cached: true,
      });
    }

    console.log(`🔍 Starting search for query: "${query}"`);

    // Check if API keys are available
    if (!process.env.SERPAPI_KEY) {
      console.error("❌ SERPAPI_KEY is not configured");
      return NextResponse.json(
        { error: "Search service is not configured" },
        { status: 500 }
      );
    }

    // Add randomization to search results by modifying query slightly
    // Remove timestamp if present to clean the query
    let cleanQuery = query.replace(/\s+\d{13}$/, "").trim();

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
    ];
    const randomWord =
      randomVariations[Math.floor(Math.random() * randomVariations.length)];
    const shouldAddVariation = Math.random() > 0.5; // 50% chance

    if (shouldAddVariation) {
      cleanQuery = `${cleanQuery} ${randomWord}`;
      console.log(`🎲 Added random variation: "${randomWord}"`);
    }

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
    let queryType = "other";
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
      num: resultCount, // تعداد نتایج بر اساس نوع کوئری
      device: "desktop", // اجباری برای دسکتاپ
      api_key: process.env.SERPAPI_KEY,
    };

    console.log("🔍 Search parameters:", serpApiParams);

    const shoppingResults = await getJson(serpApiParams);

    console.log("🔍 Raw search results:", {
      hasResults: !!shoppingResults.shopping_results,
      resultCount: shoppingResults.shopping_results?.length || 0,
      searchInfo: shoppingResults.search_information,
    });

    // Debug: log کردن ساختار داده برای بهبود
    if (
      shoppingResults.shopping_results &&
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
      !shoppingResults.shopping_results ||
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
      `🔍 Total products from SerpAPI: ${shoppingResults.shopping_results.length}`
    );

    // اگر برای کوئری مد و پوشاک نتایج کم است، سعی کن با چندین جستجوی موازی
    let limitedResults = shoppingResults.shopping_results.slice(0, resultCount);

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

    // ترجمه عنوان و توضیحات محصولات با OpenAI
    const enhancedProductsPromises = filteredResults.map(
      async (product: any, index: number) => {
        console.log(`🔄 Processing product ${index + 1}: ${product.title}`);

        try {
          let persianTitle = product.title;
          let persianDescription =
            product.snippet || "توضیحات این محصول در دسترس نیست.";

          // Only translate if OpenAI is available
          if (process.env.OPENAI_API_KEY) {
            try {
              const translationPrompt = `
                لطفاً عنوان و توضیحات این محصول را به فارسی ترجمه کنید:

                عنوان: ${product.title}
                توضیحات: ${product.snippet || "بدون توضیحات"}

                پاسخ را در این فرمت JSON بدهید:
                {
                  "title": "عنوان فارسی",
                  "description": "توضیحات فارسی (حداکثر 100 کلمه، جذاب و مناسب فروش)"
                }
              `;

              const { text: response } = await generateText({
                model: openai("gpt-3.5-turbo"),
                prompt: translationPrompt,
                maxOutputTokens: 200,
                temperature: 0.5,
              });

              try {
                if (response) {
                  // تلاش برای پارس JSON
                  const parsed = JSON.parse(response);
                  persianTitle = parsed.title || product.title;
                  persianDescription = parsed.description || persianDescription;
                }
              } catch (parseError) {
                // اگر JSON پارس نشد، از متن خام استفاده کن
                if (response && response.length > 20) {
                  persianDescription = response;
                }
              }
            } catch (translationError) {
              console.error(
                `❌ Translation error for product ${index + 1}:`,
                translationError
              );
              // Continue with original title/description
            }
          }

          // ساخت لینک Google Shopping از product_id یا link
          let googleShoppingLink = "";
          if (product.product_id) {
            // استفاده از product_id برای لینک دقیق Google Shopping
            googleShoppingLink = `https://www.google.com.tr/shopping/product/${product.product_id}?gl=tr`;
          } else if (product.product_link) {
            // اگر product_link موجود است
            googleShoppingLink = product.product_link;
          } else {
            // fallback برای جستجوی عمومی
            googleShoppingLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(product.title)}`;
          }

          // استخراج قیمت دقیق از فیلدهای مختلف SerpAPI
          let finalPrice = 0;
          let finalOriginalPrice = null;
          let currency = "TRY";

          // تلاش برای یافتن قیمت از فیلدهای مختلف
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

          // قیمت اصلی (قبل از تخفیف)
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

          console.log(`✅ Successfully processed product: ${persianTitle}`);

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
      await Promise.all(enhancedProductsPromises)
    ).filter(Boolean);

    console.log(`✅ Final processed products: ${enhancedProducts.length}`);

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

    // Cache the successful response
    searchCache.set(cacheKey, {
      data: responseData,
      timestamp: now,
      ttl: SEARCH_CACHE_TTL,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Shopping API Error:", error);
    return NextResponse.json(
      {
        error: "خطا در جستجوی محصولات. لطفاً دوباره تلاش کنید.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
