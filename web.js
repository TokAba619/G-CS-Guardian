/* ========= G‑CS Guardian — Web UI Scripts (clean version) =========
   Features:
   - Navbar "scrolled" state
   - Smooth anchor navigation
   - Mobile hamburger menu (uses .open)
   - Hero slider: indicators, autoplay, swipe
   - IntersectionObserver reveal animations
   - Team slider buttons
   ------------------------------------------------------------------ */

(function () {
  // ===== Helpers =====
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Expose for inline onclick="closeMenu()" in HTML
  window.scrollToSection = smoothScrollTo;

  // ===== Navbar: scrolled state =====
  const navbar = document.getElementById("navbar");
  const onScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 50) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  };
  window.addEventListener("scroll", onScroll);
  window.addEventListener("load", onScroll);

  // ===== Smooth anchor links (only same-page hashes) =====
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const id = href && href.startsWith("#") ? href.slice(1) : null;
      if (!id) return;
      e.preventDefault();
      smoothScrollTo(id);
      // Also close mobile menu if open
      if (navLinks && navLinks.classList.contains("open")) {
        navLinks.classList.remove("open");
      }
    });
  });

  // ===== Hamburger menu =====
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const navLinks = document.getElementById("navLinks");

  function closeMenu() {
    if (navLinks && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
    }
    // Back-compat with old .active class if present
    if (navLinks && navLinks.classList.contains("active")) {
      navLinks.classList.remove("active");
    }
  }
  window.closeMenu = closeMenu;

  if (hamburgerMenu && navLinks) {
    hamburgerMenu.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
    hamburgerMenu.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") navLinks.classList.toggle("open");
    });
  }

  // ===== Intersection reveal animations =====
  // Reveal common elements when they enter the viewport
  const revealTargets = qsa(
    ".container, .card, .experience-item, .gallery-item, .faq-item, .contact-form, .contact-info"
  );
  if (revealTargets.length) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.1 }
    );
    revealTargets.forEach((el) => io.observe(el));
  }

  // Optionally toggle .active on .slide when it’s ~centered (for title/subtitle animations)
  const slideEls = qsa(".slide");
  if (slideEls.length) {
    const slideIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.parentElement) {
            entry.target.classList.add("active");
          } else {
            entry.target.classList.remove("active");
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.5 }
    );
    slideEls.forEach((s) => slideIO.observe(s));
  }

  // ===== Hero slider (if present) =====
  const sliderTrack = document.getElementById("sliderTrack");
  const indicatorsContainer = document.getElementById("indicators");
  const sliderContainer = document.querySelector(".slider-container");
  let currentIndex = 0;
  let autoPlayTimer = null;

  function getSlides() {
    return sliderTrack ? Array.from(sliderTrack.children) : [];
  }

  function createIndicators() {
    if (!indicatorsContainer || !sliderTrack) return;
    const slides = getSlides();
    indicatorsContainer.innerHTML = "";
    slides.forEach((_, i) => {
      const dot = document.createElement("div");
      dot.classList.add("indicator");
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => {
        goToSlide(i);
        restartAutoplay();
      });
      indicatorsContainer.appendChild(dot);
    });
  }

  function updateIndicators() {
    if (!indicatorsContainer) return;
    const dots = Array.from(indicatorsContainer.children);
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  function goToSlide(idx) {
    const slides = getSlides();
    if (!slides.length || !sliderTrack) return;
    if (idx < 0 || idx >= slides.length) return;

    slides[currentIndex]?.classList.remove("active");
    currentIndex = idx;

    sliderTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    slides[currentIndex]?.classList.add("active");
    updateIndicators();
  }

  function nextSlide() {
    const slides = getSlides();
    if (!slides.length) return;
    goToSlide((currentIndex + 1) % slides.length);
  }

  function prevSlide() {
    const slides = getSlides();
    if (!slides.length) return;
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }

  function startAutoplay() {
    stopAutoplay();
    autoPlayTimer = setInterval(nextSlide, 7000); // 7s
  }
  function stopAutoplay() {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  // Init slider if markup exists
  if (sliderTrack) {
    createIndicators();
    goToSlide(0);
    startAutoplay();

    // Pause on hover (desktop)
    if (sliderContainer) {
      sliderContainer.addEventListener("mouseenter", stopAutoplay);
      sliderContainer.addEventListener("mouseleave", startAutoplay);
    }

    // Touch swipe (mobile)
    if (sliderContainer) {
      let touchStartX = 0;
      let touchStartY = 0;

      sliderContainer.addEventListener(
        "touchstart",
        (e) => {
          const t = e.touches?.[0];
          if (!t) return;
          touchStartX = t.clientX;
          touchStartY = t.clientY;
          stopAutoplay();
        },
        { passive: true }
      );

      sliderContainer.addEventListener(
        "touchend",
        (e) => {
          const t = e.changedTouches?.[0];
          if (!t) {
            startAutoplay();
            return;
          }
          const dx = touchStartX - t.clientX;
          const dy = touchStartY - t.clientY;

          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
            // horizontal swipe
            if (dx > 0) nextSlide();
            else prevSlide();
          }
          startAutoplay();
        },
        { passive: true }
      );
    }
  }

  // ===== Team slider (buttons .team-prev / .team-next) =====
  const teamSlider = qs(".team-slider");
  const members = qsa(".team-member");
  const prevBtn = qs(".team-prev");
  const nextBtn = qs(".team-next");
  let currentTeamSlide = 0;

  function updateTeamSlider() {
    if (!teamSlider || !members.length) return;
    const offset = -currentTeamSlide * 100;
    teamSlider.style.transform = `translateX(${offset}%)`;
  }

  if (prevBtn && nextBtn && teamSlider && members.length) {
    prevBtn.addEventListener("click", () => {
      if (currentTeamSlide > 0) {
        currentTeamSlide--;
        updateTeamSlider();
      }
    });
    nextBtn.addEventListener("click", () => {
      if (currentTeamSlide < members.length - 1) {
        currentTeamSlide++;
        updateTeamSlider();
      }
    });
    updateTeamSlider();
  }
})();
