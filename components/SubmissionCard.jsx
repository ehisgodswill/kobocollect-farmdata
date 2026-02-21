/* eslint-disable @next/next/no-img-element */
const { useState, memo, useMemo } = require("react");
const { default: GpsMiniMap } = require("./GpsMiniMap");
const { default: CropTag } = require("./CropTag");
const { cleanKey, parseGPS, formatDate } = require("@/lib/format");
const { imageProxyUrl } = require("@/lib/image");

const SKIP_KEYS = new Set([
  "_attachments", "FarmBoundary", "__version__", "meta/instanceID",
  "meta/rootUuid", "_uuid", "_xform_id_string", "formhub/uuid",
  "_geolocation", "_tags", "_notes", "_validation_status",
  "_id", "start", "end", "today"
]);


function SubmissionCard ({ sub, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [imgOpen, setImgOpen] = useState(null);

  const collector = sub.Collector_Id || "Unknown";
  const name = sub.Name || "Unknown";
  const id = sub._id;
  const time = formatDate(sub._submission_time);
  const area = sub.Total_Area_Ha ? `${sub.Total_Area_Ha} ha` : null;
  const crops = sub["Crop_information/planted_Crops"] || [];

  const gpsPoints = useMemo(
    () => parseGPS(sub.FarmBoundary),
    [sub.FarmBoundary]
  );
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
                      onClick={() => setImgOpen(imageProxyUrl(att.download_url))}>
                      <img
                        loading="lazy"
                        decoding="async"
                        src={imageProxyUrl(att.download_small_url)}
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

export default memo(SubmissionCard);
