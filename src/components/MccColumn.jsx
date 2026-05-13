import { MCC_SERVICE } from '../config.js';

// Same forgiving formatter as DetailModal — handles epoch ms AND ISO
// date strings (some MCC date fields are stored as strings).
function fmtDateTime(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  const d2 = new Date(String(v));
  if (!Number.isNaN(d2.getTime())) return d2.toLocaleString();
  return String(v);
}

// MCC column — source of deployments. Not a drag-drop target. Cards
// render basic MCC info and open a read-only popup when clicked.
export default function MccColumn({ label, accent, mccs, onShowDetail }) {
  return (
    <div className="column is-static" style={{ '--column-accent': accent }}>
      <header className="column-header">
        <span className="column-dot" />
        <span className="column-label">{label}</span>
        <span className="column-count">{mccs.length}</span>
      </header>
      <div className="column-body">
        {mccs.length === 0 ? (
          <div className="empty-hint">No MCC requests for this mission.</div>
        ) : (
          mccs.map((m) => (
            <MccCard
              key={m[MCC_SERVICE.fields.objectId] ?? m[MCC_SERVICE.fields.globalId]}
              m={m}
              onClick={() => onShowDetail && onShowDetail(m)}
            />
          ))
        )}
      </div>
    </div>
  );
}

const v = (m, k) => {
  if (!k) return null;
  const x = m[k];
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s.length ? s : null;
};

function MccCard({ m, onClick }) {
  const f = MCC_SERVICE.fields;
  const mccNum   = v(m, f.mccNumber);
  const subject  = v(m, f.subject);
  const type     = v(m, f.type);
  const priority = v(m, f.priority);
  const status   = v(m, f.status);
  const county   = v(m, f.county);
  const poc      = v(m, f.pocName);
  const entry    = fmtDateTime(m[f.entryDate] || m[f.mccCreated] || m[f.creationDate]);
  const edited   = fmtDateTime(m[f.editDate]);

  return (
    <button
      type="button"
      className="card mcc-card"
      onClick={onClick}
    >
      <div className="card-grid">
        <div className="card-left">
          <div className="card-title">{mccNum ? `MCC #${mccNum}` : '—'}</div>
          {county && <div className="card-county">{county} County</div>}
          {status && <div className="card-updated muted small">{status}</div>}
        </div>
        <div className="card-right">
          {type && <div className="card-qty">{type}</div>}
          {subject && <div className="card-name">{subject}</div>}
          {poc && <div className="card-entity muted small">{poc}</div>}
        </div>
      </div>
      {(priority || entry || edited) && (
        <div className="card-footer">
          {priority && <span className="card-chip">Priority · {priority}</span>}
          {entry  && <span className="card-chip">Entered {entry}</span>}
          {edited && <span className="card-chip">Updated {edited}</span>}
        </div>
      )}
    </button>
  );
}
