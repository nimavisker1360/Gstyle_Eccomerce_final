import { APP_NAME } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import Menu from "./menu";

import data from "@/lib/data";
import Search from "./search";
import CartButton from "./cart-button";
import UserButton from "./user-button";
import FashionDropdown from "./fashion-dropdown";
import BeautyDropdown from "./beauty-dropdown";
import SportsDropdown from "./sports-dropdown";
import ElectronicsDropdown from "./electronics-dropdown";
import PetsDropdown from "./pets-dropdown";
import VitaminDropdown from "./vitamin-dropdown";
import MobileCategoriesMenu from "./mobile-categories-menu";

export default function Header() {
  return (
    <header className="bg-white text-gray-800 safe-area-inset-top">
      {/* Top Row - Main Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo - Left side */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center header-button font-extrabold text-2xl"
            >
              <Image
                src="/icons/logo01.png"
                width={120}
                height={40}
                alt="Logo"
                className="w-[100px] h-auto sm:w-[120px] object-contain"
                priority
              />
            </Link>
          </div>

          {/* Search Bar - Centered on desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <Search />
          </div>

          {/* Right Side Icons - Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <UserButton />
            <CartButton />
          </div>

          {/* Mobile Right Side - Cart and User */}
          <div className="md:hidden flex items-center gap-3">
            <CartButton />
            <UserButton />
          </div>
        </div>

        {/* Mobile Search - Below logo */}
        <div className="md:hidden flex items-center gap-3 py-3">
          <MobileCategoriesMenu />
          <div className="flex-1">
            <Search />
          </div>
        </div>
      </div>

      {/* Category Navigation Row */}
      <div className="bg-gray-50 px-4 sm:px-6 py-2 sm:py-3">
        <div className="flex items-center justify-center space-x-6 sm:space-x-8 text-sm max-w-7xl mx-auto">
          <div className="hidden md:flex items-center space-x-8 text-sm">
            {data.headerMenus.map((menu) =>
              menu.name === "مد و پوشاک" ? (
                <FashionDropdown key={menu.href} />
              ) : menu.name === "آرایش و زیبایی" ? (
                <BeautyDropdown key={menu.href} />
              ) : menu.name === "لوازم ورزشی" ? (
                <SportsDropdown key={menu.href} />
              ) : menu.name === "الکترونیک" ? (
                <ElectronicsDropdown key={menu.href} />
              ) : menu.name === "حیوانات خانگی" ? (
                <PetsDropdown key={menu.href} />
              ) : menu.name === "ویتامین و دارو" ? (
                <VitaminDropdown key={menu.href} />
              ) : (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="header-button text-blue-700 hover:text-green-600 font-medium transition-colors"
                >
                  {menu.name}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
