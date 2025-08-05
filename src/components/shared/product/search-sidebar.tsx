"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SearchSidebarProps {
  currentQuery?: string;
  totalProducts?: number;
  onFilterChange?: (filters: any) => void;
}

interface Category {
  id: string;
  name: string;
  count: number;
}

interface Brand {
  id: string;
  name: string;
  count: number;
}

interface TurkishBrand {
  id: string;
  name: string;
  count: number;
}

export default function SearchSidebar({
  currentQuery,
  totalProducts = 0,
  onFilterChange,
}: SearchSidebarProps) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTurkishBrands, setSelectedTurkishBrands] = useState<string[]>(
    []
  );
  const [turkishBrandSearch, setTurkishBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  // Sample data - in real app this would come from API
  const categories: Category[] = [
    { id: "1", name: "لباس زنانه", count: 245 },
    { id: "2", name: "لباس مردانه", count: 189 },
    { id: "3", name: "کفش", count: 156 },
    { id: "4", name: "لوازم آرایشی", count: 134 },
    { id: "5", name: "ساعت مچی", count: 98 },
    { id: "6", name: "کیف دستی", count: 87 },
    { id: "7", name: "لوازم الکترونیکی", count: 76 },
    { id: "8", name: "اسباب بازی", count: 65 },
  ];

  // Turkish Brands - برندهای معروف ترکیه
  const turkishBrands: TurkishBrand[] = [
    { id: "turkish-1", name: "LC Waikiki", count: 156 },
    { id: "turkish-2", name: "Koton", count: 142 },
    { id: "turkish-3", name: "Mavi", count: 128 },
    { id: "turkish-4", name: "DeFacto", count: 119 },
    { id: "turkish-5", name: "Beymen", count: 98 },
    { id: "turkish-6", name: "Trendyol", count: 87 },
    { id: "turkish-7", name: "Derimod", count: 76 },
    { id: "turkish-8", name: "Hepsiburada", count: 65 },
    { id: "turkish-9", name: "Kiğılı", count: 54 },
    { id: "turkish-10", name: "Altınyıldız", count: 43 },
    { id: "turkish-11", name: "Yargıcı", count: 38 },
    { id: "turkish-12", name: "Gant", count: 32 },
    { id: "turkish-13", name: "Pierre Cardin", count: 29 },
    { id: "turkish-14", name: "Colins", count: 26 },
    { id: "turkish-15", name: "Jack & Jones", count: 24 },
  ];

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    // If checking a category, uncheck all others and only select this one
    if (checked) {
      setSelectedCategories([categoryId]);

      const selectedCategory = categories.find(
        (category) => category.id === categoryId
      );
      if (selectedCategory) {
        // Navigate to search page with category filter
        router.push(
          `/search?category=${encodeURIComponent(selectedCategory.name)}&type=category`
        );
      }
    } else {
      // If unchecking, clear all selections
      setSelectedCategories([]);
    }

    onFilterChange?.({
      categories: checked ? [categoryId] : [],
      turkishBrands: selectedTurkishBrands,
    });
  };

  const handleTurkishBrandChange = (brandId: string, checked: boolean) => {
    // If checking a brand, uncheck all others and only select this one
    if (checked) {
      setSelectedTurkishBrands([brandId]);

      const selectedBrand = turkishBrands.find((brand) => brand.id === brandId);
      if (selectedBrand) {
        // Navigate to search page with Turkish brand filter
        router.push(
          `/search?brand=${encodeURIComponent(selectedBrand.name)}&type=turkish`
        );
      }
    } else {
      // If unchecking, clear all selections
      setSelectedTurkishBrands([]);
    }

    onFilterChange?.({
      categories: selectedCategories,
      turkishBrands: checked ? [brandId] : [],
    });
  };

  const filteredTurkishBrands = turkishBrands.filter((brand) =>
    brand.name.toLowerCase().includes(turkishBrandSearch.toLowerCase())
  );

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-l border-green-200 p-6 h-screen overflow-y-auto">
      {/* Header with context info and breadcrumb in a beautiful green card */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 shadow-lg border border-green-400">
          <div className="text-white">
            {currentQuery && (
              <div className="mb-4">
                <h3 className="text-lg font-bold text-right mb-2">
                  نتایج جستجو
                </h3>
                <p className="text-green-100 text-right text-sm">
                  جستجو برای:{" "}
                  <span className="font-semibold">
                    {currentQuery?.replace(/\d+/g, "").trim()}
                  </span>
                </p>
                {totalProducts > 0 && (
                  <p className="text-green-100 text-right text-sm mt-1">
                    تعداد محصولات:{" "}
                    <span className="font-semibold">{totalProducts}</span>
                  </p>
                )}
              </div>
            )}

            {/* Breadcrumb */}
            <Link
              href="/"
              className="flex items-center text-green-100 hover:text-white transition-colors duration-200 text-sm"
            >
              <ChevronLeft className="w-4 h-4 ml-2" />
              <span>بازگشت به صفحه اصلی</span>
            </Link>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Categories Section */}
      <div className="mb-8">
        <h3 className="font-bold text-green-800 mb-4 text-right">
          دسته‌بندی‌ها
        </h3>

        {/* Category Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="جستجوی دسته‌بندی"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="pl-10 text-right"
              dir="rtl"
            />
          </div>
        </div>

        {/* Show All Categories Button - when a category is selected */}
        {selectedCategories.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => {
                setSelectedCategories([]);
                onFilterChange?.({
                  categories: [],
                  turkishBrands: selectedTurkishBrands,
                });
              }}
              className="w-full px-3 py-2 text-sm text-green-700 border border-green-400 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              نمایش همه دسته‌بندی‌ها
            </button>
          </div>
        )}

        <div className="space-y-3">
          {filteredCategories.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            const hasAnySelected = selectedCategories.length > 0;

            // Show all categories if none selected, or only show the selected category
            const shouldShow = !hasAnySelected || isSelected;

            if (!shouldShow) return null;

            return (
              <div
                key={category.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(category.id, checked as boolean)
                    }
                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <label
                    htmlFor={`category-${category.id}`}
                    className="text-sm text-gray-700 cursor-pointer flex-1 text-right"
                  >
                    {category.name}
                  </label>
                </div>
                <span className="text-xs text-gray-500">
                  ({category.count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Turkish Brands Section - برندهای معروف ترکیه */}
      <div className="mb-8">
        <h3 className="font-bold text-green-800 mb-4 text-right">
          برندهای معروف ترکیه
        </h3>
        {/* <p className="text-xs text-gray-500 mb-4 text-right">
          برای انتخاب برند، روی checkbox کلیک کنید
        </p> */}

        {/* Turkish Brand Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="جستجوی برند ترکیه"
              value={turkishBrandSearch}
              onChange={(e) => setTurkishBrandSearch(e.target.value)}
              className="pl-10 text-right"
              dir="rtl"
            />
          </div>
        </div>

        {/* Show All Brands Button - when a brand is selected */}
        {selectedTurkishBrands.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => {
                setSelectedTurkishBrands([]);
                onFilterChange?.({
                  categories: selectedCategories,
                  turkishBrands: [],
                });
              }}
              className="w-full px-3 py-2 text-sm text-green-700 border border-green-400 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              نمایش همه برندها
            </button>
          </div>
        )}

        <div className="space-y-2">
          {filteredTurkishBrands.map((brand) => {
            const isSelected = selectedTurkishBrands.includes(brand.id);
            const hasAnySelected = selectedTurkishBrands.length > 0;

            // Show all brands if none selected, or only show the selected brand
            const shouldShow = !hasAnySelected || isSelected;

            if (!shouldShow) return null;

            return (
              <div
                key={brand.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id={`turkish-brand-${brand.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleTurkishBrandChange(brand.id, checked as boolean)
                    }
                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <label
                    htmlFor={`turkish-brand-${brand.id}`}
                    className="text-sm text-gray-700 cursor-pointer flex-1 text-right"
                  >
                    {brand.name}
                  </label>
                </div>
                <span className="text-xs text-gray-500">({brand.count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear Filters Button */}
      {(selectedCategories.length > 0 || selectedTurkishBrands.length > 0) && (
        <div className="mt-6">
          <button
            onClick={() => {
              setSelectedCategories([]);
              setSelectedTurkishBrands([]);
              onFilterChange?.({
                categories: [],
                turkishBrands: [],
              });
            }}
            className="w-full px-4 py-2 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
          >
            پاک کردن فیلترها
          </button>
        </div>
      )}
    </div>
  );
}
