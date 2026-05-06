/* global React, RD2, PIPELINE_DATA */
// ============================================================
// Global product search — fuzzy match against code, name, brand, synopsis.
// Lives in the topbar. Click a result → opens dossier.
// ============================================================

const { useState: useGS, useMemo: useGSM, useEffect: useGSE, useRef: useGSR } = React;

function ProductSearch({ products, onOpen }) {
  const [q, setQ] = useGS("");
  const [open, setOpen] = useGS(false);
  const [active, setActive] = useGS(0);
  const inputRef = useGSR(null);

  // Cmd/Ctrl-K to focus
  useGSE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useGSM(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const score = (p) => {
      let s = 0;
      const code = (p.code || "").toLowerCase();
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const syn = (p.synopsis || "").toLowerCase();
      const type = (p.type || "").toLowerCase();
      if (code.includes(term)) s += code.startsWith(term) ? 100 : 60;
      if (name.toLowerCase().includes(term)) s += name.toLowerCase().startsWith(term) ? 80 : 40;
      if (brand.includes(term)) s += 30;
      if (type.includes(term)) s += 20;
      if (syn.includes(term)) s += 10;
      // word-boundary boost in name
      if (new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(name)) s += 25;
      return s;
    };
    return products
      .map(p => ({ p, s: score(p) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map(x => x.p);
  }, [q, products]);

  // Reset active when results change
  useGSE(() => { setActive(0); }, [q]);

  const onKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActive(i => Math.max(0, i - 1)); }
    if (e.key === "Enter")     { e.preventDefault(); pick(results[active]); }
  };
  const pick = (p) => {
    if (!p) return;
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
    onOpen?.(p.id);
  };

  return (
    <div className="gs-wrap">
      <div className="gs-input-wrap">
        <span className="gs-icon">⌕</span>
        <input
          ref={inputRef}
          className="gs-input"
          type="text"
          placeholder="Search products by code, name, brand, keyword…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <span className="gs-kbd mono">⌘K</span>
      </div>
      {open && q.trim() && (
        <>
          <div className="gs-overlay" onClick={() => setOpen(false)}></div>
          <div className="gs-results">
            {results.length === 0 ? (
              <div className="gs-empty">
                <span style={{ fontSize: 18, opacity: 0.4 }}>·</span>
                <div>No products match "{q}".</div>
              </div>
            ) : (
              <>
                <div className="gs-results-h">
                  {results.length} result{results.length === 1 ? "" : "s"}
                </div>
                {results.map((p, i) => (
                  <button
                    key={p.id}
                    className={`gs-row ${i === active ? "active" : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(p)}>
                    <div className="gs-row-l">
                      <span className="mono gs-row-code">{p.code}</span>
                      <RD2.BrandChip b={p.brand} />
                      <span className="gs-row-name">{p.name}</span>
                    </div>
                    <div className="gs-row-r">
                      <RD2.StagePill stageId={p.stage} />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { ProductSearch });
