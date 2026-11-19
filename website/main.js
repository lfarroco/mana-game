/**
 * Mana Battle landing page — tiny progressive enhancements.
 * No dependencies, no analytics, no build step.
 */
(() => {
  const dialog = document.getElementById("lightbox");
  const dialogImage = document.getElementById("lightbox-img");
  const dialogCaption = document.getElementById("lightbox-caption");
  const closeButton = dialog?.querySelector(".lightbox-close");

  if (dialog && dialogImage && dialogCaption && closeButton) {
    const close = () => dialog.close();

    closeButton.addEventListener("click", close);

    // Clicking the dimmed backdrop (not the image itself) closes the viewer.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });

    document.querySelectorAll(".shot").forEach((shot) => {
      shot.setAttribute("aria-haspopup", "dialog");

      shot.addEventListener("click", () => {
        const full = shot.getAttribute("data-full");
        const caption = shot.getAttribute("data-caption") || "";
        const thumbnail = shot.querySelector("img");

        if (!full) return;

        dialogImage.src = full;
        dialogImage.alt = thumbnail?.alt || caption;
        dialogCaption.textContent = caption;
        dialog.showModal();
      });
    });
  }

  const trailer = document.querySelector(".video-facade");
  const trailerButton = trailer?.querySelector(".video-play");

  if (trailer && trailerButton) {
    trailerButton.addEventListener("click", () => {
      const videoId = trailer.getAttribute("data-video-id");
      if (!videoId) return;

      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
      iframe.title = "Mana Battle trailer";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      trailer.replaceChildren(iframe);
    });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
