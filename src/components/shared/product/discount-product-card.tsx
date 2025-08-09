"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Star, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import useCartStore from "@/hooks/use-cart-store";
import {
  generateId,
  round2,
  convertTRYToToman,
  formatToman,
} from "@/lib/utils";

interface ShoppingProduct {
  id: string;
  title: string;
  originalTitle?: string;
  price: number;
  originalPrice?: number | null;
  currency: string;
  image: string;
  description: string;
  originalDescription?: string;
  link?: string;
  googleShoppingLink?: string;
  source: string;
  rating: number;
  reviews: number;
  delivery: string;
}

interface DiscountProductCardProps {
  product: ShoppingProduct;
}

const DiscountProductCard = ({ product }: DiscountProductCardProps) => {
  const { toast } = useToast();
  const { addItem } = useCartStore();
  const [isAddedToCart, setIsAddedToCart] = useState(false);

  // Base price in Toman (from TRY input)
  const originalPriceToman = convertTRYToToman(product.price);
  const discountAmountToman = 100000; // fixed 100,000 Toman off
  const discountedPriceToman = Math.max(
    0,
    originalPriceToman - discountAmountToman
  );
  const discountPercent =
    originalPriceToman > 0
      ? Math.round((discountAmountToman / originalPriceToman) * 100)
      : 0;

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const roundedRating = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3 h-3 ${
            i <= roundedRating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      );
    }
    return stars;
  };

  const priceInTRY = product.price;

  const handleAddToCart = () => {
    try {
      const cartItem = {
        clientId: generateId(),
        product: product.id,
        size: "متوسط", // Default size
        color: "مشکی", // Default color
        countInStock: 10, // Default stock
        name: product.title,
        slug: product.id,
        category: "تخفیف‌دار",
        price: round2(priceInTRY),
        quantity: 1,
        image: product.image,
      };

      addItem(cartItem, 1);
      setIsAddedToCart(true);
      toast({
        description: "به سبد خرید اضافه شد",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message,
      });
    }
  };

  return (
    <Card className="w-full max-w-[280px] hover:shadow-lg transition-shadow duration-200 bg-white">
      <CardContent className="p-4">
        {/* Product Image with Discount Badge */}
        <div className="relative mb-3">
          <div className="relative w-full h-48 bg-gray-50 rounded-lg overflow-hidden">
            <Image
              src={product.image || "/images/placeholder.jpg"}
              alt={product.title}
              fill
              className="object-contain hover:scale-105 transition-transform duration-200"
              sizes="280px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/placeholder.jpg";
              }}
            />
          </div>

          {/* Circular Discount Badge */}
          <div className="absolute top-2 left-2 bg-red-500 text-white w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
            {discountPercent}%
          </div>

          {/* Add to Cart Button */}
          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white p-2 h-8 w-8 rounded-full"
              onClick={handleAddToCart}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Source/Store Name */}
        <div className="mb-1">
          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
            {product.source}
          </span>
        </div>

        {/* Product Title */}
        <div className="mb-2">
          <div
            className="text-sm font-medium text-gray-800 line-clamp-2 text-right min-h-[2.5rem]"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
            title={product.title}
          >
            {product.title}
          </div>
        </div>

        {/* Rating and Reviews */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {renderStars(product.rating)}
          </div>
          <span className="text-xs text-gray-500">({product.reviews})</span>
        </div>

        {/* Prices */}
        <div className="space-y-1 text-right">
          {/* Original price with strikethrough - bigger and black */}
          <div className="text-base text-black line-through">
            {formatToman(originalPriceToman)}
          </div>
          {/* New discounted price (100 Toman off) */}
          <div className="text-sm font-bold text-green-600">
            {formatToman(discountedPriceToman)}
          </div>

          {/* Delivery Info */}
          {product.delivery && (
            <div className="text-xs text-gray-500">{product.delivery}</div>
          )}
        </div>

        {/* Action Button - Hide when added to cart */}
        {!isAddedToCart && (
          <div className="mt-3">
            {product.googleShoppingLink ? (
              <Button
                className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white"
                asChild
              >
                <Link
                  href={product.googleShoppingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  مشاهده در فروشگاه
                  {/* <ExternalLink className="w-3 h-3 mr-1" /> */}
                </Link>
              </Button>
            ) : (
              <Button className="w-full text-sm" disabled>
                نا موجود
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscountProductCard;
