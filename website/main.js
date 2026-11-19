/**
 * Mana Battle landing page — tiny progressive enhancements.
 * No dependencies, no build step. Ad conversion tracking lives in
 * analytics.js.
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

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");

  if (navToggle && nav) {
    const setMenuOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };

    navToggle.addEventListener("click", () => {
      setMenuOpen(navToggle.getAttribute("aria-expanded") !== "true");
    });

    // A link scrolls to a section, so the panel has done its job.
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenuOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) {
        setMenuOpen(false);
      }
    });

    // Rotating a phone or resizing past the breakpoint restores the inline nav.
    window
      .matchMedia("(min-width: 761px)")
      .addEventListener("change", (event) => {
        if (event.matches) setMenuOpen(false);
      });
  }

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
