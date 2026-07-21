// Simple client-side state for the prototype (no backend).
import { useEffect, useState } from "react";

export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  image: string;
  gallery: string[];
  specs: { label: string; value: string }[];
  category: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "aura-buds",
    name: "Aura Wireless Buds",
    tagline: "Studio sound. All day.",
    description:
      "Immersive spatial audio with adaptive noise cancellation, 32-hour battery life and a feather-light shell crafted for all-day comfort.",
    price: 8499,
    image:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: [
      { label: "Battery", value: "32 hrs with case" },
      { label: "Bluetooth", value: "5.3 LE Audio" },
      { label: "Water rating", value: "IPX5" },
      { label: "Weight", value: "4.6 g / bud" },
    ],
    category: "Audio",
  },
  {
    id: "verde-watch",
    name: "Verde Smart Watch",
    tagline: "Your wellness, refined.",
    description:
      "A sculpted titanium smartwatch with medical-grade heart tracking, sleep intelligence and a vibrant always-on AMOLED display.",
    price: 15990,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: [
      { label: "Display", value: "1.4\" AMOLED" },
      { label: "Battery", value: "10 days" },
      { label: "Sensors", value: "HR · SpO₂ · ECG" },
      { label: "Material", value: "Grade-5 Titanium" },
    ],
    category: "Wearables",
  },
  {
    id: "lumen-speaker",
    name: "Lumen Portable Speaker",
    tagline: "Big room energy.",
    description:
      "Room-filling 360° sound with deep bass, weatherproof build and a glowing ambient light that syncs with the beat.",
    price: 5299,
    image:
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1589003077984-894e133dabab?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: [
      { label: "Sound", value: "360° · 40 W" },
      { label: "Battery", value: "24 hrs" },
      { label: "Water rating", value: "IP67" },
      { label: "Weight", value: "820 g" },
    ],
    category: "Audio",
  },
];

export function getProduct(id: string) {
  return PRODUCTS.find((p) => p.id === id);
}

export const KSH = (n: number) =>
  "KSh " + n.toLocaleString("en-KE", { maximumFractionDigits: 0 });

// ---------- Store ----------
type CartItem = { id: string; qty: number };
type Order = {
  id: string;
  date: string;
  status: "Processing" | "Shipped" | "Delivered";
  items: CartItem[];
  total: number;
};

type AppState = {
  onboarded: boolean;
  authed: boolean;
  cart: CartItem[];
  favorites: string[];
  orders: Order[];
  user: { name: string; email: string; phone: string };
  points: number;
  referrals: number;
};

const KEY = "verde_shop_state_v1";

const defaultState: AppState = {
  onboarded: false,
  authed: false,
  cart: [],
  favorites: [],
  orders: [
    {
      id: "VRD-10284",
      date: "12 Jul 2026",
      status: "Delivered",
      items: [{ id: "aura-buds", qty: 1 }],
      total: 8499,
    },
    {
      id: "VRD-10312",
      date: "18 Jul 2026",
      status: "Shipped",
      items: [{ id: "lumen-speaker", qty: 1 }],
      total: 5299,
    },
  ],
  user: { name: "Amina Njeri", email: "amina@verde.app", phone: "+254 712 000 000" },
  points: 1240,
  referrals: 3,
};

const listeners = new Set<() => void>();
let state: AppState = defaultState;
let hydrated = false;

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaultState, ...JSON.parse(raw) };
  } catch {}
  hydrated = true;
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function set(next: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const patch = typeof next === "function" ? next(state) : next;
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

export function useAppState() {
  const [, force] = useState(0);
  useEffect(() => {
    if (!hydrated) {
      loadFromStorage();
      force((n) => n + 1);
    }
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return {
    state,
    hydrated,
    setOnboarded: (v: boolean) => set({ onboarded: v }),
    login: () => set({ authed: true }),
    logout: () => set({ authed: false }),
    addToCart: (id: string, qty = 1) =>
      set((s) => {
        const existing = s.cart.find((c) => c.id === id);
        const cart = existing
          ? s.cart.map((c) => (c.id === id ? { ...c, qty: c.qty + qty } : c))
          : [...s.cart, { id, qty }];
        return { cart };
      }),
    updateQty: (id: string, qty: number) =>
      set((s) => ({
        cart: s.cart
          .map((c) => (c.id === id ? { ...c, qty } : c))
          .filter((c) => c.qty > 0),
      })),
    removeFromCart: (id: string) =>
      set((s) => ({ cart: s.cart.filter((c) => c.id !== id) })),
    clearCart: () => set({ cart: [] }),
    toggleFavorite: (id: string) =>
      set((s) => ({
        favorites: s.favorites.includes(id)
          ? s.favorites.filter((f) => f !== id)
          : [...s.favorites, id],
      })),
    placeOrder: () =>
      set((s) => {
        if (s.cart.length === 0) return {};
        const total = s.cart.reduce((sum, item) => {
          const p = getProduct(item.id);
          return sum + (p?.price ?? 0) * item.qty;
        }, 200);
        const order: Order = {
          id: "VRD-" + Math.floor(10000 + Math.random() * 89999),
          date: new Date().toLocaleDateString("en-KE", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          status: "Processing",
          items: s.cart,
          total,
        };
        return {
          cart: [],
          orders: [order, ...s.orders],
          points: s.points + Math.floor(total / 100),
        };
      }),
  };
}
