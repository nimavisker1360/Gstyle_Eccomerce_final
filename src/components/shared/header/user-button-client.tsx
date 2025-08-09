"use client";

import { useSession, signOut } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import useCartStore from "@/hooks/use-cart-store";

export default function UserButtonClient() {
  const { data: session } = useSession();
  const { clearCart } = useCartStore();

  const handleSignOut = async () => {
    try {
      // Prevent CartSync from overwriting server cart with an empty cart during logout
      if (typeof window !== "undefined") {
        sessionStorage.setItem("skipCartSyncOnce", "true");
      }
      // Clear cart locally so badge shows 0 immediately and persisted store resets
      clearCart();
    } catch (e) {}
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex gap-2 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="header-button" asChild>
          <div className="flex items-center">
            <div className="flex flex-col text-xs text-left">
              <span>سلام، {session ? session.user.name : "ورود"}</span>
              <span className="font-bold">حساب کاربری و سفارشات</span>
            </div>
            <ChevronDown />
          </div>
        </DropdownMenuTrigger>
        {session ? (
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {session.user.name}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <Link className="w-full" href="/account">
                <DropdownMenuItem>حساب کاربری شما</DropdownMenuItem>
              </Link>
              <Link className="w-full" href="/account/orders">
                <DropdownMenuItem>سفارشات شما</DropdownMenuItem>
              </Link>

              {session.user.role === "Admin" && (
                <Link className="w-full" href="/admin/overview">
                  <DropdownMenuItem>مدیریت</DropdownMenuItem>
                </Link>
              )}
            </DropdownMenuGroup>
            <DropdownMenuItem className="p-0 mb-1">
              <Button
                className="w-full py-4 px-2 h-4 justify-start"
                variant="ghost"
                onClick={handleSignOut}
              >
                خروج
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link
                  className={cn(
                    buttonVariants(),
                    "w-full bg-green-600 hover:bg-green-700 text-white"
                  )}
                  href="/sign-in"
                >
                  ورود
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="font-normal">
                مشتری جدید؟ <Link href="/sign-up">ثبت نام</Link>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    </div>
  );
}
