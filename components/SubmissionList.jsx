import { memo, useMemo, useState } from "react";
import DateGroup from "./DateGroup";
import { getSubmissionDate } from "@/lib/format";

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return submissions.filter(s =>
      !q ||
      (s.Name || "").toLowerCase().includes(q) ||
      String(s._id).includes(q) ||
      (s.Farmers_ID || "").includes(q)
    );
  }, [submissions, search]);

  const groups = useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      const d = getSubmissionDate(s);
      if (!g[d]) g[d] = [];
      g[d].push(s);
    });
    return g;
  }, [filtered]);

  const sortedDates = useMemo(() => {
    const dates = Object.keys(groups).sort((a, b) => {
      if (sortBy === "date-desc") return b.localeCompare(a);
      if (sortBy === "date-asc") return a.localeCompare(b);
      return b.localeCompare(a);
    });

    dates.forEach(d => {
      groups[d].sort((a, b) => {
        if (sortBy === "name") return (a.Name || "").localeCompare(b.Name || "");
        if (sortBy === "area") return parseFloat(b.Total_Area_Ha || 0) - parseFloat(a.Total_Area_Ha || 0);
        // default: by end time descending
        return new Date(b.end || b._submission_time) - new Date(a.end || a._submission_time);
      });
    });

    return dates;
  }, [groups, sortBy]);

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
          onClick={()=>onDownloadXlsx(ids)}
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
          onClick={()=>onDownloadDxf(ids)}
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

export default memo(SubmissionList);