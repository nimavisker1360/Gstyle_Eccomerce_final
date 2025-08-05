"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ChevronRight } from "lucide-react";
import ShoppingProductCard from "./shopping-product-card";
import Link from "next/link";

interface ShoppingProduct {
  id: string;
  title: string;
  originalTitle?: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  image: string;
  description: string;
  originalDescription?: string;
  link?: string;
  googleShoppingLink?: string;
  source: string;
  rating: number;
  reviews: number;
  delivery: string;
}

interface SearchProductsLayoutProps {
  telegramSupport?: string;
  initialQuery?: string;
  hideSearchBar?: boolean;
  allowEmpty?: boolean;
  brandFilter?: string;
  typeFilter?: string;
}

export default function SearchProductsLayout({
  telegramSupport,
  initialQuery,
  hideSearchBar = false,
  allowEmpty = false,
  brandFilter,
  typeFilter,
}: SearchProductsLayoutProps) {
  const [products, setProducts] = useState<ShoppingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // تشخیص کوئری‌های مربوط به مد و پوشاک
  const isFashionQuery = (query: string) => {
    const fashionKeywords = [
      "لباس",
      "پوشاک",
      "مد",
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
      "shoes",
      "boots",
      "sneakers",
      "bag",
      "purse",
      "accessories",
      "jewelry",
      "زیبایی",
      "beauty",
      "cosmetics",
      "makeup",
      "perfume",
      "cologne",
      "زنانه",
      "مردانه",
      "بچه گانه",
      "women",
      "men",
      "kids",
      "children",
    ];

    return fashionKeywords.some((keyword) =>
      query.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // تشخیص نوع کتگوری و کوتاه کردن متن نمایشی
  const getDisplayText = (query: string) => {
    const lowerQuery = query.toLowerCase();

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
      "آرایش و زیبایی",
      "زیبایی و آرایش",
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
      "رژ لب",
      "ماسکارا",
      "کرم مرطوب کننده",
      "کرم آفتاب",
      "لوازم آرایش",
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

    // مد و پوشاک - بررسی آخر برای جلوگیری از تداخل (بدون کلمات مشترک)
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

    // بررسی به ترتیب اولویت - زیبایی اول برای اولویت بالاتر
    if (beautyKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      return "زیبایی و آرایش";
    } else if (petsKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      return "حیوانات خانگی";
    } else if (
      vitaminKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      return "ویتامین و دارو";
    } else if (
      electronicsKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      return "الکترونیک";
    } else if (sportsKeywords.some((keyword) => lowerQuery.includes(keyword))) {
      return "لوازم ورزشی";
    } else if (
      fashionKeywords.some((keyword) => lowerQuery.includes(keyword))
    ) {
      return "مد و پوشاک";
    }

    // اگر هیچ کدام تطبیق نکرد، متن اصلی را کوتاه کن
    return query.length > 20 ? query.substring(0, 20) + "..." : query;
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setMessage("");
    setCurrentSearch(query);

    try {
      console.log(`🔍 Searching for: "${query}"`);

      // Check client-side cache first for regular searches
      const cacheKey = `search:${query.toLowerCase().trim()}:${brandFilter || "none"}:${typeFilter || "none"}`;
      const cacheExpiry = 3 * 60 * 1000; // 3 minutes for search results
      const cached = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

      if (cached && cacheTimestamp && !brandFilter) {
        const now = Date.now();
        const timestamp = parseInt(cacheTimestamp);

        if (now - timestamp < cacheExpiry) {
          console.log("✅ Using cached search results from localStorage");
          const cachedData = JSON.parse(cached);
          setProducts(cachedData.products || []);
          setMessage(cachedData.message || "");
          setLoading(false);
          return;
        }
      }

      // Check if this is a Turkish brand search
      if (brandFilter && typeFilter === "turkish") {
        console.log(`🇹🇷 Turkish brand search for: ${brandFilter}`);

        const response = await fetch(
          `/api/shopping/turkish-brands?brand=${encodeURIComponent(brandFilter)}&type=turkish`
        );
        const data = await response.json();

        console.log(`📊 Turkish brand search response:`, {
          status: response.status,
          productsCount: data.products?.length || 0,
          message: data.message,
          error: data.error,
        });

        if (!response.ok) {
          throw new Error(data.error || "خطا در دریافت محصولات برند ترکیه");
        }

        setProducts(data.products || []);
        setMessage(data.message || `محصولات برند ${brandFilter}`);
      } else {
        // Regular search
        const response = await fetch(
          `/api/shopping?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();

        console.log(`📊 Search response:`, {
          status: response.status,
          productsCount: data.products?.length || 0,
          message: data.message,
          error: data.error,
        });

        if (!response.ok) {
          throw new Error(data.error || "خطا در دریافت اطلاعات");
        }

        setProducts(data.products || []);
        setMessage(data.message || "");

        // Cache successful search results (only for regular searches, not filtered)
        if (!brandFilter && !typeFilter && data.products) {
          const cacheData = {
            products: data.products,
            message: data.message || "",
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
        }

        // Log search results for debugging
        if (data.products && data.products.length > 0) {
          const isQueryFashion = isFashionQuery(query);
          console.log(`✅ Found ${data.products.length} products`);
          console.log(`🎯 Fashion query: ${isQueryFashion ? "Yes" : "No"}`);
          console.log(
            `📊 Will display: ${isQueryFashion ? data.products.length : Math.min(50, data.products.length)} products`
          );
          data.products.forEach((product: ShoppingProduct, index: number) => {
            console.log(
              `📦 Product ${index + 1}: ${product.title} - ${product.price} ${product.currency}`
            );
          });
        } else {
          console.log(`❌ No products found for query: "${query}"`);
        }
      }
    } catch (err) {
      console.error("❌ Search error:", err);
      setError("خطا در دریافت محصولات. لطفاً دوباره تلاش کنید.");
      setProducts([]);
      setMessage("");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  // جستجوی اولیه - فقط اگر query وجود داشته باشد
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      console.log(`🚀 Initial search for: "${initialQuery}"`);
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch, brandFilter, typeFilter]);

  // اگر هیچ query اولیه‌ای وجود نداشته باشد و allowEmpty false باشد، هیچ محصولی نمایش نده
  if ((!initialQuery || !initialQuery.trim()) && !allowEmpty) {
    return null;
  }

  const renderProducts = () => {
    if (loading || products.length === 0) return null;

    return (
      <div className="space-y-8">
        {/* همه محصولات در گرید */}
        {products.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-800 text-right">
                محصولات پیشنهادی
                {isFashionQuery(currentSearch) && (
                  <span className="text-sm text-green-600 font-normal mr-2">
                    ({products.length} محصول یافت شد)
                  </span>
                )}
              </h3>
              {!isFashionQuery(currentSearch) && (
                <Link
                  href={`/search?q=${encodeURIComponent(currentSearch)}&view=all`}
                  passHref
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    مشاهده بیشتر
                    <ChevronRight className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                  </Button>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 w-full">
              {products
                .slice(0, isFashionQuery(currentSearch) ? products.length : 50)
                .map((product) => (
                  <ShoppingProductCard
                    key={product.id}
                    product={product}
                    telegramSupport={telegramSupport || "@gstyle_support"}
                    isSearchResult={true}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSearchBar = () => {
    if (hideSearchBar) return null;

    return (
      <div className="mb-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="جستجوی محصولات از ترکیه..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            dir="rtl"
          />
          <Button type="submit" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    );
  };

  const renderSearchResults = () => {
    if (!currentSearch || loading) return null;

    return (
      <div className="mb-8">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 shadow-sm border border-green-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                نتایج جستجو برای:
              </h2>
            </div>
            <div className="flex items-center">
              <span className="text-lg font-semibold text-white bg-green-600 px-4 py-2 rounded-lg shadow-sm border border-green-500">
                {getDisplayText(currentSearch)}
              </span>
            </div>
          </div>
          <div className="mt-4 h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-full"></div>
        </div>
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  };

  const renderMessage = () => {
    if (!message || error) return null;

    return (
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
        {message}
      </div>
    );
  };

  const renderLoading = () => {
    if (!loading) return null;

    return (
      <div className="w-full bg-white">
        {/* Beautiful Loading Animation */}
        <div className="flex flex-col items-center justify-center py-8 mb-6">
          <div className="relative">
            {/* Main loading spinner */}
            <div className="w-12 h-12 border-4 border-green-100 border-t-4 border-t-green-500 rounded-full animate-spin"></div>

            {/* Inner spinner */}
            <div
              className="absolute top-1.5 left-1.5 w-9 h-9 border-4 border-blue-100 border-t-4 border-t-blue-500 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
          </div>

          {/* Loading text with typewriter effect */}
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              جستجوی بهترین محصولات...
            </h3>
            <div className="flex justify-center items-center space-x-1 rtl:space-x-reverse">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></div>
              <div
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              از گوگل شاپینگ در حال پیدا کردن محصولات...
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderNoResults = () => {
    if (loading || products.length > 0 || error) return null;

    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          هیچ محصولی برای &quot;{currentSearch}&quot; یافت نشد.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          لطفاً کلمات کلیدی دیگری امتحان کنید.
        </p>
        <div className="mt-4 text-sm text-gray-400">
          <p>پیشنهادات جستجو:</p>
          <ul className="mt-2 space-y-1">
            <li>• لباس زنانه</li>
            <li>• کفش ورزشی</li>
            <li>• لوازم آرایشی</li>
            <li>• ساعت مچی</li>
            <li>• کیف دستی</li>
          </ul>
        </div>
      </div>
    );
  };

  // اگر allowEmpty true باشد، همیشه کامپوننت را نمایش بده
  if (allowEmpty) {
    return (
      <div className="w-full">
        {renderSearchBar()}
        {renderSearchResults()}
        {renderError()}
        {renderMessage()}
        {renderLoading()}
        {renderProducts()}
        {renderNoResults()}
      </div>
    );
  }

  return (
    <div className="w-full">
      {renderSearchBar()}
      {renderSearchResults()}
      {renderError()}
      {renderMessage()}
      {renderLoading()}
      {renderProducts()}
      {renderNoResults()}
    </div>
  );
}
