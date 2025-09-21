// ai.js
(async () => {
  // --- config ---
  const API_BASE =
    (typeof window !== "undefined" && window.API_BASE) ||
    "https://gcp-bucket-detector-backend-661175673686.us-central1.run.app";

  console.log("ai.js loaded. API_BASE =", API_BASE);

  const qs = new URLSearchParams(location.search);
  const scanId =
    qs.get("scan_id") ||
    sessionStorage.getItem("last_scan_id") ||
    localStorage.getItem("last_scan_id") ||
    "";

  // prefer getToken() if available; otherwise use localStorage
  const token =
    (typeof getToken === "function" ? getToken() : null) ||
    localStorage.getItem("access_token");

  const publicSummary = document.getElementById("publicSummary");
  const bucketList    = document.getElementById("bucketList");

  if (!scanId) { publicSummary.textContent = "Missing scan_id."; return; }
  if (!token)  { publicSummary.textContent = "Missing access token. Please sign in again."; return; }

  const authFetch = async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: {
        accept: "application/json",
        ...(opts.body ? { "content-type": "application/json" } : {}),
        authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error("Unauthorized (token expired or invalid).");
    }
    return res;
  };

  // ---- try to load the scan from the backend; fall back to cached rows ----
  async function loadScanOrFallback() {
    const candidates = [
      `${API_BASE}/history/scan/${encodeURIComponent(scanId)}`,
      `${API_BASE}/scan/${encodeURIComponent(scanId)}`,
    ];

    for (const url of candidates) {
      try {
        const res = await authFetch(url);
        if (res.ok) return await res.json();
        if (res.status !== 404 && res.status !== 405) {
          throw new Error(`Scan fetch failed: ${res.status}`);
        }
        console.warn("Scan endpoint returned", res.status, "for", url);
      } catch (e) {
        console.warn("Scan endpoint error for", url, e);
      }
    }

    // fallback: use rows cached by the scan page (supports new tab)
    const cached =
      sessionStorage.getItem("last_scan_rows") ||
      localStorage.getItem("last_scan_rows");
    if (cached) {
      console.log(
        "Using cached rows from",
        sessionStorage.getItem("last_scan_rows") ? "sessionStorage" : "localStorage"
      );
      return { buckets: JSON.parse(cached) };
    }
    throw new Error("Scan not found (404) and no cached rows available.");
  }

  let scan;
  try {
    scan = await loadScanOrFallback();
  } catch (e) {
    console.error(e);
    publicSummary.textContent = e.message.includes("Unauthorized")
      ? "Session expired. Please log in again."
      : "Could not load scan results (check API_BASE and CORS).";
    return;
  }

  // ---- process rows ----
  const rows = Array.isArray(scan?.buckets) ? scan.buckets : (scan?.results || []);

  const isBindingPublic = (b) => {
    const list = []
      .concat(b?.member ?? [])
      .concat(Array.isArray(b?.members) ? b.members : []);
    return list.some((m) => typeof m === "string" && /allusers|allauthenticatedusers/i.test(m));
  };

  const publicRows = rows.filter((r) =>
    r.public === true ||
    r.public_exposure === true ||
    r.iam_public === true ||
    String(r.exposure_state || "").toLowerCase().startsWith("public") ||
    (Array.isArray(r.bindings) && r.bindings.some(isBindingPublic))
  );

  publicSummary.textContent = `${publicRows.length} public bucket(s) found in scan ${scanId}`;

  if (publicRows.length === 0) {
    bucketList.innerHTML = `<div class="card">No public buckets found 🎉</div>`;
    return;
  }

  // ---- render each public bucket as a tidy card ----
  for (const row of publicRows) {
    const bucketName = row.bucket || row.bucket_name || "(unknown bucket)";
    const card = document.createElement("div");
    card.className = "card plan-card";
    card.innerHTML = `
      <div class="plan-head">
        <div class="plan-title">${bucketName}</div>
        <span class="risk-badge">assessing…</span>
      </div>
      <div class="plan">Loading suggestions…</div>`;
    bucketList.appendChild(card);

    const planDiv  = card.querySelector(".plan");
    const riskChip = card.querySelector(".risk-badge");

    try {
      const res = await authFetch(`${API_BASE}/ai/reason/from-scan`, {
        method: "POST",
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`);
      const data = await res.json();

    // --- tidy header + sections ---
const risk = (data.overall_risk || "unknown").toLowerCase();

// update the header chip
riskChip.textContent = data.overall_risk ?? "—";
riskChip.className = `risk-badge ${risk}`;

// build sections
const reasons = (data.reasons || []).map(r => `<li>${r}</li>`).join("");
const fixes   = (data.recommended_fixes || []).map(f => `<li>${f}</li>`).join("");
const cmds    = (data.commands || []).join("\n\n");

planDiv.innerHTML = `
  ${reasons ? `<div class="section"><h4>Why risky</h4><ul class="list">${reasons}</ul></div>` : ""}
  ${fixes   ? `<div class="section"><h4>Recommended fixes</h4><ul class="list">${fixes}</ul></div>` : ""}
  ${
    cmds
      ? `<div class="section">
           <h4>Commands</h4>
           <div class="cmd">${cmds}</div>
           <div class="copy-row"><button class="copy-btn">Copy Commands</button></div>
         </div>`
      : ""
  }`;

// keep your copy handler
const copyBtn = planDiv.querySelector(".copy-btn");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(cmds);
    copyBtn.textContent = "Copied ✓";
    setTimeout(() => (copyBtn.textContent = "Copy Commands"), 1500);
  });
}

    } catch (e) {
      console.error(e);
      planDiv.textContent = `AI error: ${e.message}`;
    }
  }
})();
