"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface OAuthDebugInfo {
  cookies: Array<{ name: string; size: number; value?: string }>;
  headerSize: number;
  errors: string[];
  recommendations: string[];
}

export default function GoogleOAuthDebug() {
  const [debugInfo, setDebugInfo] = useState<OAuthDebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const analyzeOAuthState = () => {
    try {
      const cookies = document.cookie.split(";").map((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        const value = valueParts.join("=");
        return {
          name,
          size: new TextEncoder().encode(cookie).length,
          value: value.substring(0, 50) + (value.length > 50 ? "..." : ""),
        };
      });

      // فیلتر کردن cookies مربوط به NextAuth
      const authCookies = cookies.filter(
        (cookie) =>
          cookie.name.includes("next-auth") ||
          cookie.name.includes("__Host-next-auth")
      );

      const totalHeaderSize = cookies.reduce(
        (sum, cookie) => sum + cookie.size,
        0
      );

      const errors: string[] = [];
      const recommendations: string[] = [];

      // بررسی اندازه cookies
      if (totalHeaderSize > 4096) {
        errors.push(
          `Total cookie size (${totalHeaderSize} bytes) exceeds browser limit (4KB)`
        );
      }

      authCookies.forEach((cookie) => {
        if (cookie.size > 1024) {
          recommendations.push(
            `${cookie.name} is large (${cookie.size} bytes)`
          );
        }
      });

      // بررسی وجود cookies ضروری برای Google OAuth
      const requiredCookies = ["csrf-token", "state"];
      requiredCookies.forEach((required) => {
        const found = authCookies.some((cookie) =>
          cookie.name.includes(required)
        );
        if (!found) {
          errors.push(`Missing required cookie: ${required}`);
        }
      });

      setDebugInfo({
        cookies: authCookies,
        headerSize: totalHeaderSize,
        errors,
        recommendations,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error analyzing OAuth state:", error);
    }
  };

  const clearAuthCookies = () => {
    const authCookieNames = [
      "next-auth.session-token",
      "next-auth.csrf-token",
      "next-auth.callback-url",
      "next-auth.state",
      "next-auth.pkce.code_verifier",
      "next-auth.nonce",
      "__Host-next-auth.session-token",
      "__Host-next-auth.csrf-token",
      "__Host-next-auth.callback-url",
      "__Host-next-auth.state",
      "__Host-next-auth.pkce.code_verifier",
      "__Host-next-auth.nonce",
    ];

    authCookieNames.forEach((name) => {
      // حذف cookie با تنظیم تاریخ انقضاء در گذشته
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    // تحلیل مجدد پس از پاک کردن
    setTimeout(analyzeOAuthState, 100);
  };

  useEffect(() => {
    if (isVisible) {
      analyzeOAuthState();
    }
  }, [isVisible]);

  // فقط در development mode نمایش داده شود
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 right-4 bg-green-500 text-white px-3 py-1 rounded text-xs z-50"
        style={{ fontFamily: "monospace" }}
      >
        🔐 OAuth Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 bg-white border border-gray-300 rounded p-4 text-xs shadow-lg z-50 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Google OAuth Debug 🔐</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-500 hover:text-red-700"
        >
          ✕
        </button>
      </div>

      {debugInfo ? (
        <>
          {/* Header Size Status */}
          <div className="mb-3">
            <div className="font-semibold">Cookie Header Size:</div>
            <div
              className={
                debugInfo.headerSize > 4096 ? "text-red-600" : "text-green-600"
              }
            >
              {debugInfo.headerSize} bytes / 4KB
            </div>
          </div>

          {/* Auth Cookies */}
          <div className="mb-3">
            <div className="font-semibold">
              NextAuth Cookies ({debugInfo.cookies.length}):
            </div>
            {debugInfo.cookies.length === 0 ? (
              <div className="text-gray-500 text-xs">No auth cookies found</div>
            ) : (
              debugInfo.cookies.map((cookie, index) => (
                <div key={index} className="ml-2 text-xs">
                  <div className="font-mono">{cookie.name}</div>
                  <div className="text-gray-600">Size: {cookie.size}b</div>
                  <div className="text-gray-500 break-all">{cookie.value}</div>
                </div>
              ))
            )}
          </div>

          {/* Errors */}
          {debugInfo.errors.length > 0 && (
            <div className="mb-3">
              <div className="font-semibold text-red-600">Errors:</div>
              {debugInfo.errors.map((error, index) => (
                <div key={index} className="text-red-500 text-xs">
                  ❌ {error}
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {debugInfo.recommendations.length > 0 && (
            <div className="mb-3">
              <div className="font-semibold text-orange-500">
                Recommendations:
              </div>
              {debugInfo.recommendations.map((rec, index) => (
                <div key={index} className="text-orange-500 text-xs">
                  💡 {rec}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              onClick={analyzeOAuthState}
              className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
              size="sm"
            >
              🔄 Refresh Analysis
            </Button>

            <Button
              onClick={clearAuthCookies}
              className="w-full bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
              size="sm"
            >
              🧹 Clear Auth Cookies
            </Button>

            <Button
              onClick={() => (window.location.href = "/api/auth/signin/google")}
              className="w-full bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
              size="sm"
            >
              🔑 Test Google Sign-In
            </Button>
          </div>

          {/* Environment Info */}
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>
              Secure: {window.location.protocol === "https:" ? "Yes" : "No"}
            </div>
            <div>Domain: {window.location.hostname}</div>
          </div>
        </>
      ) : (
        <div>Loading debug info...</div>
      )}
    </div>
  );
}
