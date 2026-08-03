import Script from "next/script";

/**
 * Google Ads global site tag (gtag.js). Public conversion ID — safe in the
 * client bundle. Override with `NEXT_PUBLIC_GOOGLE_ADS_ID` (empty disables).
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-869374788";

/** Subscribe conversion `send_to` from the Google Ads event snippet. */
export const GOOGLE_ADS_SUBSCRIBE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_SEND_TO ??
  "AW-869374788/_amCC0Sh1ogcENWkvLwo";

/** Purchase conversion `send_to` from the Google Ads event snippet. */
export const GOOGLE_ADS_PURCHASE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_SEND_TO ??
  "AW-869374788/FWLSC0eh1ogcENWkvLwo";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Base tag for remarketing + conversion linking. Load once in the root layout. */
export function GoogleAdsTag() {
  const id = GOOGLE_ADS_ID.trim();
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-gtag" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');
        `.trim()}
      </Script>
    </>
  );
}

type ConversionPayload = {
  send_to: string;
  value?: number;
  currency?: string;
};

function fireConversion(payload: ConversionPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.send_to || !GOOGLE_ADS_ID.trim()) return;

  const gtag = window.gtag;
  if (typeof gtag !== "function") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["event", "conversion", payload]);
    return;
  }
  gtag("event", "conversion", payload);
}

/**
 * Fire the Google Ads "Subscribe" conversion once a plan is live.
 * No dedicated success URL — RevenueCat returns to /pricing; we emit here
 * when access flips on, matching the Ads event snippet.
 */
export function trackGoogleAdsSubscribeConversion(): void {
  fireConversion({ send_to: GOOGLE_ADS_SUBSCRIBE_SEND_TO.trim() });
}

/**
 * Fire the Google Ads "Purchase" conversion for one-time checkouts
 * (token top-ups, marketplace). Pass the paid amount when known.
 */
export function trackGoogleAdsPurchaseConversion(opts?: {
  value?: number;
  currency?: string;
}): void {
  fireConversion({
    send_to: GOOGLE_ADS_PURCHASE_SEND_TO.trim(),
    value: opts?.value ?? 1.0,
    currency: opts?.currency ?? "USD",
  });
}
