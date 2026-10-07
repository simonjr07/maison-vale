"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CART_STORAGE_KEY,
  CART_VERSION,
  type CartPayload,
  getCartCount,
  normalizeCart,
  parseStoredCart,
} from "@/cart/cart-domain";

type CartContextValue = {
  cart: CartPayload;
  count: number;
  hydrated: boolean;
  replaceCart: (cart: CartPayload) => void;
  announce: (message: string) => void;
};

const EMPTY_CART: CartPayload = { version: CART_VERSION, items: [] };
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartPayload>(EMPTY_CART);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      setCart(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)));
      setHydrated(true);
    }, 0);

    function handleStorage(event: StorageEvent) {
      if (event.key === CART_STORAGE_KEY) {
        setCart(parseStoredCart(event.newValue));
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(hydrationTimer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(message), 0);
  }, []);

  const replaceCart = useCallback((nextCart: CartPayload) => {
    const normalized = normalizeCart(nextCart);
    if (!normalized) return;

    setCart(normalized);
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      announce("Your cart could not be saved in this browser.");
    }
  }, [announce]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      count: getCartCount(cart.items),
      hydrated,
      replaceCart,
      announce,
    }),
    [announce, cart, hydrated, replaceCart],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}
