/* global React, RD2, PIPELINE_DATA */
const { useMemo: useMTF } = React;

// ===== TypeFilterBar =====
// Persistent product-type filter chip rail. Sits under the topbar.
// Click a chip to focus on that type only. Cmd/Ctrl-click to multi-select.
// Click the active chip again (or "All") to clear.
//
// Empty selectedTypes (or null) === all types visible.
function TypeFilterBar({ products, selectedTypes, setSelectedTypes }) {
  const TYPES = PIPELINE_DATA.TYPES;
  // Stable display order — ingestible first, then topical/food.
  const ORDER = ["capsule", "softgel", "liquid", "powder", "gummy", "tea", "cream", "topical", "food"];

  // Per-type counts in the unfiltered universe (excludes killed since they're "archived")
  const counts = useMTF(() => {
    const c = {};
    Object.keys(TYPES).forEach(t => { c[t] = 0; });
    products.forEach(p => {
      if (p.stage === "killed") return; // archive — don't count
      if (c[p.type] !== undefined) c[p.type]++;
    });
    return c;
  }, [products, TYPES]);

  const totalActive = useMTF(() => products.filter(p => p.stage !== "killed").length, [products]);

  const sel = selectedTypes || new Set();
  const isAll = sel.size === 0;

  const toggle = (typeId, e) => {
    const multi = e && (e.metaKey || e.ctrlKey || e.shiftKey);
    const next = new Set(sel);
    if (multi) {
      if (next.has(typeId)) next.delete(typeId); else next.add(typeId);
    } else {
      // Single click — if already the only selected, clear; else focus
      if (next.size === 1 && next.has(typeId)) {
        next.clear();
      } else {
        next.clear();
        next.add(typeId);
      }
    }
    setSelectedTypes(next.size === 0 ? null : next);
  };

  const types = ORDER.filter(t => TYPES[t]);

  return (
    <div className="type-filter-bar">
      <button
        className={`type-chip ${isAll ? "active" : ""}`}
        onClick={() => setSelectedTypes(null)}
        title="Show all product types"
      >
        <span className="type-chip-glyph" style={{ opacity: 0.55 }}>◉◈◍</span>
        <span className="type-chip-label">All</span>
        <span className="type-chip-count">{totalActive}</span>
      </button>
      <div className="type-filter-divider"></div>
      {types.map(tid => {
        const t = TYPES[tid];
        const active = sel.has(tid);
        const dim = !isAll && !active;
        const n = counts[tid] || 0;
        return (
          <button
            key={tid}
            className={`type-chip ${active ? "active" : ""} ${dim ? "dim" : ""}`}
            onClick={(e) => toggle(tid, e)}
            title={`${t.label} — ${n} active${dim ? " (cmd/ctrl-click to add)" : ""}`}
            disabled={n === 0 && !active}
          >
            <span className="type-chip-glyph">{t.glyph}</span>
            <span className="type-chip-label">{t.label}</span>
            <span className="type-chip-count">{n}</span>
          </button>
        );
      })}
      {!isAll && (
        <button
          className="type-chip type-chip-clear"
          onClick={() => setSelectedTypes(null)}
          title="Clear filter"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}

// Helper: filter a product list by selectedTypes set.
// Empty/null selectedTypes returns the input unchanged.
function applyTypeFilter(products, selectedTypes) {
  if (!selectedTypes || selectedTypes.size === 0) return products;
  return products.filter(p => selectedTypes.has(p.type));
}

window.RD2 = Object.assign(window.RD2 || {}, { TypeFilterBar, applyTypeFilter });
