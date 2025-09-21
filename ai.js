// ai.js
(async () => {
  const API_BASE =
    (typeof window !== "undefined" && window.API_BASE) ||
    "https://gcp-bucket-detector-backend-661175673686.us-central1.run.app";

  console.log("ai.js loaded. API_BASE =", API_BASE);

  const qs = new URLSearchParams(location.search);
  const scanId =
    qs.get("scan_id") ||
    sessionStorage.getItem("last_scan_id") ||
    localStorage.getItem("last_scan_id") || // extra fallback
    "";

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
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    return res;
  };

  // ---- try to load the scan from the backend; fall back to cached rows ----
  async function loadScanOrFallback() {
    const candidates = [
      `${API_BASE}/history/scan/${encodeURIComponent(scanId)}`, // your first guess
      `${API_BASE}/scan/${encodeURIComponent(scanId)}`,         // alternate path
    ];

    for (const url of candidates) {
      try {
        const res = await authFetch(url);
        if (res.ok) return await res.json();
        if (res.status !== 404 && res.status !== 405) {
          throw new Error(`Scan fetch failed: ${res.status}`);
        }
        // 404/405: try the next candidate
        console.warn("Scan endpoint returned", res.status, "for", url);
      } catch (e) {
        console.warn("Scan endpoint error for", url, e);
      }
    }

    // fallback: use rows cached by the scan page
const cached = sessionStorage.getItem("last_scan_rows") || localStorage.getItem("last_scan_rows");
if (cached) {
  console.log("Using cached rows from", sessionStorage.getItem("last_scan_rows") ? "sessionStorage" : "localStorage");
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

  // ---- the rest of your code stays the same ----
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

  for (const row of publicRows) {
    const bucketName = row.bucket || row.bucket_name || "(unknown bucket)";
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<div><strong>${bucketName}</strong></div><div class="plan">Loading suggestions…</div>`;
    bucketList.appendChild(card);

    const planDiv = card.querySelector(".plan");

    try {
      const res = await authFetch(`${API_BASE}/ai/reason/from-scan`, {
        method: "POST",
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`AI endpoint returned ${res.status}`);
      const data = await res.json();

      const risk = (data.overall_risk || "unknown").toLowerCase();
      const reasons = (data.reasons || []).map((r) => `<li>${r}</li>`).join("");
      const fixes = (data.recommended_fixes || []).map((f) => `<li>${f}</li>`).join("");
      const cmds = (data.commands || []).join("\n\n");

      planDiv.innerHTML = `
        <div class="risk ${risk}">Overall Risk: ${data.overall_risk ?? "—"}</div>
        ${reasons ? `<div><strong>Why risky:</strong><ul>${reasons}</ul></div>` : ""}
        ${fixes ? `<div><strong>Recommended fixes:</strong><ul>${fixes}</ul></div>` : ""}
        ${cmds ? `<div><strong>Commands:</strong><div class="cmd">${cmds}</div><button class="copy-btn">Copy Commands</button></div>` : ""}
      `;

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
