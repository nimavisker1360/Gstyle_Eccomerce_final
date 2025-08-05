"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const beautyCategories = {
  "مراقبت از پوست": [
    "ست مراقبت پوستی",
    "محصولات ضد پیری",
    "محصولات پوستی",
    "محصولات آفتاب",
    "محصولات مراقبت از پوست",
  ],
  "عطر و بدن": ["عطر و ادکلن", "بادی اسپلش", "محصولات مراقبت از بدن"],
  "مراقبت از مو": ["محصولات مراقبت مو", "رنگ مو", "شانه و برس", "شامپو"],
  "سلامت و تغذیه": [
    "انواع ویتامین ها",
    "انواع مکملهای ورزشی",
    "انواع دمنوش و ماچا و قهوه",
  ],
};

export default function BeautyDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setIsOpen(false);
    }, 150); // 150ms تاخیر - حساسیت بالا
    setTimeoutId(id);
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Beauty Button */}
      <div className="header-button text-blue-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1">
        آرایش و زیبایی
        <ChevronDown className="w-4 h-4" />
      </div>

      {/* Dropdown Menu */}
      <div
        className={`absolute top-full left-0 mt-1 z-50 p-4 transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 visible transform translate-y-0 scale-100"
            : "opacity-0 invisible transform -translate-y-2 scale-95 pointer-events-none"
        }`}
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl w-[800px] p-4">
          <div className="grid grid-cols-4 gap-6">
            {Object.entries(beautyCategories).map(
              ([mainCategory, subCategories]) => (
                <div key={mainCategory} className="space-y-2">
                  <h3 className="font-bold text-base text-blue-700 border-b border-green-300 pb-1 mb-2">
                    {mainCategory}
                  </h3>
                  <div className="space-y-1">
                    {subCategories.map((item) => (
                      <Link
                        key={item}
                        href={`/beauty-search?q=${encodeURIComponent(item)}`}
                        className="text-green-700 font-bold hover:text-blue-700 text-xs py-1 px-2 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <span className="truncate">{item}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
