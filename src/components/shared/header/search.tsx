"use client";
import { SearchIcon, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useEffect } from "react";
import { useSearchDebounce } from "@/hooks/use-search-debounce";

interface SearchSuggestion {
  id?: string;
  title: string;
  title_fa: string;
  category: string;
  price: string;
  thumbnail: string;
}

export default function Search() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // تابع جستجو برای debounce
  const searchProducts = async (query: string): Promise<SearchSuggestion[]> => {
    try {
      // جستجو در همه دسته‌بندی‌ها
      const categories = [
        "fashion",
        "beauty",
        "electronics",
        "sports",
        "pets",
        "vitamins",
        "accessories",
      ];
      const allResults: SearchSuggestion[] = [];

      for (const category of categories) {
        const response = await fetch(
          `/api/shopping/${category}-intelligent?query=${encodeURIComponent(query)}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.products && data.products.length > 0) {
            allResults.push(...data.products.slice(0, 3)); // حداکثر ۳ محصول از هر دسته
          }
        }
      }

      return allResults.slice(0, 9); // حداکثر ۹ محصول در کل
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  };

  const {
    query,
    results: suggestions,
    loading,
    error,
    updateQuery,
    clearQuery,
    searchImmediately,
  } = useSearchDebounce(searchProducts, {
    delay: 1000, // ۱ ثانیه debounce
    minLength: 2, // حداقل ۲ کاراکتر
  });

  // مدیریت کلیدهای کیبورد
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions || !suggestions) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            handleSuggestionClick(suggestions[selectedIndex]);
          } else {
            handleSubmit();
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSuggestions, suggestions, selectedIndex]);

  // نمایش/مخفی کردن پیشنهادات
  useEffect(() => {
    setShowSuggestions(
      query.length >= 2 && ((suggestions && suggestions.length > 0) || loading)
    );
  }, [query, suggestions, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateQuery(value);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
      clearQuery();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    router.push(
      `/search?q=${encodeURIComponent(suggestion.title)}&category=${suggestion.category}`
    );
    setShowSuggestions(false);
    clearQuery();
  };

  const handleClearClick = () => {
    clearQuery();
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <form onSubmit={handleSubmit} className="flex items-stretch h-12 w-full">
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          className="flex-1 rounded-l-lg rounded-r-none border-gray-300 bg-gray-100 text-gray-800 text-opacity-40 placeholder-opacity-30 text-base h-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
          placeholder="هزاران محصول را جستجو کنید"
          name="q"
          type="search"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClearClick}
            className="absolute left-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 text-white rounded-r-lg rounded-l-none h-full px-6 py-2 transition-colors"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      </form>

      {/* پیشنهادات جستجو */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              در حال جستجو...
            </div>
          )}

          {error && (
            <div className="p-4 text-red-500 text-sm">
              خطا در جستجو: {error}
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.id || index}-${suggestion.title}`}
                  className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? "bg-green-50 border-r-2 border-green-500"
                      : ""
                  }`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <img
                    src={suggestion.thumbnail || "/images/placeholder.jpg"}
                    alt={suggestion.title_fa}
                    className="w-12 h-12 object-cover rounded mr-3"
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder.jpg";
                    }}
                  />
                  <div className="flex-1 text-right">
                    <div className="font-medium text-gray-800 text-sm">
                      {suggestion.title_fa}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      {suggestion.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {suggestions && suggestions.length === 0 && !loading && (
            <div className="p-4 text-gray-500 text-sm text-center">
              محصولی یافت نشد
            </div>
          )}
        </div>
      )}
    </div>
  );
}
