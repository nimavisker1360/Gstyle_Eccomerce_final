import { auth } from "@/auth";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOut } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";
import { ChevronDown, User } from "lucide-react";
import Link from "next/link";

export default async function UserButton() {
  const session = await auth();
  return (
    <div className="flex gap-2 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="header-button" asChild>
          <div className="flex items-center">
            {/* Mobile version - just icon */}
            <div className="md:hidden">
              <User className="h-6 w-6" />
            </div>

            {/* Desktop version - full text */}
            <div className="hidden md:flex flex-col text-xs text-right">
              <span>سلام {session ? session.user.name : "ورود"}</span>
              <span className="font-bold">حساب کاربری و سفارشات</span>
            </div>
            <ChevronDown className="hidden md:block mr-1" />
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
              <form action={SignOut} className="w-full">
                <Button
                  className="w-full py-4 px-2 h-4 justify-start"
                  variant="ghost"
                >
                  خروج
                </Button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        ) : (
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Link
                  className={cn(buttonVariants(), "w-full")}
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
