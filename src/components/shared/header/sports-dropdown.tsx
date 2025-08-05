"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const sportsCategories = {
  "کفش ورزشی": [
    "کفش دویدن",
    "کفش پیاده‌روی", 
    "کفش بسکتبال",
    "کفش فوتبال",
    "کفش تنیس",
    "کفش ورزشی زنانه",
    "کفش ورزشی مردانه",
  ],
  "لباس ورزشی": [
    "تیشرت ورزشی",
    "شلوار ورزشی",
    "لباس فیتنس",
    "لباس یوگا",
    "لباس دویدن",
    "لباس ورزشی زنانه",
    "لباس ورزشی مردانه",
  ],
  "لوازم ورزشی": [
    "ساک ورزشی",
    "قمقمه ورزشی",
    "ترموس ورزشی",
    "دستکش ورزشی",
    "تاپ ورزشی",
    "ساعت ورزشی",
    "ماشین تناسب اندام",
  ]
};

export default function SportsDropdown() {
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
      {/* Main Sports Button */}
      <div className="header-button text-blue-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1">
        لوازم ورزشی
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl w-[400px] p-4">
          <div className="space-y-2">
            {Object.entries(sportsCategories).map(
              ([mainCategory, subCategories]) => (
                <div key={mainCategory} className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-800 border-b pb-1">{mainCategory}</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {subCategories.map((item) => (
                      <Link
                        key={item}
                        href={`/sports-search?q=${encodeURIComponent(item)}`}
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
