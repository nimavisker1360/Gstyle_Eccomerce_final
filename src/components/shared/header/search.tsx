"use client";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { FormEvent, useRef } from "react";

export default function Search() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const searchQuery = inputRef.current?.value.trim();

    // اگر فیلد جستجو خالی است، هیچ عملیاتی انجام نده
    if (!searchQuery) {
      return;
    }

    // هدایت به صفحه جستجو
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-stretch h-12 w-full">
      <Input
        ref={inputRef}
        className="flex-1 rounded-l-lg rounded-r-none border-gray-300 bg-gray-100 text-gray-800 text-opacity-40 placeholder-opacity-30 text-base h-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-right"
        placeholder="هزاران محصول  را جستجو کنید"
        name="q"
        type="search"
      />
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white rounded-r-lg rounded-l-none h-full px-6 py-2 transition-colors"
      >
        <SearchIcon className="w-5 h-5" />
      </button>
    </form>
  );
}
