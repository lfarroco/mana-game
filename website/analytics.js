/**
 * Mana Battle landing page — Google Ads conversion tracking.
 *
 * The Google tag itself (AW-18514302845) is loaded in index.html. This file
 * reports the click that matters: leaving for the Steam store, i.e. the
 * "Wishlist on Steam" conversion.
 *
 * Nothing here runs if the Google tag is blocked; the links keep working.
 */
(() => {
  const ADS_ID = "AW-18514302845";

  // Conversion label from Google Ads:
  // Tools > Conversions > "Wishlist on Steam" > Tag setup.
  // It looks like "AbC-D_efG-h12_34-567". While this is empty no conversion is
  // sent, only the dataLayer event below.
  const CONVERSION_LABEL = "";

  let warnedAboutLabel = false;

  document.querySelectorAll("[data-cta]").forEach((link) => {
    link.addEventListener("click", () => {
      const cta = link.dataset.cta;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: `${cta}_click` });

      if (cta !== "wishlist" || typeof window.gtag !== "function") return;

      if (!CONVERSION_LABEL) {
        if (!warnedAboutLabel) {
          warnedAboutLabel = true;
          console.warn(
            "[ads] Set CONVERSION_LABEL in analytics.js to count wishlist clicks.",
          );
        }
        return;
      }

      window.gtag("event", "conversion", {
        send_to: `${ADS_ID}/${CONVERSION_LABEL}`,
        transport_type: "beacon",
      });
    });
  });
})();
