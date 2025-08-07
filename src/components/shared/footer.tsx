"use client";

import { ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

// Category data structure similar to header dropdowns
const footerCategories = {
  "مد و پوشاک": {
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
  },
  "لوازم آرایشی و بهداشتی": {
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
  },
  "لوازم ورزشی": {
    "کفش ورزشی": [
      "کفش دویدن",
      "کفش بدنسازی",
      "کفش فوتبال",
      "کفش بسکتبال",
      "کفش تنیس",
      "کفش پیاده‌روی",
    ],
    "لباس ورزشی": [
      "تی‌شرت ورزشی",
      "شلوار ورزشی",
      "کت ورزشی",
      "لباس زیر ورزشی",
      "جوراب ورزشی",
      "کلاه ورزشی",
    ],
    "تجهیزات ورزشی": [
      "توپ فوتبال",
      "توپ بسکتبال",
      "توپ والیبال",
      "دمبل",
      "طناب",
      "تشک ورزشی",
    ],
  },
  الکترونیک: {
    "موبایل و تبلت": [
      "گوشی موبایل",
      "تبلت",
      "قاب موبایل",
      "شارژر",
      "کابل",
      "پاوربانک",
    ],
    "لپ‌تاپ و کامپیوتر": [
      "لپ‌تاپ",
      "کامپیوتر رومیزی",
      "ماوس",
      "کیبورد",
      "مانیتور",
      "هارد اکسترنال",
    ],
    "ساعت هوشمند": [
      "ساعت اپل",
      "ساعت سامسونگ",
      "ساعت شیائومی",
      "ساعت هوآوی",
      "ساعت کاسیو",
      "ساعت سیکو",
    ],
  },
  "حیوانات خانگی": {
    سگ: [
      "غذای سگ",
      "اسباب بازی سگ",
      "کولار و قلاده",
      "ظرف غذا",
      "تشک خواب",
      "شامپو سگ",
    ],
    گربه: [
      "غذای گربه",
      "اسباب بازی گربه",
      "سینی خاک",
      "ظرف غذا",
      "تشک خواب",
      "شامپو گربه",
    ],
    پرنده: [
      "غذای پرنده",
      "قفس پرنده",
      "اسباب بازی",
      "ظرف غذا",
      "آبخوری",
      "چوب نشیمن",
    ],
  },
  "ویتامین و دارو": {
    "ویتامین‌ها": [
      "ویتامین C",
      "ویتامین D",
      "ویتامین B",
      "ویتامین E",
      "ویتامین A",
      "کلسیم",
    ],
    "مکمل‌ها": ["پروتئین", "کراتین", "امگا 3", "زینک", "منیزیم", "آهن"],
    "داروهای گیاهی": [
      "شربت سرفه",
      "دمنوش آرامش",
      "چای سبز",
      "عسل طبیعی",
      "روغن زیتون",
      "سرکه سیب",
    ],
  },
};

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="w-full">
        <Button
          variant="ghost"
          className="bg-gray-800 w-full rounded-none"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp className="mr-2 h-4 w-4" />
          بازگشت به بالا
        </Button>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Main Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {Object.entries(footerCategories).map(
            ([mainCategory, subCategories]) => (
              <div
                key={mainCategory}
                className="space-y-4 border-b border-gray-700 pb-6"
              >
                <h3 className="text-lg font-extrabold text-white border-b border-gray-600 pb-2">
                  {mainCategory}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(subCategories).map(([subCategory, items]) => (
                    <div key={subCategory} className="space-y-1">
                      <h4 className="text-sm font-bold text-gray-200">
                        {subCategory}
                      </h4>
                      <div className="grid grid-cols-2 gap-1">
                        {items.map((item) => (
                          <span
                            key={item}
                            className="text-xs font-medium text-gray-300 hover:text-white transition-colors cursor-pointer block"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Logo */}
            <div className="flex items-center">
              <Image
                src="/icons/logo01.png"
                width={120}
                height={40}
                alt="Gstyle Logo"
                className="w-[100px] h-auto object-contain"
              />
            </div>

            {/* Social Media */}
            <div className="flex items-center space-x-8 space-x-reverse">
              <span className="text-sm text-gray-400">ما را دنبال کنید</span>
              <div className="flex space-x-8 space-x-reverse">
                {/* Instagram Icon */}
                <Link
                  href="https://instagram.com/gstyle_online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 hover:text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </Link>

                {/* Telegram Icon */}
                <Link
                  href="https://t.me/gstylechannel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <svg
                    className="w-5 h-5 text-gray-400 hover:text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Telegram Button */}
            <div className="flex items-center">
              <Link
                href="https://t.me/Gstyleplus_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 font-medium transition-colors rounded"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                </svg>
                <span>وصل شدن به بات تلگرام</span>
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              © ۲۰۲۳-۲۰۲۵ جی استایل - تمامی حقوق محفوظ است | طراحی و توسعه 
               در ایران
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
