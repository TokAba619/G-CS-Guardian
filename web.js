/* ========= G‑CS Guardian — Web UI Scripts (refined) =========
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
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const id = href && href.startsWith("#") ? href.slice(1) : null;
      if (!id) return;
      e.preventDefault();
      smoothScrollTo(id);
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
  const navAnchors = qsa(".nav-links a[href^='#']");
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

(function(){
  const btn = document.querySelector('.scroll-top');
  if(!btn) return;

  const header = document.getElementById('navbar');
  const offset = (header?.offsetHeight || 80);

  function toggle(){
    if(window.scrollY > offset*2){ btn.classList.add('show'); }
    else { btn.classList.remove('show'); }
  }

  window.addEventListener('scroll', toggle, {passive:true});
  window.addEventListener('load', toggle);

  // re-render feather icon if needed
  if(window.feather) feather.replace();
})();


document.getElementById("learn-more").addEventListener("click", function () {
  // Run your scan logic here (if you already have it)
  
  // Auto scroll to results section
  const resultsSection = document.getElementById("results");
  if (resultsSection) {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

rows.forEach(function(p){
  var isSel = state.selected && state.selected.id === p.id;
  var tr=document.createElement("tr");
  tr.setAttribute("data-id", p.id);
  tr.setAttribute("data-name", p.name || "");
  tr.setAttribute("data-access", p.access_level);

  tr.innerHTML =
    "<td>"+escapeHtml(p.name||"—")+"</td>"+
    "<td><code>"+escapeHtml(p.id)+"</code></td>"+
    "<td>"+p.access_level+"</td>";

  if(isSel) tr.classList.add("is-selected");

  // NEW: row click selects project
  tr.addEventListener("click", function(){
    selectProject({
      id: tr.getAttribute("data-id"),
      name: tr.getAttribute("data-name"),
      access: tr.getAttribute("data-access")
    });
  });

  els.tbody.appendChild(tr);
});


/* =========================
   LIVE REPORTS
========================= */
var API_REPORTS_SUMMARY = API_BASE + "/reports/summary";
var API_REPORTS_TRENDS  = API_BASE + "/reports/trends";
var API_REPORTS_TOP     = API_BASE + "/reports/top-risks";

let LR_CHARTS = { risk:null, exposure:null, trend:null };
let LR_TIMER  = null;

function lrQS(params){
  const sp = new URLSearchParams();
  Object.entries(params||{}).forEach(([k,v])=>{
    if(v!=null && String(v).trim()!=="") sp.set(k, v);
  });
  return sp.toString();
}
function authFetchJSON(url){
  const t = getToken(); if(!t) throw new Error("No token");
  return fetch(url, { headers: { "Authorization":"Bearer "+t, "Accept":"application/json" } })
    .then(r=>{ if(!r.ok) throw new Error("HTTP "+r.status); return r.json(); });
}
function lrSetLoading(on){
  const el = document.getElementById("lr-loader");
  if (!el) return;
  el.hidden = !on;
}

/* Render small tiles */
function lrRenderKpis(summary){
  const totals = summary?.totals || {};
  document.getElementById("kpi-total-scans").textContent = totals.total_scans ?? "—";
  document.getElementById("kpi-buckets").textContent     = totals.buckets_scanned ?? "—";
  document.getElementById("kpi-risky").textContent       = totals.risky_buckets ?? "—";
  const pct = summary?.risky_bucket_pct;
  document.getElementById("kpi-risky-pct").textContent   = (pct==null ? "—" : (pct+"%"));
}

/* Charts (Chart.js) */
function lrDestroy(id){ if(LR_CHARTS[id]){ LR_CHARTS[id].destroy(); LR_CHARTS[id]=null; } }

function lrRenderRiskLevels(summary){
  lrDestroy("risk");
  const c = document.getElementById("chart-risk-levels").getContext("2d");
  const counts = summary?.risk_level_counts || {};
  const labels = ["critical","high","medium","low","info"];
  const data   = labels.map(k => counts[k]||0);
  LR_CHARTS.risk = new Chart(c,{
    type:"doughnut",
    data:{ labels: labels.map(s=>s.toUpperCase()), datasets:[{ data }] },
    options:{
      plugins:{ legend:{ position:"bottom", labels:{ color:"#ddd" } } },
      cutout:"58%"
    }
  });
}

