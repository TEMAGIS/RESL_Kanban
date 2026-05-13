import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { COLUMNS, FIELDS, statusToColumnId } from '../config.js';

export default function Card({ r, pending = false, dragging = false, readOnly = false, onShowDetail }) {
  if (dragging) return <CardView r={r} pending={pending} dragging />;
  return <DraggableCard r={r} pending={pending} readOnly={readOnly} onShowDetail={onShowDetail} />;
}

function DraggableCard({ r, pending, readOnly, onShowDetail }) {
  const oid = r[FIELDS.objectId];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(oid),
    disabled: readOnly,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };
  return (
    <CardView
      r={r}
      pending={pending}
      style={style}
      forwardRef={setNodeRef}
      handleProps={{ ...attributes, ...listeners }}
      onShowDetail={onShowDetail}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────
const v = (r, k) => {
  if (!k) return null;
  const x = r[k];
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s.length ? s : null;
};

// Status values for active (in-progress) deployments. A card in one of
// these statuses with no recent edit gets the 'stale' (amber) tier.
const ACTIVE_DEPLOYMENT_STATUSES = ['On Scene', 'En Route', 'Staged', 'On Hold'];
const STALE_HOURS = 72;          // tweak to taste

// Returns { text, tier } where:
//   tier = 'hour'  — edited in the last 60 min   (blue + pulse)
//   tier = 'today' — edited since local midnight (light blue)
//   tier = 'stale' — active deployment but not edited in 72+ hours (amber)
//   tier = null    — anything else (no highlight)
function describeEditDate(ms, status) {
  const isActive = ACTIVE_DEPLOYMENT_STATUSES.includes(status);
  const n = ms == null || ms === '' ? NaN : Number(ms);
  const valid = Number.isFinite(n) && n > 0;

  // No edit date AND actively deployed → that's stale (and unusual)
  if (!valid) {
    return isActive
      ? { text: 'No updates', tier: 'stale' }
      : { text: null, tier: null };
  }

  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return { text: null, tier: null };

  const now = Date.now();
  const minutesAgo = Math.floor((now - n) / 60000);
  const hoursAgo   = minutesAgo / 60;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isToday = n >= startOfToday.getTime();

  const t = d
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .replace(' AM', 'a').replace(' PM', 'p');

  if (minutesAgo < 1)  return { text: 'Just now',              tier: 'hour'  };
  if (minutesAgo < 60) return { text: `${minutesAgo} min ago`, tier: 'hour'  };
  if (isToday)         return { text: `Today · ${t}`,          tier: 'today' };

  const mdy = d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
  const formatted = `${mdy} ${t}`;

  // Stale ONLY for active deployments — terminal statuses (Demobilized,
  // Canceled) don't need to look stale.
  if (isActive && hoursAgo >= STALE_HOURS) {
    return { text: formatted, tier: 'stale' };
  }
  return { text: formatted, tier: null };
}

// Given a row, return { qtyLine, nameLine } describing its quantity and
// resource name. Mirrors the previous TEMA dashboard format:
//   "Equipment: 14" / "Personnel: 10" with the type-name on a second line.
function describeResource(r) {
  const kind   = (v(r, FIELDS.kind) || '').toLowerCase();
  const equipN = v(r, FIELDS.equipmentName) || v(r, FIELDS.equipmentType);
  const equipQ = v(r, FIELDS.equipmentCount) || v(r, FIELDS.qtyItem);
  const teamN  = v(r, FIELDS.identifier) || v(r, FIELDS.teamKind);
  const persQ  = v(r, FIELDS.personnelCount);
  const itemN  = v(r, FIELDS.item) || v(r, FIELDS.tagNumber);
  const itemQ  = v(r, FIELDS.qtyItem);
  const fallbk = v(r, FIELDS.resourceMain) || v(r, FIELDS.resourceType);

  // 1) Tagged inventory: item + qty_item, when present
  if (itemN && itemQ) return { qtyLine: `Item: ${itemQ}`, nameLine: itemN };

  // 2) Equipment — "Equipment: N" with the equipment name below.
  if (kind.includes('equip') || equipN || equipQ) {
    const n = equipQ != null ? parseInt(equipQ, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return { qtyLine: `Equipment: ${n}`, nameLine: equipN || fallbk };
    }
    return { qtyLine: 'Equipment', nameLine: equipN || fallbk };
  }

  // 3) Team / Personnel — "Personnel: N" with the team kind below.
  if (kind.includes('team') || teamN || persQ) {
    const n = persQ != null ? parseInt(persQ, 10) : NaN;
    if (Number.isFinite(n) && n > 0) {
      return { qtyLine: `Personnel: ${n}`, nameLine: teamN || fallbk };
    }
    return { qtyLine: 'Team', nameLine: teamN || fallbk };
  }

  // 4) Fallback
  return { qtyLine: '', nameLine: fallbk || itemN || equipN || teamN || '' };
}

// Pick a contrasting text color for a given background hex. Uses
// luminance — bright backgrounds (yellow, light gray) get black text;
// dark backgrounds get white text. Threshold tuned for the COLUMNS
// palette so each status pill stays readable.
function pickTextColor(bg) {
  if (!bg || typeof bg !== 'string') return '#fff';
  const hex = bg.replace('#', '');
  if (hex.length < 6) return '#fff';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#111827' : '#ffffff';
}

// Look up the accent color for the column a given status belongs to.
function statusAccent(status) {
  const id = statusToColumnId(status);
  const col = COLUMNS.find((c) => c.id === id);
  return col ? col.accent : '#94a3b8';
}

// ─── Render ────────────────────────────────────────────────────────────
function CardView({ r, pending, style, dragging = false, forwardRef, handleProps = {}, onShowDetail }) {
  const oid       = r[FIELDS.objectId];
  const reqNum    = v(r, FIELDS.requestNumber);
  const county    = v(r, FIELDS.county);
  const edit      = describeEditDate(r[FIELDS.editDate], r[FIELDS.status]);
  const entity    = v(r, FIELDS.entity);
  const esf       = v(r, FIELDS.esf);
  const status    = v(r, FIELDS.status);
  const address   = v(r, 'address_geo_rpt');
  const { qtyLine, nameLine } = describeResource(r);
  const statusBg  = status ? statusAccent(status) : null;
  const statusFg  = status ? pickTextColor(statusBg) : null;

  // Click handler that explicitly does NOT propagate to the dnd-kit
  // listeners on the card root — otherwise the click might be swallowed
  // by drag detection.
  const handleDetailClick = (e) => {
    e.stopPropagation();
    onShowDetail && onShowDetail(r);
  };
  // Block pointerdown so dnd-kit doesn't even start tracking a drag
  // when the user is just trying to tap the info button.
  const swallowDown = (e) => e.stopPropagation();

  return (
    <div
      ref={forwardRef}
      style={style}
      className={`card${dragging ? ' is-dragging' : ''}${pending ? ' is-pending' : ''}${edit.tier ? ` is-${edit.tier === 'stale' ? 'stale' : `fresh-${edit.tier}`}` : ''}`}
      {...handleProps}
    >
      {onShowDetail && !dragging && (
        <button
          type="button"
          className="card-info-btn"
          onPointerDown={swallowDown}
          onMouseDown={swallowDown}
          onTouchStart={swallowDown}
          onClick={handleDetailClick}
          title="Show details"
          aria-label="Show details"
        >
          ⓘ
        </button>
      )}
      <div className="card-grid">
        <div className="card-left">
          <div className="card-title">{reqNum ? `#${reqNum}` : '—'}</div>
          {county && <div className="card-county">{county} County</div>}
          {edit.text && (
            <div className={`card-updated small${edit.tier ? ` is-${edit.tier === 'stale' ? 'stale' : `fresh-${edit.tier}`}` : ' muted'}`}>
              {edit.tier === 'hour'  && <span className="fresh-dot" aria-hidden="true" />}
              {edit.tier === 'stale' && <span className="stale-dot" aria-hidden="true" />}
              Updated {edit.text}
            </div>
          )}
        </div>
        <div className="card-right">
          {qtyLine && <div className="card-qty">{qtyLine}</div>}
          {nameLine && <div className="card-name">{nameLine}</div>}
          {entity && <div className="card-entity muted small">{entity}</div>}
          {address && <div className="card-address muted small">{address}</div>}
          {status && (
            <span
              className="card-status-pill"
              style={{ background: statusBg, color: statusFg }}
            >
              {status}
            </span>
          )}
        </div>
      </div>
      <div className="card-footer">
        {esf     && <span className="card-chip">ESF · {esf}</span>}
        {pending && <span className="card-pending">Saving…</span>}
      </div>
    </div>
  );
}
