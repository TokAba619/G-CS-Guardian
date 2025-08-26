/* ========= G-CS Guardian — Web UI Scripts (refined) =========
   Features:
   - Navbar "scrolled" state (rAF-throttled)
   - Smooth in-page anchor navigation
   - Scroll-spy: highlight active nav link
   - Mobile hamburger menu (.open) + Esc/Click-outside to close
   - IntersectionObserver reveal animations
   - Optional hero slider (indicators, autoplay, swipe) if present
   - Team slider: horizontal scroll + optional prev/next buttons
   ------------------------------------------------------------ */

(function () {
  // ===== Helpers =====
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  window.scrollToSection = smoothScrollTo; // used by inline onclick

  // ===== Navbar: scrolled state (throttled) =====
  const navbar = document.getElementById("navbar");
  let ticking = false;
  const updateScrolled = () => {
    if (!navbar) return;
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  };
  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScrolled();
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("load", updateScrolled);

  // ===== Mobile menu =====
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const navLinks = document.getElementById("navLinks");

  function closeMenu() {
    if (!navLinks) return;
    navLinks.classList.remove("open");
    navLinks.classList.remove("active"); // back-compat
  }
  function toggleMenu() {
    if (!navLinks) return;
    navLinks.classList.toggle("open");
  }
  window.closeMenu = closeMenu; // used by inline anchors

  if (hamburgerMenu && navLinks) {
    hamburgerMenu.addEventListener("click", toggleMenu);
    hamburgerMenu.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") toggleMenu();
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // Click-outside to close
    document.addEventListener("click", (e) => {
      if (!navLinks.classList.contains("open")) return;
      const clickedInsideMenu = navLinks.contains(e.target) || hamburgerMenu.contains(e.target);
      if (!clickedInsideMenu) closeMenu();
    });
  }

  // ===== Smooth anchor links (only same-page hashes) =====
  const navAnchors = qsa(".nav-links a[href^='#']");
  const setActiveNav = (id) => {
    navAnchors.forEach(a => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
  };

  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const id = href && href.startsWith("#") ? href.slice(1) : null;
      if (!id) return;
      e.preventDefault();
      smoothScrollTo(id);
      setActiveNav(id); // ensure immediate highlight on click
      closeMenu();
    });
  });

  // ===== Intersection reveal animations =====
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

  // ===== Scroll-Spy (active nav link while scrolling) =====
  const sections = qsa("section[id]");
  const anchorFor = (id) => navAnchors.find(a => a.getAttribute("href") === `#${id}`);

  const spyIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        const a = anchorFor(id);
        if (!a) return;
        if (entry.isIntersecting) {
          navAnchors.forEach(x => x.classList.remove("active"));
          a.classList.add("active");
        }
      });
    },
    { root: null, threshold: 0.6 }
  );
  sections.forEach(sec => spyIO.observe(sec));

  // ===== Hero slider (if present) =====
  const sliderTrack = document.getElementById("sliderTrack");
  const indicatorsContainer = document.getElementById("indicators");
  const sliderContainer = qs(".slider-container");
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
    autoPlayTimer = setInterval(nextSlide, 7000);
  }
  function stopAutoplay() {
    if (autoPlayTimer) clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  if (sliderTrack) {
    createIndicators();
    goToSlide(0);
    startAutoplay();

    if (sliderContainer) {
      // Pause on hover (desktop)
      sliderContainer.addEventListener("mouseenter", stopAutoplay);
      sliderContainer.addEventListener("mouseleave", startAutoplay);

      // Touch swipe (mobile)
      let touchStartX = 0, touchStartY = 0;
      sliderContainer.addEventListener("touchstart", (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        touchStartX = t.clientX; touchStartY = t.clientY;
        stopAutoplay();
      }, { passive: true });

      sliderContainer.addEventListener("touchend", (e) => {
        const t = e.changedTouches?.[0];
        if (!t) { startAutoplay(); return; }
        const dx = touchStartX - t.clientX;
        const dy = touchStartY - t.clientY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
          dx > 0 ? nextSlide() : prevSlide();
        }
        startAutoplay();
      }, { passive: true });
    }
  }

  // ===== Team slider (works with your .team-slider of .team-card) =====
  // Supports: horizontal wheel/drag scroll; optional buttons .team-prev / .team-next
  const teamSlider = qs(".team-slider");
  const teamCards  = qsa(".team-slider .team-card");
  const teamPrev   = qs(".team-prev");
  const teamNext   = qs(".team-next");

  if (teamSlider && teamCards.length) {
    // Make it scrollable by drag (mouse & touch)
    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;

    const startDrag = (pageX) => {
      isDown = true;
      startX = pageX - teamSlider.offsetLeft;
      scrollLeftStart = teamSlider.scrollLeft;
      teamSlider.classList.add("dragging");
    };
    const moveDrag = (pageX) => {
      if (!isDown) return;
      const x = pageX - teamSlider.offsetLeft;
      const walk = (x - startX) * 1; // sensitivity
      teamSlider.scrollLeft = scrollLeftStart - walk;
    };
    const endDrag = () => { isDown = false; teamSlider.classList.remove("dragging"); };

    teamSlider.addEventListener("mousedown", (e) => startDrag(e.pageX));
    teamSlider.addEventListener("mousemove", (e) => moveDrag(e.pageX));
    teamSlider.addEventListener("mouseleave", endDrag);
    teamSlider.addEventListener("mouseup", endDrag);

    teamSlider.addEventListener("touchstart", (e) => {
      const t = e.touches?.[0]; if (!t) return;
      startDrag(t.pageX);
    }, { passive: true });
    teamSlider.addEventListener("touchmove", (e) => {
      const t = e.touches?.[0]; if (!t) return;
      moveDrag(t.pageX);
    }, { passive: true });
    teamSlider.addEventListener("touchend", endDrag);

    // Optional wheel horizontal scroll (Shift+wheel or trackpad)
    teamSlider.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
        teamSlider.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // Optional buttons (if you add them in HTML)
    const scrollAmount = () => Math.min(teamSlider.clientWidth * 0.9, 600);
    const scrollByAmount = (dir = 1) => teamSlider.scrollBy({ left: dir * scrollAmount(), behavior: "smooth" });

    teamPrev?.addEventListener("click", () => scrollByAmount(-1));
    teamNext?.addEventListener("click", () => scrollByAmount(1));
  }
})();
