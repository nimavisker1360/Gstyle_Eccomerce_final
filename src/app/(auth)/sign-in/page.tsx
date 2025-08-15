import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SeparatorWithOr from "@/components/shared/separator-or";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import CredentialsSignInForm from "./credentials-signin-form";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignIn(props: {
  searchParams: Promise<{
    callbackUrl: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  const { callbackUrl = "/" } = searchParams;

  const session = await auth();
  if (session) {
    return redirect(callbackUrl);
  }

  return (
    <div className="w-full" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center title-black">
            ورود به حساب
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-right">
            <CredentialsSignInForm />
          </div>

          {/* Google sign-in removed */}
          <SeparatorWithOr />
          <div className="mt-2">
            <Link
              className="hover:!no-underline no-underline"
              href={`/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            >
              <Button
                className="w-full flex items-center justify-center gap-2 text-sky-700 border-sky-300"
                variant="outline"
              >
                <span>ساخت حساب کاربری </span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
