import { useMemo } from 'react';
import { COLUMNS, MCC_SERVICE } from '../config.js';

// Compute unique non-empty values for a field, sorted alphabetically.
function uniques(rows, key) {
  const set = new Set();
  for (const r of rows) {
    const v = r[key];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

// ─── Main filters row (row 2) ───────────────────────────────────────
//  Dropdowns + Search (flex-extends to the right) + Clear. `lockedFilters`
//  is a Set of filter keys (e.g. {'mission','esf'}) that came from URL
//  parameters at boot — those dropdowns render disabled with a lock
//  marker and are excluded from the active-count and Clear behavior.
export function MainFilters({ resources, mccs = [], filters, onFilters, lockedFilters = new Set(), allowedMissions = null }) {
  // Mission options come from the MCC layer (same source as the
  // post-login mission picker) so missions with MCCs but no deployments
  // still appear here. Resources contribute a defensive union — covers
  // the edge case of a deployment without an MCC.
  const missions = useMemo(() => {
    const incidentIdField = MCC_SERVICE.fields.incidentId;
    const fromMcc       = uniques(mccs, incidentIdField);
    const fromResources = uniques(resources, 'mission_id_rpt');
    const set = new Set([...fromMcc, ...fromResources]);
    let opts = Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
    );
    if (allowedMissions && allowedMissions.length) {
      const allow = new Set(
        allowedMissions.map((s) => String(s).trim().toLowerCase()),
      );
      opts = opts.filter((o) => allow.has(String(o).trim().toLowerCase()));
    }
    return opts;
  }, [mccs, resources, allowedMissions]);
  const esfs     = useMemo(() => uniques(resources, 'coordinator'),    [resources]);
  const counties = useMemo(() => uniques(resources, 'county_rpt'),     [resources]);
  const kinds    = useMemo(() => uniques(resources, 'resource_kind'),  [resources]);

  const set = (patch) => onFilters({ ...filters, ...patch });
  const isLocked = (key) => lockedFilters.has(key);

  // Mission is required (picker enforces it) and isn't counted or
  // cleared — users intentionally choose a mission and shouldn't have
  // it stripped by a generic Clear button.
  const activeCount =
    (filters.esf     && !isLocked('esf')     ? 1 : 0) +
    (filters.county  && !isLocked('county')  ? 1 : 0) +
    (filters.kind    && !isLocked('kind')    ? 1 : 0) +
    (filters.search  ? 1 : 0);

  const clearFilters = () => {
    onFilters({
      ...filters,
      esf:    isLocked('esf')    ? filters.esf    : '',
      kind:   isLocked('kind')   ? filters.kind   : '',
      county: isLocked('county') ? filters.county : '',
      search: '',
    });
  };

  return (
    <div className="main-filters">
      <Select label="Mission"          value={filters.mission} options={missions} onChange={(v) => set({ mission: v })} locked={isLocked('mission')} required />
      <Select label="Coordinating ESF" value={filters.esf}     options={esfs}     onChange={(v) => set({ esf: v })}     locked={isLocked('esf')} />
      <Select label="Kind"             value={filters.kind}    options={kinds}    onChange={(v) => set({ kind: v })}    locked={isLocked('kind')} />
      <Select label="County"           value={filters.county}  options={counties} onChange={(v) => set({ county: v })}  locked={isLocked('county')} />
      <label className="filter-select filter-select--search">
        <span className="muted small">Search</span>
        <input
          className="filter-search"
          type="search"
          placeholder="Tag, item, requestor… (#5 for request)"
          title="Type # followed by a request number (e.g. #5) to search by request number only"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </label>
      {activeCount > 0 && (
        <button className="btn btn-ghost btn-sm clear-btn" onClick={clearFilters}>
          Clear ({activeCount})
        </button>
      )}
    </div>
  );
}

// ─── Sort toggle (toolbar row, between count info and columns) ──────
export function SortToggle({ sortBy, onSortBy }) {
  return (
    <div className="sort-toggle" role="group" aria-label="Sort cards by">
      <span className="muted small">Sort:</span>
      <button
        type="button"
        className={`seg-btn${sortBy === 'updated' ? ' is-on' : ''}`}
        onClick={() => onSortBy('updated')}
        title="Most recently edited at top"
      >
        Updated
      </button>
      <button
        type="button"
        className={`seg-btn${sortBy === 'request' ? ' is-on' : ''}`}
        onClick={() => onSortBy('request')}
        title="Lowest request number at top"
      >
        Request #
      </button>
      <button
        type="button"
        className={`seg-btn${sortBy === 'urgency' ? ' is-on' : ''}`}
        onClick={() => onSortBy('urgency')}
        title="Most overdue for a followup at top; cards with no followup frequency at bottom"
      >
        Urgency
      </button>
    </div>
  );
}

// ─── Column toggles (toolbar row, after sort) ───────────────────────
export function ColumnToggles({ hiddenColumns, disabledColumnIds, onToggleColumn, onResetColumns }) {
  // disabledColumnIds covers columns the URL has marked off-limits
  // (e.g. ?hide_inventory=1) — they're not rendered as toggle chips at
  // all, so an embedded view can't bring them back.
  const visibleColumns = disabledColumnIds && disabledColumnIds.size
    ? COLUMNS.filter((c) => !disabledColumnIds.has(c.id))
    : COLUMNS;
  const anyHidden = hiddenColumns.size > 0;
  return (
    <div className="column-toggles">
      <span className="muted small">Columns:</span>
      {visibleColumns.map((c) => {
        const hidden = hiddenColumns.has(c.id);
        return (
          <button
            key={c.id}
            type="button"
            className={`column-toggle${hidden ? ' is-off' : ''}`}
            style={{ '--toggle-accent': c.accent }}
            onClick={() => onToggleColumn(c.id)}
            title={hidden ? `Show ${c.label}` : `Hide ${c.label}`}
          >
            <span className="column-toggle-dot" />
            {c.label}
          </button>
        );
      })}
      {anyHidden && (
        <button
          type="button"
          className="link-btn"
          onClick={onResetColumns}
          title="Show all columns"
        >
          Show all
        </button>
      )}
    </div>
  );
}

function Select({ label, value, options, onChange, locked = false, required = false }) {
  // When locked (URL parameter), render the value as a wrapping text
  // chip rather than a disabled <select> — selects truncate long values
  // and the user can't see what they're scoped to.
  // When `required`, the empty "All" option is omitted (Mission, post-pick).
  return (
    <label className={`filter-select${locked ? ' is-locked' : ''}`}>
      <span className="muted small">
        {locked && <span className="lock-glyph" aria-hidden="true">🔒 </span>}
        {label}{locked && ' (locked)'}
      </span>
      {locked ? (
        <div className="locked-value" title={value}>{value}</div>
      ) : (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {!required && <option value="">All</option>}
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
    </label>
  );
}
