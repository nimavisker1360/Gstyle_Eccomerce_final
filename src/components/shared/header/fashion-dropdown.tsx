"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";

const fashionCategories = {
  زنانه: [
    "پیراهن",
    "تاپ و بادی",
    "شلوار جین",
    "شومیز",
    "تی شرت",
    "شلوارک و اسکورت",
    "دامن",
    "ست",
    "ژاکت و پلیور",
    "بافت",
    "ژیله",
    "سویشرت",
    "کت و جکت",
    "کفش",
    "کیف",
    "مایو",
    "اکسسوری",
    "لباس زیر",
    "پیژاما",
  ],
  مردانه: [
    "شلوارک",
    "شلوار",
    "پیراهن",
    "تی شرت",
    "پولوشرت",
    "جین",
    "ست",
    "کت و شلوار",
    "پلیور",
    "مایو",
    "هودی و سویشرت",
    "لین",
    "بلیزر",
    "پالتو",
    "کاپشن و بارانی",
    "کفش",
    "کیف",
    "اکسسوری",
  ],
  "بچه گانه": [
    "دختر 1.5 تا 6 سال",
    "دختر 6 تا 14 سال",
    "پسر 1.5 تا 6 سال",
    "پسر 6 تا 14 سال",
    "نوزاد 0 تا 18 ماه",
    "اسباب بازی",
  ],
};

export default function FashionDropdown() {
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
      {/* Main Fashion Button */}
      <div className="header-button text-blue-700 hover:text-green-600 font-medium transition-colors flex items-center gap-1">
        مد و پوشاک
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
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl w-[900px] p-4">
          <div className="grid grid-cols-3 gap-6">
            {Object.entries(fashionCategories).map(
              ([mainCategory, subCategories]) => (
                <div key={mainCategory} className="space-y-2">
                  <h3 className="font-bold text-base text-blue-700 border-b border-green-300 pb-1 mb-2">
                    {mainCategory}
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {subCategories.map((item) => (
                      <Link
                        key={item}
                        href={`/fashion-search?q=${encodeURIComponent(item)}`}
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
