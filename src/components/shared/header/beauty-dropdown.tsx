"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const beautyCategories = {
  "مراقبت از پوست": [
    "محصولات مراقبت از پوست",
    "ست مراقبت پوستی",
    "محصولات ضد پیری",
    "محصولات آفتاب",
    "کرم مرطوب کننده",
    "سرم صورت",
    "پاک کننده پوست",
    "تونر و ماسک",
  ],
  "مراقبت از مو": [
    "شامپو",
    "نرم کننده مو",
    "ماسک مو",
    "سرم مو",
    "روغن مو",
    "رنگ مو",
    "محصولات حالت دهی",
    "شانه و برس",
  ],
  "عطر و بدن": [
    "عطر",
    "ادکلن",
    "لوسیون بدن",
    "محصولات ضد تعریق",
    "بادی اسپلش",
    "کرم دست و پا",
    "محصولات مراقبت از بدن",
    "دئودرانت",
  ],
  "سلامت و تغذیه": [
    "انواع ویتامین ها",
    "مکملهای ورزشی",
    "انواع دمنوش",
    "شربت و داروهای گیاهی",
    "محصولات تقویتی",
    "چای و قهوه",
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
        لوازم آرایشی و بهداشتی
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
                      <span
                        key={item}
                        className="text-green-700 font-bold hover:text-blue-700 text-xs py-1 px-2 rounded hover:bg-blue-50 transition-colors cursor-pointer block"
                      >
                        <span className="truncate">{item}</span>
                      </span>
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
