import { NextRequest, NextResponse } from "next/server";
import { cacheService } from "@/lib/services/cache-service";

// Category mapping for Persian translations
const categoryMapping: { [key: string]: string } = {
  fashion: "مد و لباس",
  beauty: "آرایشی و بهداشتی",
  electronics: "الکترونیک",
  sports: "ورزشی",
  pets: "حیوانات خانگی",
  vitamins: "ویتامین و مکمل",
  accessories: "لوازم جانبی",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const query = searchParams.get("query");

    if (!category || !query) {
      return NextResponse.json(
        { error: "Category and query parameters are required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Search request: ${query} in ${category}`);

    // استفاده از سرویس کش هوشمند
    const result = await cacheService.getProducts(query, category);

    // اضافه کردن ترجمه فارسی دسته‌بندی
    const response = {
      ...result,
      category_fa: categoryMapping[category] || category,
    };

    console.log(
      `✅ Search completed. Source: ${result.source}, Count: ${result.count}`
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ Error in Google Shopping API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
