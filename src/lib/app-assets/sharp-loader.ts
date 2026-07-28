type SharpDefault = typeof import("sharp")["default"];

let sharpModule: Promise<SharpDefault> | undefined;

/** Lazy-load sharp so Next build does not dlopen native libs during page collection. */
export function loadSharp(): Promise<SharpDefault> {
  if (!sharpModule) {
    sharpModule = import("sharp").then((mod) => mod.default);
  }
  return sharpModule;
}
