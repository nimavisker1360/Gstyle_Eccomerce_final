"use client";
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import useCartStore from "@/hooks/use-cart-store";

// Keeps the user's cart in sync with the server while authenticated
export default function CartSync() {
  const { status } = useSession();
  const { cart, replaceCart } = useCartStore();
  const hasHydratedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastSyncedRef = useRef<string>("");

  // Load server cart once after login
  useEffect(() => {
    const load = async () => {
      if (status !== "authenticated") return;
      if (hasHydratedRef.current || isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        const json = await res.json();
        const server = json?.data ?? null;
        const serverItems = Array.isArray(server?.items) ? server.items : [];
        const localItems = Array.isArray(cart.items) ? cart.items : [];

        // Merge strategy on first login hydration:
        // - If both have items: merge by (product,color,size) summing quantities (capped by countInStock)
        // - If only local has items: keep local
        // - Otherwise: keep server
        const keyOf = (it: any) =>
          `${it.product}__${it.color ?? ""}__${it.size ?? ""}`;
        const mergedMap = new Map<string, any>();
        for (const it of serverItems) mergedMap.set(keyOf(it), { ...it });
        for (const it of localItems) {
          const k = keyOf(it);
          if (mergedMap.has(k)) {
            const ex = mergedMap.get(k);
            const sumQ = Math.min(
              (ex.quantity ?? 0) + (it.quantity ?? 0),
              ex.countInStock ?? it.countInStock ?? 999999
            );
            mergedMap.set(k, { ...ex, quantity: sumQ });
          } else {
            mergedMap.set(k, { ...it });
          }
        }
        const mergedItems =
          serverItems.length || localItems.length
            ? Array.from(mergedMap.values())
            : [];

        const normalized = {
          items: mergedItems,
          itemsPrice: server?.itemsPrice ?? 0,
          taxPrice: server?.taxPrice ?? undefined,
          shippingPrice: server?.shippingPrice ?? undefined,
          totalPrice: server?.totalPrice ?? 0,
          paymentMethod: server?.paymentMethod ?? undefined,
          shippingAddress: server?.shippingAddress ?? undefined,
          deliveryDateIndex: server?.deliveryDateIndex ?? undefined,
        };

        replaceCart(normalized);
        lastSyncedRef.current = JSON.stringify(normalized);

        // Persist merged cart immediately so it stays after logout/login
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        }).catch(() => {});
      } finally {
        hasHydratedRef.current = true;
        isFetchingRef.current = false;
      }
    };
    load();
  }, [status, replaceCart, cart.items]);

  // Persist cart on any change while logged in
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!hasHydratedRef.current) return;
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("skipCartSyncOnce")
    ) {
      sessionStorage.removeItem("skipCartSyncOnce");
      return;
    }
    const payload = JSON.stringify(cart);
    if (payload === lastSyncedRef.current) return;
    lastSyncedRef.current = payload;
    const controller = new AbortController();
    fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [cart, status]);

  return null;
}