function lrRenderExposure(summary){
  lrDestroy("exposure");
  const c = document.getElementById("chart-exposure").getContext("2d");
  const ec = summary?.exposure_category_counts || {};
  LR_CHARTS.exposure = new Chart(c,{
    type:"bar",
    data:{
      labels:["Private","Public"],
      datasets:[{ data:[ec.private||0, ec.public||0] }]
    },
    options:{
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:"#ddd" }, grid:{ display:false } },
        y:{ ticks:{ color:"#aaa" }, grid:{ color:"rgba(255,255,255,.08)" }, beginAtZero:true, precision:0 }
      }
    }
  });
}

function lrRenderTrend(trends){
  lrDestroy("trend");
  const c = document.getElementById("chart-trend").getContext("2d");
  const points = trends?.points || [];
  const labels = points.map(p => new Date(p.timestamp).toLocaleString());
  const avg    = points.map(p => p.avg_risk ?? 0);
  LR_CHARTS.trend = new Chart(c,{
    type:"line",
    data:{ labels, datasets:[{ data:avg, tension:.25, fill:false }] },
    options:{
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:"#ddd", maxRotation:0 }, grid:{ display:false } },
        y:{ ticks:{ color:"#aaa" }, grid:{ color:"rgba(255,255,255,.08)" }, beginAtZero:true, suggestedMax:10 }
      }
    }
  });
}

function lrRenderTopRisks(items){
  const tb = document.getElementById("lr-toprisks-body");
  if(!tb) return;
  tb.innerHTML = "";
  if(!items || items.length===0){
    tb.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No risky buckets found.</td></tr>";
    return;
  }
  items.forEach(it=>{
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>"+ (it.bucket_name||"—") +"</td>"+
      "<td><strong>"+ (it.risk_score ?? "—") +"</strong> <span class='badge "+riskClass(it.risk_level)+ "'>"+(it.risk_level||"")+"</span></td>"+
      "<td>"+ (it.exposure_state||"—") +"</td>"+
      "<td>"+ (it.sensitive_keyword_count ?? 0) +"</td>"+
      "<td>"+ formatDate(it.last_seen_at) +"</td>";
    tb.appendChild(tr);
  });
}

/* Load everything for current selection (and optional date range) */
async function loadLiveReports(){
  const project = (window.ProjectPicker && window.ProjectPicker.getSelected && window.ProjectPicker.getSelected()) || {};
  const pid = project.id || localStorage.getItem("selected_project_id") || "";
  document.getElementById("lr-project-label").textContent = pid || "—";
  if(!pid){ return; }

  const from = document.getElementById("lr-from").value;
  const to   = document.getElementById("lr-to").value;

  try{
    lrSetLoading(true);

    const qs   = lrQS({ project_id: pid, from, to });
    const lim5 = lrQS({ project_id: pid, limit: 5, from, to });

    const [summary, trends, topRisks] = await Promise.all([
      authFetchJSON(API_REPORTS_SUMMARY + "?" + qs),
      authFetchJSON(API_REPORTS_TRENDS  + "?" + qs),
      authFetchJSON(API_REPORTS_TOP     + "?" + lim5)
    ]);

    lrRenderKpis(summary);
    lrRenderRiskLevels(summary);
    lrRenderExposure(summary);
    lrRenderTrend(trends);
    lrRenderTopRisks(topRisks?.items || []);
  }catch(e){
    console.error("Live Reports error:", e);
  }finally{
    lrSetLoading(false);
  }
}

/* Hook up controls */
document.addEventListener("DOMContentLoaded", function(){
  const btn = document.getElementById("lr-refresh");
  const auto = document.getElementById("lr-autorefresh");

  if(btn) btn.addEventListener("click", loadLiveReports);

  if(auto){
    auto.addEventListener("change", function(){
      if(LR_TIMER){ clearInterval(LR_TIMER); LR_TIMER=null; }
      if(this.checked){ LR_TIMER = setInterval(loadLiveReports, 30_000); }
    });
  }

  /* Load when page opens (if a project is already selected) */
  loadLiveReports();
});

/* Also refresh Live Reports whenever a project is picked from your Project Picker */
window.addEventListener("gcs_project_selected", function(){
  // clear date range on selection change (optional)
  const f = document.getElementById("lr-from"), t = document.getElementById("lr-to");
  if(f) f.value = ""; if(t) t.value = "";
  loadLiveReports();
});
