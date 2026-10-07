"use client";

import { useEffect } from "react";

import { CART_VERSION } from "@/cart/cart-domain";
import { useCart } from "@/components/cart/cart-provider";

export function ClearVerifiedCart() {
  const { announce, replaceCart } = useCart();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      replaceCart({ version: CART_VERSION, items: [] });
      announce("Your paid order is confirmed. The cart has been cleared.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [announce, replaceCart]);

  return null;
}

