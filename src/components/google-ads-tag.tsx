import Script from "next/script";

/**
 * Google Ads global site tag (gtag.js). Public conversion ID — safe in the
 * client bundle. Override with `NEXT_PUBLIC_GOOGLE_ADS_ID` (empty disables).
 */
export const GOOGLE_ADS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-10864235093";

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
