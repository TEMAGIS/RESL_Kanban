import { useEffect, useState } from 'react';
import { INVENTORY_SERVICE, FIELDS, STATUS_COLUMNS, COLUMNS, statusToColumnId } from '../config.js';

// Detail panel for an Inventory item — opened from the ⓘ button on its
// card (see InventoryColumn.jsx). Mirrors the look of the resource
// DetailModal (same .modal-backdrop / .modal / .modal-section chrome)
// but is a single scrolling panel rather than tabs, since there isn't
// enough content here to need them:
//   • Item        — static tag/item/make/model/description.
//   • Current deployment — the linked deployment record (if any), with
//     an editable status select that writes through the exact same
//     date-stamping rules as a drag between status columns, plus a
//     "Return to inventory" action for a record that's stuck showing
//     as deployed from an old mission that was never demobilized.
//   • Mobilizations — every deployment record ever tied to this tag,
//     newest first, so you can see where it's been.

function v(obj, key) {
  if (!key || !obj) return null;
  const x = obj[key];
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s.length ? s : null;
}

function fmtDate(ms) {
  if (ms == null || ms === '') return null;
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(ms) {
  if (ms == null || ms === '') return null;
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Same lookup InventoryColumn.jsx uses for its status pill color.
function accentForStatus(status) {
  const id  = statusToColumnId(status);
  const col = COLUMNS.find((c) => c.id === id);
  return col && col.accent ? col.accent : '#94a3b8';
}

export default function InventoryDetailModal({
  inv,
  deployment,          // current linked deployment record, or null
  mobilizations = [],  // every deployment record for this tag, newest first
  readOnly = false,
  onClose,
  onStatusChange,      // (deployment, newStatus) => Promise
  onReturnToInventory,  // (deployment) => Promise
}) {
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState('');

  // ESC closes the modal — same as the resource DetailModal.
  useEffect(() => {
    if (!inv) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inv, onClose]);

  // Reset transient UI state whenever a different item is opened (or
  // the panel closes), so a stale confirm/error doesn't linger.
  useEffect(() => {
    setConfirmingReturn(false);
    setBusy(false);
    setErr('');
  }, [inv]);

  if (!inv) return null;

  const f   = INVENTORY_SERVICE.fields;
  const tag = v(inv, f.tagNumber);
  const itm = v(inv, f.item);
  const mk  = v(inv, f.make);
  const md  = v(inv, f.model);
  const dsc = v(inv, f.description);

  const depStatus = deployment ? String(deployment[FIELDS.status] || '').trim() : '';
  const isDemob    = !!deployment && depStatus === 'Demobilized';
  const isActive   = !!deployment && !isDemob;
  const statusOptions = STATUS_COLUMNS.map((c) => c.value);

  const handleStatusSelect = async (e) => {
    const val = e.target.value || null;
    setErr('');
    setBusy(true);
    try {
      await onStatusChange(deployment, val);
    } catch (ex) {
      setErr(ex.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    setErr('');
    setBusy(true);
    try {
      await onReturnToInventory(deployment);
      setConfirmingReturn(false);
      onClose();
    } catch (ex) {
      setErr(ex.message || 'Failed to return to inventory');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div>
            <div className="modal-eyebrow muted small">{tag ? `Tag ${tag}` : 'Inventory item'}</div>
            <h2>{itm || 'Inventory item'}</h2>
          </div>
          <div className="modal-header-actions">
            <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <section className="modal-section">
          <h3>Item</h3>
          <dl>
            {itm && <div className="modal-row"><dt>Item</dt><dd>{itm}</dd></div>}
            {mk  && <div className="modal-row"><dt>Make</dt><dd>{mk}</dd></div>}
            {md  && <div className="modal-row"><dt>Model</dt><dd>{md}</dd></div>}
            {dsc && <div className="modal-row"><dt>Description</dt><dd>{dsc}</dd></div>}
            {tag && <div className="modal-row"><dt>Tag</dt><dd>{tag}</dd></div>}
          </dl>
        </section>

        <section className="modal-section">
          <h3>Current deployment</h3>
          {!deployment ? (
            <p className="muted small">Not currently linked to a deployment — drag this item onto an MCC card to deploy it.</p>
          ) : (
            <dl>
              <div className="modal-row">
                <dt>Mission</dt>
                <dd>
                  {v(deployment, FIELDS.missionId) || '—'}
                  {v(deployment, FIELDS.requestNumber) ? ` · #${v(deployment, FIELDS.requestNumber)}` : ''}
                </dd>
              </div>
              <div className="modal-row editable">
                <dt>Status</dt>
                <dd>
                  {onStatusChange ? (
                    <select
                      className="modal-edit-select"
                      value={depStatus}
                      onChange={handleStatusSelect}
                      disabled={busy}
                    >
                      <option value="">Unassigned</option>
                      {statusOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: accentForStatus(depStatus) }}>{depStatus || 'Unassigned'}</span>
                  )}
                  {busy && <span className="muted small modal-edit-status">Saving…</span>}
                </dd>
              </div>
              <div className="modal-row">
                <dt>Mobilized</dt>
                <dd>{fmtDate(deployment[FIELDS.itemMobilization]) || '—'}</dd>
              </div>
              <div className="modal-row">
                <dt>Demobilized</dt>
                <dd>{fmtDate(deployment[FIELDS.itemDemobilization]) || '—'}</dd>
              </div>
              <div className="modal-row">
                <dt>Last edit</dt>
                <dd>{fmtDateTime(deployment[FIELDS.editDate]) || '—'}</dd>
              </div>
            </dl>
          )}

          {isActive && onReturnToInventory && (
            <div className="modal-return-block">
              {!confirmingReturn ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmingReturn(true)}
                  disabled={busy}
                >
                  Return to inventory
                </button>
              ) : (
                <div className="modal-confirm-row">
                  <span className="small">
                    Frees tag {tag || '—'} for redeployment right away. This leaves the record above exactly as it
                    is — its status and dates won't change, and it will <strong>not</strong> be marked Demobilized.
                    Use this when it was really demobilized on some earlier, unrecorded date and today's date
                    would be wrong.
                  </span>
                  <div className="modal-confirm-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmingReturn(false)}
                      disabled={busy}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleReturn}
                      disabled={busy}
                    >
                      {busy ? 'Working…' : 'Confirm return'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {err && <p className="error-text small">{err}</p>}
        </section>

        <section className="modal-section">
          <h3>
            Mobilizations {mobilizations.length > 0 && <span className="tab-count">{mobilizations.length}</span>}
          </h3>
          {mobilizations.length === 0 ? (
            <p className="muted small">No deployment history for this tag.</p>
          ) : (
            <ul className="mobilization-list">
              {mobilizations.map((r) => {
                const oid = r[FIELDS.objectId];
                const st  = v(r, FIELDS.status);
                const line = [
                  fmtDate(r[FIELDS.itemMobilization])   && `Mob ${fmtDate(r[FIELDS.itemMobilization])}`,
                  fmtDate(r[FIELDS.itemDemobilization])  && `Demob ${fmtDate(r[FIELDS.itemDemobilization])}`,
                  fmtDateTime(r[FIELDS.editDate])        && `Last edit ${fmtDateTime(r[FIELDS.editDate])}`,
                ].filter(Boolean).join(' · ');
                return (
                  <li key={oid} className="mobilization-row">
                    <div className="mobilization-row-top">
                      <span className="inventory-pill" style={{ '--pill-color': accentForStatus(st) }}>
                        {st || 'Unassigned'}
                      </span>
                      <span className="muted small">
                        {v(r, FIELDS.missionId) || '—'}
                        {v(r, FIELDS.requestNumber) ? ` · #${v(r, FIELDS.requestNumber)}` : ''}
                      </span>
                    </div>
                    <div className="muted small">{line || '—'}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
