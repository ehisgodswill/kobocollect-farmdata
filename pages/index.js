/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import { useEffect, useState } from "react";

/* ── Helpers ── */
function parseGPS (str) {
  if (!str) return [];
  return str.trim().split(";").map((pt) => {
    const [lat, lng, alt, acc] = pt.trim().split(" ").map(Number);
    return { lat, lng, alt, acc };
  });
}

function formatDate (iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function cleanKey (key) {
  return key.replace(/^.*\//, "").replace(/_/g, " ");
}

function proxyUrl (originalUrl) {
  return `/api/attachment?url=${encodeURIComponent(originalUrl)}`;
}

const SKIP_KEYS = new Set([
  "_attachments", "FarmBoundary", "__version__", "meta/instanceID",
  "meta/rootUuid", "_uuid", "_xform_id_string", "formhub/uuid",
  "_geolocation", "_tags", "_notes", "_validation_status",
  "_id", "start", "end", "today"
]);

/* ── Spinner ── */
function Spinner () {
  return (
    <svg className="spinner" width={16} height={16} viewBox="0 0 24 24"
      fill="none" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

/* ── Crop Tag ── */
function CropTag ({ crop }) {
  const name = crop["Crop_information/planted_Crops/Assessed_CropPlanted"] || "?";
  const pct = crop["Crop_information/planted_Crops/CropPercentage"] || "";
  const sym = crop["Crop_information/planted_Crops/CropPercentage_Symbol"] || "";
  const cat = crop["Crop_information/planted_Crops/Category_CropPlanted"] || "";
  return (
    <span className="crop-tag">
      <span className="crop-tag__dot" />
      {name}
      {pct && <strong className="crop-tag__pct">{pct}{sym}</strong>}
      {cat && <span className="crop-tag__cat">[{String(cat).toUpperCase()}]</span>}
    </span>
  );
}

/* ── GPS Mini-Map ── */
function GpsMiniMap ({ points }) {
  if (!points.length) return null;
  const lats = points.map(p => p.lat), lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 200, H = 120, PAD = 10;
  const toX = lng => PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (W - PAD * 2);
  const toY = lat => PAD + ((maxLat - lat) / (maxLat - minLat || 1)) * (H - PAD * 2);
  const pts = points.map(p => `${toX(p.lng)},${toY(p.lat)}`).join(" ");

  return (
    <div className="gps-map">
      <svg width={W} height={H} className="gps-map__svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <polygon className="gps-map__polygon" points={pts} filter="url(#glow)" />
        {points.map((p, i) => (
          <circle key={i}
            cx={toX(p.lng)} cy={toY(p.lat)}
            r={i === 0 ? 4 : 2}
            className={i === 0 ? "gps-map__dot gps-map__dot--first" : "gps-map__dot"}
          />
        ))}
      </svg>
      <p className="gps-map__label">{points.length} GPS points</p>
    </div>
  );
}

/* ── Submission Card ── */
function SubmissionCard ({ sub, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [imgOpen, setImgOpen] = useState(null);

  const collector = sub.Collector_Id || "Unknown"
  const name = sub.Name || "Unknown";
  const id = sub._id;
  const time = formatDate(sub._submission_time);
  const area = sub.Total_Area_Ha ? `${sub.Total_Area_Ha} ha` : null;
  const crops = sub["Crop_information/planted_Crops"] || [];
  const gpsPoints = parseGPS(sub.FarmBoundary);
  const attachments = (sub._attachments || []).filter(a => !a.is_deleted);

  const fields = Object.entries(sub).filter(([k]) =>
    !SKIP_KEYS.has(k) &&
    !k.startsWith("Crop_information") &&
    !k.startsWith("group_") &&
    typeof sub[k] !== "object"
  );

  return (
    <div className={`sub-card ${open ? "sub-card--open" : ""}`}>

      {/* ── Card Header ── */}
      <button className="sub-card__header" onClick={() => setOpen(o => !o)}>
        <div className="sub-card__avatar">
          {name.charAt(0)}
        </div>

        <div className="sub-card__meta">
          <div className="sub-card__name">{name}</div>
          <div className="sub-card__sub">#{id} · {time}</div>
        </div>

        <div className="sub-card__badges">
          {area && <span className="badge badge--area">{area}</span>}
          <span className={`badge badge--other`}>
            Collator- {collector}
          </span>
          <svg className={`chevron ${open ? "chevron--open" : ""}`}
            width={18} height={18} viewBox="0 0 24 24"
            fill="none" strokeWidth={2} strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* ── Card Body ── */}
      {open && (
        <div className="sub-card__body">
          <div className="sub-card__layout">

            {/* Left column: GPS map + thumbnails */}
            <div className="sub-card__left">
              <GpsMiniMap points={gpsPoints} />
              {attachments.length > 0 && (
                <div className="thumb-list">
                  {attachments.map(att => (
                    <div key={att.uid} className="thumb"
                      onClick={() => setImgOpen(proxyUrl(att.download_url))}>
                      <img
                        src={proxyUrl(att.download_small_url)}
                        alt={att.media_file_basename}
                        className="thumb__img"
                        onError={e => { e.target.style.display = "none"; }}
                      />
                      <div className="thumb__label">{att.question_xpath}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right column: field grid */}
            <div className="field-grid">
              {fields.map(([k, v]) => (
                <div key={k} className="field-tile">
                  <div className="field-tile__key">{cleanKey(k)}</div>
                  <div className="field-tile__val">{String(v) || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Crops */}
          {crops.length > 0 && (
            <div className="crops-section">
              <div className="section-label">Crops</div>
              <div className="crops-list">
                {crops.map((c, i) => <CropTag key={i} crop={c} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {imgOpen && (
        <div className="lightbox" onClick={() => setImgOpen(null)}>
          <img src={imgOpen} alt="preview" className="lightbox__img" />
        </div>
      )}
    </div>
  );
}

/* ── Helpers: date grouping ── */
function getSubmissionDate (sub) {
  // Use "today" field (YYYY-MM-DD), fall back to parsing "end"
  if (sub.today) return sub.today;
  if (sub.end) return sub.end.slice(0, 10);
  return "unknown";
}

function formatGroupDate (dateStr) {
  if (dateStr === "unknown") return "Unknown Date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

/* ── Date Group ── */
function DateGroup ({ date, subs, selected, onToggle, onToggleAll, singleOpen }) {
  const [open, setOpen] = useState(true);

  const groupIds = subs.map(s => s._id);
  const allChecked = groupIds.every(id => selected.has(id));
  const someChecked = groupIds.some(id => selected.has(id));

  function handleGroupCheck () {
    if (allChecked) {
      // deselect all in group
      onToggleAll(groupIds, false);
    } else {
      // select all in group
      onToggleAll(groupIds, true);
    }
  }

  return (
    <div className="date-group">
      {/* Group header */}
      <div className="date-group__header">
        <label className="date-group__check-label">
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
            onChange={handleGroupCheck}
          />
        </label>

        <button className="date-group__toggle" onClick={() => setOpen(o => !o)}>
          <span className="date-group__date">{formatGroupDate(date)}</span>
          <span className="date-group__count">{subs.length} submission{subs.length !== 1 ? "s" : ""}</span>
          <svg className={`chevron ${open ? "chevron--open" : ""}`}
            width={16} height={16} viewBox="0 0 24 24"
            fill="none" strokeWidth={2} strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Group rows */}
      {open && (
        <div className="date-group__rows">
          {subs.map(sub => (
            <div key={sub._id} className="sub-row">
              <label className="sub-row__check">
                <input
                  type="checkbox"
                  checked={selected.has(sub._id)}
                  onChange={() => onToggle(sub._id)}
                />
              </label>
              <div className="sub-row__card">
                <SubmissionCard sub={sub} defaultOpen={singleOpen} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Submission List ── */
function SubmissionList ({ submissions, onDownloadXlsx, onDownloadDxf }) {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");

  const toggle = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleGroup = (ids, add) => setSelected(s => {
    const n = new Set(s);
    ids.forEach(id => add ? n.add(id) : n.delete(id));
    return n;
  });

  // Filter
  const filtered = submissions.filter(s => {
    const q = search.toLowerCase();
    return !q ||
      (s.Name || "").toLowerCase().includes(q) ||
      String(s._id).includes(q) ||
      (s.Farmers_ID || "").includes(q);
  });

  // Group by date
  const groups = {};
  filtered.forEach(s => {
    const d = getSubmissionDate(s);
    if (!groups[d]) groups[d] = [];
    groups[d].push(s);
  });

  // Sort group keys
  const sortedDates = Object.keys(groups).sort((a, b) => {
    if (sortBy === "date-desc") return b.localeCompare(a);
    if (sortBy === "date-asc") return a.localeCompare(b);
    return b.localeCompare(a);
  });

  // Sort submissions within each group
  sortedDates.forEach(d => {
    groups[d].sort((a, b) => {
      if (sortBy === "name") return (a.Name || "").localeCompare(b.Name || "");
      if (sortBy === "area") return parseFloat(b.Total_Area_Ha || 0) - parseFloat(a.Total_Area_Ha || 0);
      // default: by end time descending
      return new Date(b.end || b._submission_time) - new Date(a.end || a._submission_time);
    });
  });

  const allIds = filtered.map(s => s._id);
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds));
  const ids = [...selected];
  const totalFiltered = filtered.length;

  return (
    <div className="sub-list">

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <svg className="search-box__icon" width={14} height={14} viewBox="0 0 24 24"
            fill="none" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-box__input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ID…"
          />
        </div>

        <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date-desc">Date: Newest</option>
          <option value="date-asc">Date: Oldest</option>
          <option value="name">Name A–Z</option>
          <option value="area">Area: Largest</option>
        </select>

        <button className="btn btn--ghost" onClick={toggleAll}>
          {allSelected ? "Deselect All" : "Select All"}
        </button>

        <button
          className="btn btn--xlsx"
          onClick={() => onDownloadXlsx(ids)}
          disabled={!ids.length}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          XLSX{ids.length ? ` (${ids.length})` : ""}
        </button>

        <button
          className="btn btn--dxf"
          onClick={() => onDownloadDxf(ids)}
          disabled={!ids.length}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          DXF{ids.length ? ` (${ids.length})` : ""}
        </button>
      </div>

      {/* Count bar */}
      <div className="count-bar">
        <span>{totalFiltered} submission{totalFiltered !== 1 ? "s" : ""} across {sortedDates.length} date{sortedDates.length !== 1 ? "s" : ""}</span>
        {selected.size > 0 && (
          <span className="count-bar__selected">{selected.size} selected</span>
        )}
      </div>

      {/* Grouped by date */}
      {sortedDates.map(date => (
        <DateGroup
          key={date}
          date={date}
          subs={groups[date]}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleGroup}
          singleOpen={totalFiltered === 1}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════
   MAIN PAGE
══════════════════════════════════ */
export default function Home () {
  const [forms, setForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { fetchForms(); }, []);

  async function fetchForms () {
    try {
      setLoadingForms(true);
      const res = await fetch("/api/forms");
      const data = await res.json();
      setForms(data.results || []);
    } catch (e) { console.error(e); alert("Failed to load forms"); }
    finally { setLoadingForms(false); }
  }

  async function fetchSubmissions (uid) {
    try {
      setLoadingSubs(true); setSubmissions([]);
      let all = [], page = 1, hasNext = true;
      while (hasNext) {
        const res = await fetch(`/api/submissions?assetUid=${uid}&page=${page}`);
        const data = await res.json();
        if (!data.results) break;
        all = [...all, ...data.results];
        hasNext = !!data.next; page++;
        setProgress(Math.min(90, all.length % 90));
      }
      setSubmissions(all); setProgress(100);
    } catch (e) { console.error(e); alert("Failed to load submissions"); }
    finally { setLoadingSubs(false); setTimeout(() => setProgress(0), 800); }
  }

  function simulateProgress () {
    setProgress(5);
    const iv = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(iv); return p; } return p + Math.random() * 8; });
    }, 300);
  }

  async function downloadFile (ids, type) {
    try {
      setDownloading(true); simulateProgress();
      const res = await fetch(`/api/process-${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetUid: selectedForm?.uid, ids }),
      });
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob(), url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kobo_export.${type}`; a.click();
      URL.revokeObjectURL(url); setProgress(100);
    } catch (e) { console.error(e); alert("Download failed"); }
    finally { setTimeout(() => { setDownloading(false); setProgress(0); }, 900); }
  }

  const hasSubmissions = !loadingSubs && submissions.length > 0;
  const showProgress = loadingSubs || downloading;

  return (
    <div className="page">
      <div className="ambient" />

      <div className="container">

        {/* ── Header ── */}
        <header className="app-header">
          <div className="app-header__icon">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
              strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </div>
          <div>
            <h1 className="app-header__title">Kobo Processor</h1>
            <p className="app-header__sub">Farm survey data · KoboToolbox integration</p>
          </div>
        </header>

        {/* ── Progress bar ── */}
        {showProgress && (
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* ── Form selector ── */}
        <div className="card">
          <div className="section-label">Select Survey Form</div>
          {loadingForms ? (
            <div className="loading-row">
              <Spinner /> Loading forms…
            </div>
          ) : (
            <select
              className="form-select"
              value={selectedForm?.uid || ""}
              onChange={e => {
                const f = forms.find(f => f.uid === e.target.value);
                setSelectedForm(f);
                if (f) fetchSubmissions(f.uid);
              }}
            >
              <option value="">— choose a form —</option>
              {forms.map(f => (
                <option key={f.uid} value={f.uid}>{f.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Form info pills ── */}
        {selectedForm && (
          <div className="info-pills">
            {[
              { label: "Form", value: selectedForm.name },
              { label: "UID", value: selectedForm.uid },
              { label: "Submissions", value: loadingSubs ? "…" : submissions.length },
            ].map(({ label, value }) => (
              <div key={label} className="info-pill">
                <span className="info-pill__label">{label}</span>
                <span className="info-pill__value">{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading submissions ── */}
        {loadingSubs && (
          <div className="card card--loading">
            <Spinner /> Fetching submissions…
          </div>
        )}

        {/* ── Submission list ── */}
        {hasSubmissions && (
          <SubmissionList
            submissions={submissions}
            onDownloadXlsx={ids => downloadFile(ids, "xlsx")}
            onDownloadDxf={ids => downloadFile(ids, "dxf")}
          />
        )}

        {/* ── Empty state ── */}
        {!loadingSubs && selectedForm && submissions.length === 0 && (
          <div className="card card--empty">
            No submissions found for this form.
          </div>
        )}

      </div>
    </div>
  );
}