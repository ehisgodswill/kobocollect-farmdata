import { formatGroupDate } from "@/lib/format";
import SubmissionCard from "./SubmissionCard";
import { useState } from "react";


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

export default DateGroup;