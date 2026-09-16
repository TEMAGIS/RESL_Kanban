import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  READYOP_SERVICE, FIELDS, COLUMNS, statusToColumnId,
  readyOpContactName, readyOpDeploymentKey,
} from '../config.js';

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
  deployedByKey,       // Map<string "name|org", current Personnel deployment record>
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
      // Phones/Emails are ReadyOp's own array-shaped fields (see
      // readyOpContactName's neighboring comment in config.js) — pull
      // every number/address in so a card is findable by the same
      // contact info shown on it, not just name/org/title/tags.
      const phones = Array.isArray(c.Phones) ? c.Phones.map((p) => p && p.Number) : [];
      const emails = Array.isArray(c.Emails) ? c.Emails.map((e) => e && e.Address) : [];
      const hay = [
        readyOpContactName(c), c[f.organization], c[f.title], c[f.tags],
        ...phones, ...emails,
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
            const f = READYOP_SERVICE.fields;
            const id = String(c[f.id] ?? '');
            const pending = !!(pendingIds && pendingIds.has(id));
            // Same join used on the Board side (see deployedByReadyOpKey)
            // — no ContactID is stored on the AGOL record, so name+org
            // is the best available link back to "is this person
            // already deployed?".
            const key = readyOpDeploymentKey(readyOpContactName(c), c[f.organization]);
            const deployment = (key !== '|' && deployedByKey) ? deployedByKey.get(key) : null;
            return (
              <ReadyOpCard
                key={id || readyOpContactName(c)}
                contact={c}
                deployment={deployment}
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

// Look up the accent color for a deployment status by translating
// status → column id → COLUMNS entry. Mirrors the same helper in
// InventoryColumn.jsx.
function accentForStatus(status) {
  const id  = statusToColumnId(status);
  const col = COLUMNS.find((c) => c.id === id);
  return col && col.accent ? col.accent : '#94a3b8';
}

function ReadyOpCard({ contact, deployment, readOnly = false, pending = false }) {
  const f     = READYOP_SERVICE.fields;
  const id    = String(contact[f.id] ?? '');
  const name  = readyOpContactName(contact) || '—';
  const org   = v(contact, f.organization);
  const title = v(contact, f.title);
  // Phones is ReadyOp's own array-shaped field on a contact record
  // (see readyopClient.js) — surface the first number, if any, so the
  // card is useful at a glance without opening ReadyOp itself.
  const phone = (contact.Phones && contact.Phones[0] && contact.Phones[0].Number) || null;

  // Deployment context (if any) — mirrors InventoryCard: any
  // non-Demobilized deployment counts as "actively assigned" and
  // locks the card so this person can't be dropped on a second MCC
  // while they're already out.
  const depStatus = deployment ? String(deployment[FIELDS.status] || '').trim() : '';
  const isDemob   = !!deployment && depStatus === 'Demobilized';
  const isActive  = !!deployment && !isDemob;
  const locked    = isActive;
  const pillLabel = deployment ? (depStatus || 'Unassigned') : null;
  const pillColor = deployment ? accentForStatus(depStatus) : null;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   `readyop:${id}`,
    data: { type: 'readyop', item: contact },
    disabled: readOnly || pending || locked,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  };

  const classes = ['card', 'inventory-card', 'readyop-card'];
  if (pending)  classes.push('is-pending');
  if (locked)   classes.push('is-locked');
  if (isDemob)  classes.push('is-demob');

  let dragTitle;
  if (pending)    dragTitle = 'Assigning — please wait…';
  else if (locked) dragTitle = `Already deployed (${pillLabel}) — demobilize first to reassign`;
  else            dragTitle = 'Drag onto an MCC card to assign this person';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classes.join(' ')}
      title={dragTitle}
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
          {pillLabel && (
            <div
              className="inventory-pill"
              style={{
                '--pill-color': pillColor,
              }}
              aria-label={`Currently ${pillLabel}`}
            >
              {locked && <span className="inventory-pill-lock" aria-hidden="true">🔒</span>}
              {pillLabel}
            </div>
          )}
        </div>
      </div>
      {pending && <div className="card-pending">Assigning…</div>}
    </div>
  );
}
