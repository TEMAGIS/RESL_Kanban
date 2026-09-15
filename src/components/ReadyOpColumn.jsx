import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { READYOP_SERVICE, readyOpContactName } from '../config.js';

// Optional column — only rendered when `?readyop=1` is in the URL (see
// readUrlReadyOp / disabledColumnIds in Board.jsx and the README's URL
// parameter table). Lists the ReadyOp contact roster. Mirrors
// InventoryColumn: items are read-only here and draggable onto an MCC
// card; the drop creates a new Personnel deployment with the contact's
// name / organization / title copied across (see
// createDeploymentFromReadyOpUser in service.js).
export default function ReadyOpColumn({
  label,
  accent,
  items = [],
  loading = false,
  readOnly = false,
  pendingIds,          // Set<string> of ReadyOp ContactIDs currently being assigned
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const f = READYOP_SERVICE.fields;
    return items.filter((c) => {
      const hay = [
        readyOpContactName(c), c[f.organization], c[f.title], c[f.tags],
      ].map((x) => (x == null ? '' : String(x).toLowerCase())).join(' ');
      return hay.includes(q);
    });
  }, [items, query]);

  return (
    <div className="column is-static is-readyop" style={{ '--column-accent': accent }}>
      <header className="column-header">
        <span className="column-dot" />
        <span className="column-label">{label}</span>
        <span className="column-count">{items.length}</span>
      </header>
      <div className="column-toolbar">
        <input
          type="search"
          className="inventory-search"
          placeholder={`Search ${items.length} user${items.length === 1 ? '' : 's'}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="column-body">
        {loading && items.length === 0 ? (
          <div className="empty-hint">Loading ReadyOp users…</div>
        ) : items.length === 0 ? (
          <div className="empty-hint">No ReadyOp users available.</div>
        ) : filtered.length === 0 ? (
          <div className="empty-hint">No matches for "{query}".</div>
        ) : (
          filtered.map((c) => {
            const id = String(c[READYOP_SERVICE.fields.id] ?? '');
            const pending = !!(pendingIds && pendingIds.has(id));
            return (
              <ReadyOpCard
                key={id || readyOpContactName(c)}
                contact={c}
                readOnly={readOnly}
                pending={pending}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper: trim + null-safe stringify.
const v = (obj, key) => {
  if (!key) return null;
  const x = obj[key];
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s.length ? s : null;
};

function ReadyOpCard({ contact, readOnly = false, pending = false }) {
  const f     = READYOP_SERVICE.fields;
  const id    = String(contact[f.id] ?? '');
  const name  = readyOpContactName(contact) || '—';
  const org   = v(contact, f.organization);
  const title = v(contact, f.title);
  // Phones is ReadyOp's own array-shaped field on a contact record
  // (see readyopClient.js) — surface the first number, if any, so the
  // card is useful at a glance without opening ReadyOp itself.
  const phone = (contact.Phones && contact.Phones[0] && contact.Phones[0].Number) || null;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   `readyop:${id}`,
    data: { type: 'readyop', item: contact },
    disabled: readOnly || pending,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  const classes = ['card', 'inventory-card', 'readyop-card'];
  if (pending) classes.push('is-pending');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes.join(' ')}
      title={pending ? 'Assigning — please wait…' : 'Drag onto an MCC card to assign this person'}
      {...attributes}
      {...listeners}
    >
      <div className="card-grid">
        <div className="card-left">
          <div className="card-title">{name}</div>
          {(title || org) && (
            <div className="card-county muted small">
              {[title, org].filter(Boolean).join(' · ')}
            </div>
          )}
          {phone && <div className="card-county muted small">{phone}</div>}
        </div>
      </div>
      {pending && <div className="card-pending">Assigning…</div>}
    </div>
  );
}
