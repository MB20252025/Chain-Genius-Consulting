
/* =========================================
   CHAIN GENIUS CONSULTING
   Shared website JavaScript
========================================= */

document.documentElement.classList.add("js");

document.addEventListener("DOMContentLoaded", function () {

  /* MOBILE NAVIGATION */

  const menuToggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  if (menuToggle && navLinks) {

    function closeMenu() {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation");
      menuToggle.innerHTML = "☰ Menu";
    }

    function toggleMenu() {
      const isOpen = navLinks.classList.toggle("open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );

      menuToggle.innerHTML = isOpen ? "✕ Close" : "☰ Menu";
    }

    menuToggle.addEventListener("click", toggleMenu);

    // Close menu after selecting a page
    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    // Close menu using Escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    // Close menu when returning to desktop layout
    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) {
        closeMenu();
      }
    });
  }


  /* HEADER SCROLL EFFECT */

  const header = document.getElementById("header");

  function updateHeader() {
    if (header) {
      header.classList.toggle("scrolled", window.scrollY > 20);
    }
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();


  /* SCROLL PROGRESS BAR */

  const progressBar = document.getElementById("progressBar");

  function updateProgress() {
    if (!progressBar) return;

    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;

    const progress = scrollable > 0
      ? (window.scrollY / scrollable) * 100
      : 0;

    progressBar.style.width = progress + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();


  /* SCROLL REVEAL ANIMATIONS */

  const revealElements = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {

    const revealObserver = new IntersectionObserver(
      function (entries, observer) {

        entries.forEach(function (entry) {

          if (entry.isIntersecting) {
            entry.target.classList.add("visible");

            // Reveal once, rather than repeatedly hiding elements
            observer.unobserve(entry.target);
          }

        });

      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -35px 0px"
      }
    );

    revealElements.forEach(function (element) {
      revealObserver.observe(element);
    });

  } else {

    // Fallback for older browsers
    revealElements.forEach(function (element) {
      element.classList.add("visible");
    });

  }


  /* ACTIVE NAVIGATION LINK */

  const currentPage = (
    window.location.pathname.split("/").pop() || "index.html"
  ).toLowerCase();

  document.querySelectorAll(".nav-links a[data-page]").forEach(
    function (link) {

      const linkPage = link.dataset.page.toLowerCase();

      if (linkPage === currentPage) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.classList.remove("active");
        link.removeAttribute("aria-current");
      }

    }
  );


  /* FOOTER YEAR */

  const yearElement = document.getElementById("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

});
