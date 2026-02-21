import { useMemo, useState, useCallback } from "react";

/**
 * rows = [{ _id, start, _submission_time, ... }]
 */
export default function GroupedSubmissionSelector ({
  rows = [],
  onDownloadXlsx,
  onDownloadDxf,
}) {
  const [selected, setSelected] = useState(new Set());

  // ✅ group by start date (memoized)
  const grouped = useMemo(() => {
    const acc = {};
    for (const row of rows) {
      const date = row.start?.split("T")[0] || "Unknown";
      if (!acc[date]) acc[date] = [];
      acc[date].push(row);
    }
    return acc;
  }, [rows]);

  // ✅ toggle single
  const toggleOne = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ✅ toggle group
  const toggleGroup = useCallback((groupRows) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = groupRows.map((r) => r._id);
      const allSelected = ids.every((id) => next.has(id));

      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }

      return next;
    });
  }, []);

  // ✅ select all
  const selectAll = () => {
    const allIds = rows.map((r) => r._id);
    setSelected(new Set(allIds));
  };

  // ✅ clear all
  const clearAll = () => setSelected(new Set());

  // ✅ payload builder
  const handleDownload = (type) => {
    const ids = Array.from(selected);
    if (!ids.length) return alert("Select at least one submission");

    if (type === "xlsx") onDownloadXlsx(ids);
    if (type === "dxf") onDownloadDxf(ids);
  };

  const totalSelected = selected.size;

  return (
    <div className="grouped-wrapper">
      {/* Header */}
      <div className="toolbar">
        <div className="left">
          <strong>{totalSelected}</strong> selected
        </div>

        <div className="right">
          <button onClick={selectAll}>Select All</button>
          <button onClick={clearAll}>Clear</button>
          <button className="primary" onClick={() => handleDownload("xlsx")}>
            Download XLSX
          </button>
          <button className="primary" onClick={() => handleDownload("dxf")}>
            Download DXF
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="groups">
        {Object.entries(grouped).map(([date, groupRows]) => {
          const groupIds = groupRows.map((r) => r._id);
          const selectedCount = groupIds.filter((id) =>
            selected.has(id)
          ).length;

          const allSelected = selectedCount === groupRows.length;

          return (
            <div key={date} className="group-card">
              {/* Group header */}
              <div className="group-header">
                <label>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => toggleGroup(groupRows)}
                  />
                  <span className="date">{date}</span>
                </label>

                <span className="count">
                  {selectedCount}/{groupRows.length}
                </span>
              </div>

              {/* Rows */}
              <div className="rows">
                {groupRows.map((row) => (
                  <label key={row._id} className="row">
                    <input
                      type="checkbox"
                      checked={selected.has(row._id)}
                      onChange={() => toggleOne(row._id)}
                    />
                    <span className="id">{row._id}</span>
                    <span className="time">
                      {row._submission_time?.replace("T", " ") || ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}