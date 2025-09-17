// ===== Header hide/show + Scroll-to-top button =====
let lastScrollTop = 0;
const header = document.querySelector("header");
const toTop = document.querySelector(".to-top");
const heroSection = document.querySelector(".hero");

window.addEventListener("scroll", () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Show "back to top" button after hero
  if (scrollTop > heroSection.offsetHeight) {
    toTop.classList.add("active");
  } else {
    toTop.classList.remove("active");
  }

  // Hide header on scroll down, show on scroll up
  if (scrollTop > lastScrollTop) {
    header.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
  }

  lastScrollTop = scrollTop;
});

// ===== Smooth Scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", e => {
    e.preventDefault();
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ===== Slider =====
const sliderTrack = document.getElementById("sliderTrack");
const slides = Array.from(sliderTrack.children);
const indicatorsContainer = document.getElementById("indicators");
let currentIndex = 0;
let autoPlayInterval;

function goToSlide(index) {
  if (index < 0 || index >= slides.length) return;

  slides[currentIndex].classList.remove("active");
  currentIndex = index;
  sliderTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
  slides[currentIndex].classList.add("active");
  updateIndicators();
}

function nextSlide() {
  goToSlide((currentIndex + 1) % slides.length);
}

function prevSlide() {
  goToSlide((currentIndex - 1 + slides.length) % slides.length);
}

function createIndicators() {
  slides.forEach((_, idx) => {
    const dot = document.createElement("div");
    dot.classList.add("indicator");
    if (idx === 0) dot.classList.add("active");
    dot.addEventListener("click", () => {
      goToSlide(idx);
      resetAutoPlay();
    });
    indicatorsContainer.appendChild(dot);
  });
}

function updateIndicators() {
  Array.from(indicatorsContainer.children).forEach((dot, idx) => {
    dot.classList.toggle("active", idx === currentIndex);
  });
}

function startAutoPlay() {
  autoPlayInterval = setInterval(nextSlide, 6000); // 6s
}

function stopAutoPlay() {
  clearInterval(autoPlayInterval);
}

function resetAutoPlay() {
  stopAutoPlay();
  startAutoPlay();
}

// Init slider
createIndicators();
startAutoPlay();

// Pause autoplay on hover
sliderTrack.addEventListener("mouseenter", stopAutoPlay);
sliderTrack.addEventListener("mouseleave", startAutoPlay);

// Swipe support (mobile)
let touchStartX = 0;
sliderTrack.addEventListener("touchstart", e => {
  touchStartX = e.touches[0].clientX;
  stopAutoPlay();
}, { passive: true });

sliderTrack.addEventListener("touchend", e => {
  let touchEndX = e.changedTouches[0].clientX;
  if (touchStartX - touchEndX > 50) nextSlide();
  if (touchEndX - touchStartX > 50) prevSlide();
  startAutoPlay();
}, { passive: true });

// ===== Intersection Observer (reveal animations) =====
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll(".card, .items, .title, .slide").forEach(el => {
  observer.observe(el);
});


 function copyEmail() {
  const email = "support@gcsguardian.com";
  navigator.clipboard.writeText(email).then(() => {
    // Instead of alert, show temporary tooltip
    const btn = document.querySelector(".copy-btn");
    const oldText = btn.innerText;
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = oldText, 2000);
  });
}
