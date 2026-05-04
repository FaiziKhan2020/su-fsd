/* global React, RD2, PIPELINE_DATA */
const { useState: useSW } = React;

function Watchlist() {
  const initial = PIPELINE_DATA.WATCHLIST;
  const [competitors, setCompetitors] = useSW(initial.competitors);
  const [ingredients, setIngredients] = useSW(initial.ingredients);
  const [trends, setTrends]           = useSW(initial.trendKeywords);
  const [tab, setTab]                 = useSW("competitors");
  const [showAdd, setShowAdd]         = useSW(false);

  const onAdd = (entry) => {
    if (tab === "competitors") setCompetitors([{ ...entry, lastChange: 0 }, ...competitors]);
    if (tab === "ingredients") setIngredients([{ ...entry, touchedDays: 0 }, ...ingredients]);
    if (tab === "trends")      setTrends([{ ...entry }, ...trends]);
    setShowAdd(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: 0 }}>Watchlist</h1>
          <div style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 4 }}>
            The outside-the-pipeline radar. Competitors, ingredient supply, trend keywords. Updated nightly.
          </div>
        </div>
        <button className="btn primary" onClick={() => setShowAdd(true)}>+ Add to watchlist</button>
      </div>

      <div className="watchlist-tabs">
        <button className={tab === "competitors" ? "active" : ""} onClick={() => setTab("competitors")}>
          Competitors <span className="mono">{competitors.length}</span>
        </button>
        <button className={tab === "ingredients" ? "active" : ""} onClick={() => setTab("ingredients")}>
          Ingredients <span className="mono">{ingredients.length}</span>
        </button>
        <button className={tab === "trends" ? "active" : ""} onClick={() => setTab("trends")}>
          Trend keywords <span className="mono">{trends.length}</span>
        </button>
      </div>

      {tab === "competitors" && (
        <div className="card">
          <table className="watchlist-table">
            <thead>
              <tr>
                <th>Brand</th><th>Watching</th><th>ASIN</th><th>Price</th><th>Δ 30d</th><th>Note</th><th>Last change</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{c.brand}</td>
                  <td style={{ color: "var(--ink-2)" }}>{c.watching}</td>
                  <td className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{c.asin}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{c.price}</td>
                  <td className={"mono " + ((c.delta || "").startsWith("+") ? "delta-up" : (c.delta || "").startsWith("-") ? "delta-down" : "")}>{c.delta || "—"}</td>
                  <td style={{ color: "var(--ink-2)" }}>{c.note}</td>
                  <td style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.lastChange === 0 ? "just now" : c.lastChange + "d ago"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "ingredients" && (
        <div className="card">
          <table className="watchlist-table">
            <thead>
              <tr><th>Ingredient</th><th>Status</th><th>Note</th><th>Touched</th></tr>
            </thead>
            <tbody>
              {ingredients.map((ing, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{ing.name}</td>
                  <td>
                    <span className={"status-chip status-" + ing.status.toLowerCase().replace(/\s/g, "-")}>{ing.status}</span>
                  </td>
                  <td style={{ color: "var(--ink-2)" }}>{ing.note}</td>
                  <td style={{ fontSize: 11, color: "var(--ink-3)" }}>{ing.touchedDays === 0 ? "just now" : ing.touchedDays + "d ago"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "trends" && (
        <div className="card">
          <table className="watchlist-table">
            <thead>
              <tr><th>Keyword</th><th>Search vol</th><th>Trend</th><th>Status</th></tr>
            </thead>
            <tbody>
              {trends.map((k, i) => {
                const isWhitespace = (k.action || "").startsWith("Whitespace");
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{k.kw}</td>
                    <td className="mono">{k.sv}</td>
                    <td className="mono delta-up">{k.trend}</td>
                    <td>
                      <span className={isWhitespace ? "status-chip whitespace" : "status-chip covered"}>
                        {k.action}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddToWatchlistModal kind={tab} onClose={() => setShowAdd(false)} onAdd={onAdd} />}
    </div>
  );
}

function AddToWatchlistModal({ kind, onClose, onAdd }) {
  const fields = {
    competitors: [
      { k: "brand", label: "Brand", placeholder: "e.g. Sephra" },
      { k: "watching", label: "Watching", placeholder: "e.g. Compact 6\" fountain" },
      { k: "asin", label: "ASIN", placeholder: "B0XXXXXXXX" },
      { k: "price", label: "Price", placeholder: "$129" },
      { k: "delta", label: "Δ 30d", placeholder: "+5%" },
      { k: "note", label: "Note", placeholder: "Why we care" },
    ],
    ingredients: [
      { k: "name", label: "Ingredient", placeholder: "e.g. Madagascar vanilla" },
      { k: "status", label: "Status", placeholder: "OK / Risk / Backorder", options: ["OK", "Risk", "Backorder"] },
      { k: "note", label: "Note", placeholder: "Supply context" },
    ],
    trends: [
      { k: "kw", label: "Keyword", placeholder: "e.g. mini fondue" },
      { k: "sv", label: "Search volume", placeholder: "12k/mo" },
      { k: "trend", label: "Trend", placeholder: "+45%" },
      { k: "action", label: "Status", placeholder: "Whitespace / Covered", options: ["Whitespace — explore", "Covered"] },
    ],
  }[kind];
  const [form, setForm] = useSW({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = fields.every(f => (form[f.k] || "").trim().length > 0);
  const submit = () => { if (valid) onAdd(form); };

  return (
    <div className="dossier-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, width: 460, maxWidth: "92vw", padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Add to watchlist</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: "4px 0 0", letterSpacing: "-0.01em" }}>
              New {kind === "competitors" ? "competitor" : kind === "ingredients" ? "ingredient" : "trend keyword"}
            </h2>
          </div>
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {fields.map(f => (
            <label key={f.k} style={{ gridColumn: f.k === "note" || f.k === "watching" ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{f.label}</span>
              {f.options ? (
                <select value={form[f.k] || ""} onChange={e => set(f.k, e.target.value)} style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--ink)" }}>
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form[f.k] || ""} onChange={e => set(f.k, e.target.value)} placeholder={f.placeholder}
                  style={{ padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", fontSize: 13, fontFamily: "inherit", color: "var(--ink)" }} />
              )}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!valid} style={{ opacity: valid ? 1 : 0.5 }}>Add to watchlist</button>
        </div>
      </div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, { Watchlist });
