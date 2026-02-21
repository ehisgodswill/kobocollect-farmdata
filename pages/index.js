import { generateExcel } from "@/lib/excelProcessor";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import Spinner from "@/components/Spinner";
import SubmissionList from "@/components/SubmissionList";


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

  function simulateProgress (time) {
    setProgress(5);
    const iv = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(iv); return p; } return Math.round( p + Math.random() * 7); });
    }, 300);
  }

  async function downloadDxf (ids) {
    try {
      setDownloading(true);
      simulateProgress(ids.length);
      const res = await fetch(`/api/process-dxf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetUid: selectedForm?.uid, ids }),
      });
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob(), url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `kobo_export.dxf`; a.click();
      URL.revokeObjectURL(url); setProgress(100);
    } catch (e) { console.error(e); alert("Download failed"); }
    finally { setTimeout(() => { setDownloading(false); setProgress(0); }, 900); }
  }

  async function downloadXlsx(ids) {
    if (!ids || ids.length === 0) {
      alert("No rows selected for download");
      return;
    }

    const selectedRows = submissions.filter(row => ids.includes(row._id));
    if (selectedRows.length === 0) {
      alert("Selected rows not found");
      return;
    }

    try {
      setDownloading(true);
      setProgress(0);

      const buffer = await generateExcel(selectedRows, setProgress);

      const blob = buffer instanceof Blob
        ? buffer
        : new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

      saveAs(blob, "kobo_export.xlsx");
      setProgress(100);
    } catch (e) {
      console.error(e);
      alert("Download failed");
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
      }, 900);
    }
  }
  const hasSubmissions = !loadingSubs && submissions.length > 0;
  const showProgress = loadingSubs || downloading;
  const overlayLabel = downloading ? "Processing…" : loadingSubs ? "Fetching submissions…" : null;

  return (
    <div className="page">
      <div className="ambient" />

      {/* ── Full-screen overlay ── */}
      {overlayLabel && (
        <div className="overlay">
          <div className="overlay__box">
            <svg className="overlay__spinner" width={40} height={40} viewBox="0 0 24 24"
              fill="none" strokeWidth={2} strokeLinecap="round">
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span className="overlay__label">{overlayLabel}  {progress}%</span>
            {showProgress && (
              <div className="overlay__track">
                <div className="overlay__fill" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

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
            <h1 className="app-header__title">Kobo Form Processor</h1>
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
            onDownloadXlsx={downloadXlsx}
            onDownloadDxf={downloadDxf}
          />
        )}

        {!loadingSubs && selectedForm && submissions.length === 0 && (
          <div className="card card--empty">
            No submissions found for this form.
          </div>
        )}

      </div>
    </div>
  );
}