// SIM — Security Incident Mapping (prototype)
// All data is stored in the browser's localStorage — no backend required for this demo.

const STORAGE_KEY = "sim_reports_v1";
const HIGH_SEVERITY = [
  "Assault / Stabbing",
  "Sexual Assault / Rape",
  "Burglary",
];
const STATUSES = ["Received", "Verified", "In-Progress", "Resolved"];

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}
function saveReports(reports) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
function genRefId() {
  return "SIM-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// ---------- Tab navigation ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-panel")
      .forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "feed") renderFeed();
  });
});

// ---------- Report form ----------
const reportForm = document.getElementById("reportForm");
const photoInput = document.getElementById("incidentPhoto");

// default datetime to now
document.getElementById("incidentTime").value = new Date()
  .toISOString()
  .slice(0, 16);

reportForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const type = document.getElementById("incidentType").value;
  const zone = document.getElementById("incidentZone").value;
  const desc = document.getElementById("incidentDesc").value.trim();
  const time = document.getElementById("incidentTime").value;
  const anon = document.getElementById("anonToggle").checked;
  const file = photoInput.files[0];

  const finish = (photoDataUrl) => {
    const reports = loadReports();
    const refId = genRefId();
    reports.unshift({
      id: refId,
      type,
      zone,
      desc,
      time,
      anon,
      photo: photoDataUrl || null,
      status: "Received",
      severity: HIGH_SEVERITY.includes(type) ? "high" : "normal",
      createdAt: Date.now(),
    });
    saveReports(reports);

    document.getElementById("refId").textContent = refId;
    document.getElementById("reportConfirm").hidden = false;
    reportForm.reset();
    document.getElementById("incidentTime").value = new Date()
      .toISOString()
      .slice(0, 16);
    document.getElementById("anonToggle").checked = true;
    populateFilters();
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
});

// ---------- Feed ----------
const feedList = document.getElementById("feedList");
const emptyFeed = document.getElementById("emptyFeed");
const filterType = document.getElementById("filterType");
const filterZone = document.getElementById("filterZone");

function populateFilters() {
  const reports = loadReports();
  const types = [...new Set(reports.map((r) => r.type))];
  const zones = [...new Set(reports.map((r) => r.zone))];

  const rebuild = (select, values, allLabel) => {
    const current = select.value;
    select.innerHTML =
      `<option value="">${allLabel}</option>` +
      values.map((v) => `<option value="${v}">${v}</option>`).join("");
    select.value = current;
  };
  rebuild(filterType, types, "All types");
  rebuild(filterZone, zones, "All zones");
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderFeed() {
  const reports = loadReports();
  const filtered = reports.filter(
    (r) =>
      (!filterType.value || r.type === filterType.value) &&
      (!filterZone.value || r.zone === filterZone.value),
  );

  feedList.innerHTML = "";
  emptyFeed.hidden = filtered.length > 0;

  filtered.forEach((r) => {
    const el = document.createElement("div");
    el.className = "feed-item" + (r.severity === "high" ? " high" : "");
    el.innerHTML = `
      <div class="feed-item-top">
        <span class="feed-item-type">${r.type}</span>
        <span class="status-badge status-${r.status}">${r.status}</span>
      </div>
      <div class="feed-item-meta">${r.zone} · ${r.anon ? "Anonymous" : "Identified reporter"} · ${timeAgo(r.createdAt)} · Ref: ${r.id}</div>
      <div class="feed-item-desc">${escapeHtml(r.desc)}</div>
      ${r.photo ? `<img src="${r.photo}" class="feed-item-photo" alt="evidence photo">` : ""}
    `;
    feedList.appendChild(el);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

filterType.addEventListener("change", renderFeed);
filterZone.addEventListener("change", renderFeed);
document.getElementById("clearFilters").addEventListener("click", () => {
  filterType.value = "";
  filterZone.value = "";
  renderFeed();
});

// ---------- Track status ----------
document.getElementById("trackBtn").addEventListener("click", () => {
  const id = document.getElementById("trackInput").value.trim().toUpperCase();
  const result = document.getElementById("trackResult");
  const reports = loadReports();
  const found = reports.find((r) => r.id === id);

  result.hidden = false;
  if (!found) {
    result.innerHTML = `<strong>Not found.</strong> Double-check your reference ID.`;
    return;
  }
  result.innerHTML = `
    <strong>${found.type}</strong> — ${found.zone}<br>
    Status: <span class="status-badge status-${found.status}">${found.status}</span><br>
    Reported ${timeAgo(found.createdAt)}
  `;
});

// ---------- SOS modal ----------
const sosModal = document.getElementById("sosModal");
document
  .getElementById("sosBtn")
  .addEventListener("click", () => (sosModal.hidden = false));
document
  .getElementById("sosCancel")
  .addEventListener("click", () => (sosModal.hidden = true));
document.getElementById("sosConfirm").addEventListener("click", () => {
  const reports = loadReports();
  const refId = genRefId();
  reports.unshift({
    id: refId,
    type: "Emergency SOS",
    zone: "Last known location",
    desc: "Emergency SOS alert triggered by user.",
    time: new Date().toISOString(),
    anon: false,
    photo: null,
    status: "Received",
    severity: "high",
    createdAt: Date.now(),
  });
  saveReports(reports);
  sosModal.hidden = true;
  alert("Emergency alert sent to campus security. Reference: " + refId);
  populateFilters();
});

// ---------- Init ----------
populateFilters();
renderFeed();
