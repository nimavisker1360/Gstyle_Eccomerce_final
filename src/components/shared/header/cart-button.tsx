"use client";

import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import useIsMounted from "@/hooks/use-is-mounted";
import { cn } from "@/lib/utils";
import useCartStore from "@/hooks/use-cart-store";

export default function CartButton() {
  const isMounted = useIsMounted();
  const {
    cart: { items },
  } = useCartStore();
  const cartItemsCount = items.reduce((a, c) => a + c.quantity, 0);
  return (
    <Link href="/cart" className="px-1 header-button">
      <div className="flex items-end text-xs relative">
        <ShoppingCartIcon className="h-6 w-6 md:h-8 md:w-8" />

        {isMounted && (
          <span
            className={cn(
              `bg-green-500 w-4 h-4 md:w-5 md:h-5 rounded-full text-white text-xs font-bold absolute right-[20px] md:right-[30px] top-[-2px] md:top-[-4px] z-10 flex items-center justify-center`,
              cartItemsCount >= 10 && "text-xs"
            )}
          >
            {cartItemsCount}
          </span>
        )}
        <span className="font-bold hidden md:block text-right">سبد خرید</span>
      </div>
    </Link>
  );
}
