import Image from "next/image";
import Link from "next/link";
import React from "react";
import GoogleOAuthDebug from "@/components/shared/google-oauth-debug";
import HeaderMonitorDashboard from "@/components/shared/header-monitor-dashboard";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="relative flex flex-col items-center min-h-screen highlight-link"
    >
      {/* Soft top gradient background */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-48 sm:h-64 bg-gradient-to-b from-sky-100 via-emerald-50 to-transparent -z-10 pointer-events-none"
      />
      <header className="mt-8">
        <Link href="/">
          <Image
            src="/icons/logo01.png"
            alt="Logo"
            width={120}
            height={40}
            priority
            style={{
              maxWidth: "100%",
              height: "auto",
            }}
          />
        </Link>
      </header>
      <main className="mx-auto max-w-sm min-w-80 p-4 text-right">
        {children}
      </main>

      {/* Debug components - only show in development */}
      <GoogleOAuthDebug />
      <HeaderMonitorDashboard />
    </div>
  );
}
