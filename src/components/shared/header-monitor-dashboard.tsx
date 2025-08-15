"use client";

import React, { useState, useEffect } from "react";
import { getLocalStorageSize } from "@/lib/client-header-utils";

interface HeaderStats {
  localStorage: {
    totalSize: number;
    itemSizes: Array<{ key: string; size: number }>;
    warnings: string[];
  };
  sessionSize: number;
  cookieSize: number;
}

export default function HeaderMonitorDashboard() {
  const [stats, setStats] = useState<HeaderStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const collectStats = () => {
    try {
      const localStorage = getLocalStorageSize();

      // محاسبه اندازه session storage
      let sessionSize = 0;
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            const value = sessionStorage.getItem(key) || "";
            sessionSize += new TextEncoder().encode(key + value).length;
          }
        }
      } catch (e) {
        // Session storage may not be available
      }

      // محاسبه اندازه cookies
      const cookieSize = new TextEncoder().encode(document.cookie).length;

      setStats({
        localStorage,
        sessionSize,
        cookieSize,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error collecting stats:", error);
    }
  };

  useEffect(() => {
    collectStats();
    const interval = setInterval(collectStats, 30000); // هر 30 ثانیه
    return () => clearInterval(interval);
  }, []);

  // فقط در development mode نمایش داده شود
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded text-xs z-50"
        style={{ fontFamily: "monospace" }}
      >
        📊 Header Monitor
      </button>
    );
  }

  if (!stats) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded p-4 text-xs shadow-lg z-50">
        <div>Loading stats...</div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-500 float-right"
        >
          ✕
        </button>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getColorForSize = (size: number, limit: number) => {
    const percentage = (size / limit) * 100;
    if (percentage > 90) return "text-red-600";
    if (percentage > 70) return "text-orange-500";
    return "text-green-600";
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded p-4 text-xs shadow-lg z-50 max-w-sm max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Header Monitor 📊</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-500 hover:text-red-700"
        >
          ✕
        </button>
      </div>

      {/* Cookie Size */}
      <div className="mb-3">
        <div className="font-semibold">Cookies:</div>
        <div className={getColorForSize(stats.cookieSize, 4096)}>
          {formatBytes(stats.cookieSize)} / 4KB
        </div>
        {stats.cookieSize > 3200 && (
          <div className="text-orange-500 text-xs">
            ⚠️ Cookie size approaching limit
          </div>
        )}
      </div>

      {/* LocalStorage */}
      <div className="mb-3">
        <div className="font-semibold">LocalStorage:</div>
        <div
          className={getColorForSize(
            stats.localStorage.totalSize,
            5 * 1024 * 1024
          )}
        >
          {formatBytes(stats.localStorage.totalSize)} / 5MB
        </div>

        {stats.localStorage.itemSizes.length > 0 && (
          <div className="mt-1">
            <div className="text-gray-600">Top items:</div>
            {stats.localStorage.itemSizes.slice(0, 3).map((item, index) => (
              <div key={index} className="ml-2 text-xs">
                {item.key}: {formatBytes(item.size)}
              </div>
            ))}
          </div>
        )}

        {stats.localStorage.warnings.length > 0 && (
          <div className="mt-1">
            {stats.localStorage.warnings.map((warning, index) => (
              <div key={index} className="text-orange-500 text-xs">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SessionStorage */}
      <div className="mb-3">
        <div className="font-semibold">SessionStorage:</div>
        <div className={getColorForSize(stats.sessionSize, 5 * 1024 * 1024)}>
          {formatBytes(stats.sessionSize)} / 5MB
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={collectStats}
        className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
      >
        🔄 Refresh
      </button>

      {/* Clear Storage Buttons */}
      <div className="mt-2 space-x-1">
        <button
          onClick={() => {
            localStorage.clear();
            collectStats();
          }}
          className="bg-orange-500 text-white px-2 py-1 rounded text-xs hover:bg-orange-600"
        >
          Clear LS
        </button>
        <button
          onClick={() => {
            sessionStorage.clear();
            collectStats();
          }}
          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
        >
          Clear SS
        </button>
      </div>
    </div>
  );
}
