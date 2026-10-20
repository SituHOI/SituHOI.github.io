(() => {
  "use strict";
  const config = window.SITUHOI || { links: {}, media: {} };
  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");

  function setMenu(open) {
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    nav.classList.toggle("is-open", open);
  }
  menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", event => { if (event.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { setMenu(false); menu.focus(); }
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".site-header") && menu.getAttribute("aria-expanded") === "true") setMenu(false);
  });
  const desktopQuery = window.matchMedia("(min-width: 701px)");
  desktopQuery.addEventListener("change", () => setMenu(false));

  document.querySelectorAll("[data-resource]").forEach(link => {
    const url = config.links[link.dataset.resource];
    if (!url) return;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    if (link.getAttribute("aria-disabled") === "true") {
      link.removeAttribute("aria-disabled");
      link.removeAttribute("role");
      link.removeAttribute("title");
    }
    link.querySelector("[data-pending]")?.remove();
  });

  function insertMedia(container, key) {
    const media = config.media[key];
    if (!media?.src) return;
    const isVideo = media.type === "video" || /\.(mp4|webm)(\?.*)?$/i.test(media.src);
    const element = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      element.controls = true;
      element.playsInline = true;
      element.preload = "metadata";
      element.setAttribute("aria-label", media.alt || key);
      if (media.poster) element.poster = media.poster;
    } else {
      element.alt = media.alt || key;
      element.loading = "lazy";
      element.decoding = "async";
      if (media.width) element.width = media.width;
      if (media.height) element.height = media.height;
    }
    element.addEventListener("error", () => {
      const message = document.createElement("p");
      message.className = "media-error";
      message.textContent = "Media could not be loaded.";
      container.replaceChildren(message);
    }, { once: true });
    let rendered = element;
    if (!isVideo && media.mobileSrc) {
      const picture = document.createElement("picture");
      const source = document.createElement("source");
      source.media = "(max-width: 640px)";
      source.srcset = media.mobileSrc;
      if (media.mobileWidth) source.width = media.mobileWidth;
      if (media.mobileHeight) source.height = media.mobileHeight;
      picture.append(source, element);
      rendered = picture;
    }
    container.replaceChildren(rendered);
    element.src = media.src;
  }
  document.querySelectorAll("[data-media]").forEach(container => insertMedia(container, container.dataset.media));

  const tabs = [...document.querySelectorAll("[data-demo]")];
  function selectDemo(tab) {
    tabs.forEach(item => { item.setAttribute("aria-selected", String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    document.getElementById("demo-panel").setAttribute("aria-labelledby", tab.id);
    window.SituDemo?.select(tab.dataset.demo);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectDemo(tab));
    tab.addEventListener("keydown", event => {
      let target;
      if (event.key === "ArrowRight") target = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") target = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") target = 0;
      if (event.key === "End") target = tabs.length - 1;
      if (target === undefined) return;
      event.preventDefault();
      tabs[target].focus();
      selectDemo(tabs[target]);
    });
  });

  const copyButton = document.getElementById("copy-citation");
  const copyStatus = document.getElementById("copy-status");
  copyButton.addEventListener("click", async () => {
    const text = document.getElementById("bibtex").textContent;
    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); success = true; } catch (_) {}
    }
    if (!success) {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.append(field);
      field.select();
      try { success = document.execCommand("copy"); } catch (_) { success = false; }
      field.remove();
      copyButton.focus();
    }
    copyStatus.textContent = success ? "BibTeX copied to clipboard." : "Copy unavailable in this browser. Select the BibTeX above and copy it manually.";
    copyButton.querySelector("span").textContent = success ? "Copied!" : "Copy BibTeX";
    window.setTimeout(() => { copyButton.querySelector("span").textContent = "Copy BibTeX"; }, 2200);
  });

  const navLinks = [...nav.querySelectorAll("a")];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        navLinks.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      }
    }, { rootMargin: "-12% 0px -65% 0px", threshold: 0 });
    document.querySelectorAll("main section[id]").forEach(section => observer.observe(section));
  }
})();
