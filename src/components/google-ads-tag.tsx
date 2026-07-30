import Script from "next/script";

/**
 * Google Ads global site tag (gtag.js). Public conversion ID — safe in the
 * client bundle. Override with `NEXT_PUBLIC_GOOGLE_ADS_ID` (empty disables).
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-10864235093";

/** Subscribe conversion `send_to` from the Google Ads event snippet. */
export const GOOGLE_ADS_SUBSCRIBE_SEND_TO =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SUBSCRIBE_SEND_TO ??
  "AW-10864235093/_amCCOSh1ogcENWkvLwo";

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

/**
 * Fire the Google Ads "Subscribe" conversion once a plan is live.
 * No dedicated success URL — RevenueCat returns to /pricing; we emit here
 * when access flips on, matching the Ads event snippet.
 */
export function trackGoogleAdsSubscribeConversion(): void {
  if (typeof window === "undefined") return;
  const sendTo = GOOGLE_ADS_SUBSCRIBE_SEND_TO.trim();
  if (!sendTo || !GOOGLE_ADS_ID.trim()) return;

  const gtag = window.gtag;
  if (typeof gtag !== "function") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(["event", "conversion", { send_to: sendTo }]);
    return;
  }
  gtag("event", "conversion", { send_to: sendTo });
}
