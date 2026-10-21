/* Lightweight, feature-detected polyfills for older Safari/iOS WebViews and
 * in-app browsers (Facebook, Instagram, TikTok…). Each one only runs when the
 * native API is missing, so modern Chrome behaviour is untouched. */
/* eslint-disable @typescript-eslint/no-explicit-any */
const AP = Array.prototype as any;
const SP = String.prototype as any;

function at(this: any, n: number) {
  n = Math.trunc(n) || 0;
  if (n < 0) n += this.length;
  return n < 0 || n >= this.length ? undefined : this[n];
}
if (!AP.at) Object.defineProperty(AP, "at", { value: at, writable: true, configurable: true });
if (!SP.at) Object.defineProperty(SP, "at", { value: at, writable: true, configurable: true });

if (!AP.findLast) {
  Object.defineProperty(AP, "findLast", {
    value(this: any[], fn: (v: any, i: number, a: any[]) => boolean, t?: any) {
      for (let i = this.length - 1; i >= 0; i--) if (fn.call(t, this[i], i, this)) return this[i];
      return undefined;
    }, writable: true, configurable: true,
  });
}
if (!AP.findLastIndex) {
  Object.defineProperty(AP, "findLastIndex", {
    value(this: any[], fn: (v: any, i: number, a: any[]) => boolean, t?: any) {
      for (let i = this.length - 1; i >= 0; i--) if (fn.call(t, this[i], i, this)) return i;
      return -1;
    }, writable: true, configurable: true,
  });
}
if (!SP.replaceAll) {
  Object.defineProperty(SP, "replaceAll", {
    value(this: string, search: any, replacement: any) {
      if (search instanceof RegExp) return this.replace(search, replacement);
      return this.split(String(search)).join(typeof replacement === "function" ? replacement(search) : replacement);
    }, writable: true, configurable: true,
  });
}
if (!(Object as any).hasOwn) {
  (Object as any).hasOwn = (o: object, k: PropertyKey) => Object.prototype.hasOwnProperty.call(o, k);
}
if (typeof (globalThis as any).structuredClone !== "function") {
  (globalThis as any).structuredClone = (v: unknown) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
}
if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID !== "function" && crypto.getRandomValues) {
  (crypto as any).randomUUID = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };
}

// Real viewport height for in-app browsers whose toolbars break 100vh.
if (typeof window !== "undefined") {
  const setVh = () => document.documentElement.style.setProperty("--app-vh", `${window.innerHeight * 0.01}px`);
  setVh();
  window.addEventListener("resize", setVh, { passive: true });
  window.addEventListener("orientationchange", setVh, { passive: true });
}

export {};
