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
      <div className="flex items-center gap-2 text-xs">
        <div className="relative">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 shadow-sm transition-colors">
            <ShoppingCartIcon className="h-5 w-5" />
          </div>
          {isMounted && (
            <span
              className={cn(
                `bg-green-600 text-white w-5 h-5 rounded-full text-[10px] font-bold absolute -top-1 -right-1 z-10 flex items-center justify-center shadow`,
                cartItemsCount >= 10 && "text-[10px]"
              )}
            >
              {cartItemsCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
