/* global window, React, RD2 */
// ============================================================
// MULTI-QUOTE INGREDIENT TABLE — used inside CostPassCard.
//
// Data shape (per ingredient):
//   ing.quotes  = [{ id, vendor, packSize, packUnit ('kg'|'g'|'lb'),
//                    moqKg, pricePerKg, leadDays, notes, addedAt }]
//   ing.pickedQuoteId = id of the chosen quote (drives costPerBottle math)
//
// We treat the legacy single-quote fields (pricePerKg, supplier, costPerBottle)
// as a derived view of the picked quote, computed on save. Nothing else needs
// to change — the rest of the app keeps reading the same flat fields.
// ============================================================

const { useState: useMQ, useMemo: useMQM } = React;

// --------- Helpers ---------------------------------------------------
function gramsForBatch(p, doseStr) {
  // Unit-aware: "1500mcg" → 1.5mg, "1g" → 1000mg. Naive digit-strip would
  // treat all of those as the same number, throwing micronutrient quantities off by 1000×.
  const mg = window.CostPassCalc?.doseToMg?.(doseStr) ?? 0;
  const srv = window.CostPassCalc.servingsPerUnit(p) || 30;
  const yieldDec = window.CostPassCalc.resolveYield(p) || 1;
  const batchRaw = p.costPass?.assumptions?.batch || 5000;
  const batch = typeof batchRaw === "number"
    ? batchRaw
    : (() => {
        const m = String(batchRaw || "5000").match(/[\d,]+/);
        return m ? (parseFloat(m[0].replace(/,/g, "")) || 5000) : 5000;
      })();
  return (mg * srv * batch) / 1000 / yieldDec; // grams
}

function kgForBatch(p, doseStr) {
  return gramsForBatch(p, doseStr) / 1000;
}

// Given a quote and the kg we actually need, compute total cost & overhang.
function evaluateQuote(q, needKg) {
  const need = Math.max(0, needKg);
  const moq = Math.max(0, q.moqKg || 0);
  const buyKg = Math.max(need, moq);
  const totalCost = buyKg * (q.pricePerKg || 0);
  const overhangKg = Math.max(0, buyKg - need);
  const overhangPct = need > 0 ? (overhangKg / need) * 100 : 0;
  return { buyKg, totalCost, overhangKg, overhangPct };
}

// --------- Main row -------------------------------------------------
function MultiQuoteIngredientRow({ p, ing, onDecide }) {
  const [expanded, setExpanded] = useMQ(false);
  const [adding, setAdding] = useMQ(false);
  const quotes = ing.quotes || [];
  const picked = quotes.find(q => q.id === ing.pickedQuoteId);
  const needKg = useMQM(() => kgForBatch(p, ing.dose), [p, ing.dose]);

  // Trademark lookup: case-insensitive name match against the catalog.
  // Locked = sole-source brand → vendor dropdown narrows to brand-holder + authorized resellers,
  // and the row gets a 🔒 badge in the header.
  const trademark = useMQM(() => {
    const catalog = window.PIPELINE_DATA?.TRADEMARKED_INGREDIENTS || [];
    const target = String(ing.name || "").toLowerCase();
    return catalog.find(t =>
      target.includes(t.name.toLowerCase()) ||
      t.name.toLowerCase().includes(target)
    ) || null;
  }, [ing.name]);
  const isLocked = !!(trademark && trademark.soleSource);

  // Compute quote evaluations once
  const evalsByQuote = useMQM(() => {
    const m = {};
    quotes.forEach(q => { m[q.id] = evaluateQuote(q, needKg); });
    return m;
  }, [quotes, needKg]);

  // Find the cheapest TOTAL-cost quote (after MOQ) — gold star
  const cheapestId = useMQM(() => {
    if (quotes.length === 0) return null;
    let best = null;
    quotes.forEach(q => {
      const e = evalsByQuote[q.id];
      if (!best || e.totalCost < evalsByQuote[best].totalCost) best = q.id;
    });
    return best;
  }, [quotes, evalsByQuote]);

  const fastestId = useMQM(() => {
    if (quotes.length === 0) return null;
    let best = null;
    quotes.forEach(q => {
      if (!q.leadDays) return;
      if (!best || q.leadDays < quotes.find(x => x.id === best).leadDays) best = q.id;
    });
    return best;
  }, [quotes]);

  const pick = (qid) => {
    onDecide && onDecide("__costPassPickQuote", ing.name, qid);
  };

  const addQuote = (q) => {
    onDecide && onDecide("__costPassAddQuote", ing.name, JSON.stringify(q));
    setAdding(false);
  };

  const removeQuote = (qid) => {
    if (!confirm("Remove this quote?")) return;
    onDecide && onDecide("__costPassRemoveQuote", ing.name, qid);
  };

  const headerOk = !!picked;
  return (
    <div className="mq-ing" style={{
      border: "1px solid var(--line)",
      borderRadius: 8,
      background: "var(--panel)",
      marginBottom: 6,
      overflow: "hidden",
    }}>
      {/* Collapsed header — click to expand */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 12px", cursor: "pointer",
          background: expanded ? "var(--bg-2)" : "transparent",
          borderBottom: expanded ? "1px solid var(--line)" : "none",
        }}
      >
        <div style={{ width: 14, color: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{expanded ? "▾" : "▸"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
            {ing.name}
            {isLocked && (
              <span
                title={`Sole-source — ${trademark.brandHolder ? `brand-holder: ${trademark.brandHolder}` : "trademarked ingredient"}. Vendor selection is restricted to authorized suppliers.`}
                style={{ fontSize: 11, color: "var(--warn)" }}
              >🔒</span>
            )}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            {ing.dose} · {needKg.toFixed(2)} kg / batch · {quotes.length} quote{quotes.length === 1 ? "" : "s"}
            {isLocked && trademark.note && (
              <span style={{ color: "var(--warn)", marginLeft: 8, fontStyle: "italic" }}>{trademark.note}</span>
            )}
            {!isLocked && ing.soleSource && <span style={{ color: "var(--warn)", marginLeft: 8 }}>⚠ sole-source</span>}
          </div>
        </div>
        {headerOk ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "var(--font-mono)" }}>
            <span style={{ padding: "2px 8px", background: "var(--accent-tint, var(--bg-2))", border: "1px solid var(--accent)", borderRadius: 4, color: "var(--accent)", fontWeight: 600 }}>
              {picked.vendor}
            </span>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>${(ing.costPerBottle || 0).toFixed(3)}/btl</span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: "var(--warn)", fontWeight: 500 }}>Needs pick</span>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "10px 12px 12px", background: "var(--bg-1)" }}>
          {quotes.length === 0 ? (
            <div style={{ padding: "12px 4px", fontSize: 12, color: "var(--ink-3)", textAlign: "center", fontStyle: "italic" }}>
              No quotes yet — add the first one below.
            </div>
          ) : (
            <table className="mq-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: "var(--bg-2)" }}>
                  <th style={mqTh}>Pick</th>
                  <th style={mqThL}>Vendor</th>
                  <th style={mqTh}>MOQ (pack)</th>
                  <th style={mqTh}>$/kg</th>
                  <th style={mqTh}>Lead</th>
                  <th style={mqTh}>Buy</th>
                  <th style={mqTh}>$ batch</th>
                  <th style={mqTh}>Overhang</th>
                  <th style={mqThL}>Notes</th>
                  <th style={mqTh}></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => {
                  const e = evalsByQuote[q.id];
                  const isPicked = q.id === ing.pickedQuoteId;
                  const isCheapest = q.id === cheapestId;
                  const isFastest = q.id === fastestId;
                  const heavyOverhang = e.overhangPct > 100;
                  return (
                    <tr key={q.id} style={{
                      background: isPicked ? "var(--accent-tint, oklch(96% 0.03 250))" : "transparent",
                      borderTop: "1px solid var(--line)",
                    }}>
                      <td style={mqTd}>
                        <input
                          type="radio"
                          checked={isPicked}
                          onChange={() => pick(q.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>
                      <td style={mqTdL}>
                        <div style={{ fontWeight: 500 }}>{q.vendor}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                          {isCheapest && <span style={mqBadge("ok")}>$ best</span>}
                          {isFastest && quotes.length > 1 && <span style={mqBadge("info")}>⚡ fast</span>}
                        </div>
                      </td>
                      <td style={mqTdMono}>
                        {(() => {
                          const pack = Number(q.packSize) || 0;
                          const moq = Number(q.moqKg) || 0;
                          const unit = q.packUnit || "kg";
                          if (!pack || !moq) return `${moq}${unit}`;
                          const multiple = moq / pack;
                          // Show "100kg (4×25kg)" only when MOQ is a clean multiple of pack > 1.
                          if (multiple > 1 && Number.isInteger(multiple)) {
                            return <span>{moq}{unit} <span style={{ color: "var(--ink-3)" }}>({multiple}×{pack}{unit})</span></span>;
                          }
                          // MOQ === pack → just show MOQ; supplier ships exactly the drum.
                          return `${moq}${unit}`;
                        })()}
                      </td>
                      <td style={{ ...mqTdMono, fontWeight: 600 }}>${q.pricePerKg}</td>
                      <td style={mqTdMono}>{q.leadDays ? `${q.leadDays}d` : "—"}</td>
                      <td style={mqTdMono}>{e.buyKg.toFixed(1)}kg</td>
                      <td style={{ ...mqTdMono, fontWeight: 600 }}>${e.totalCost.toFixed(0)}</td>
                      <td style={{ ...mqTdMono, color: heavyOverhang ? "var(--warn)" : "var(--ink-3)" }}>
                        {e.overhangPct > 0 ? `+${e.overhangKg.toFixed(1)}kg` : "—"}
                        {heavyOverhang && <div style={{ fontSize: 9.5 }}>⚠ {Math.round(e.overhangPct)}%</div>}
                      </td>
                      <td style={mqTdL}>
                        <span style={{ color: "var(--ink-3)", fontSize: 10.5 }}>{q.notes || ""}</span>
                      </td>
                      <td style={mqTd}>
                        <button
                          onClick={() => removeQuote(q.id)}
                          style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", fontSize: 13 }}
                          title="Remove this quote"
                        >×</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Add-quote form */}
          {adding ? (
            <AddQuoteForm
              onSave={addQuote}
              onCancel={() => setAdding(false)}
              trademark={trademark}
            />
          ) : (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn xs" onClick={() => setAdding(true)}>+ Add quote</button>
              {ing.note && (
                <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontStyle: "italic" }}>{ing.note}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --------- Add-quote inline form -----------------------------------
function AddQuoteForm({ onSave, onCancel, trademark }) {
  const isLocked = !!(trademark && trademark.soleSource);
  // Authorized vendors when locked: brand-holder + authorized resellers, looked up
  // against INGREDIENT_SUPPLIERS so we get display names. Falls back to the catalog id.
  const authorizedVendors = useMQM(() => {
    if (!isLocked) return null;
    const suppliers = window.PIPELINE_DATA?.INGREDIENT_SUPPLIERS || [];
    const ids = [trademark.brandHolder, ...(trademark.authorizedResellers || [])].filter(Boolean);
    return ids.map(id => {
      const s = suppliers.find(s => s.id === id);
      return s ? s.name : id;
    });
  }, [isLocked, trademark]);

  const [vendor, setVendor] = useMQ(isLocked && authorizedVendors?.length ? authorizedVendors[0] : "");
  const [packSize, setPackSize] = useMQ("25");
  const [packUnit, setPackUnit] = useMQ("kg");
  const [moqKg, setMoqKg] = useMQ("25");
  const [pricePerKg, setPricePerKg] = useMQ("");
  const [leadDays, setLeadDays] = useMQ("");
  const [notes, setNotes] = useMQ("");

  const valid = vendor.trim() && parseFloat(pricePerKg) > 0;
  const save = () => {
    if (!valid) return;
    onSave({
      id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      vendor: vendor.trim(),
      packSize: parseFloat(packSize) || 25,
      packUnit: packUnit || "kg",
      moqKg: parseFloat(moqKg) || 0,
      pricePerKg: parseFloat(pricePerKg),
      leadDays: leadDays ? parseInt(leadDays) : null,
      notes: notes.trim(),
      addedAt: Date.now(),
    });
  };

  return (
    <div style={{
      marginTop: 10, padding: 10, background: "var(--bg-2)",
      border: "1px solid var(--accent)", borderRadius: 6,
      fontSize: 11,
    }}>
      {isLocked && (
        <div style={{
          marginBottom: 8, padding: "6px 8px", borderRadius: 4,
          background: "oklch(96% 0.04 80)", border: "1px solid oklch(85% 0.10 80)",
          color: "oklch(40% 0.12 80)", fontSize: 11, display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>🔒</span>
          <span><b>{trademark.name}</b> is sole-source — vendor restricted to brand-holder{authorizedVendors.length > 1 ? " + authorized resellers" : ""}.</span>
        </div>
      )}
      <div style={{
        display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 1fr auto auto", gap: 6, alignItems: "center",
      }}>
      {isLocked && authorizedVendors.length === 1 ? (
        <div style={{ ...mqInput, background: "var(--bg-1)", color: "var(--ink-2)", fontWeight: 500, cursor: "not-allowed" }}>
          {authorizedVendors[0]}
        </div>
      ) : isLocked ? (
        <select
          autoFocus
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          style={{ ...mqInput, fontWeight: 500 }}
        >
          {authorizedVendors.map(v => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          list="suppliers-mq"
          autoFocus
          placeholder="Vendor"
          value={vendor}
          onChange={e => setVendor(e.target.value)}
          style={mqInput}
        />
      )}
      <datalist id="suppliers-mq">
        {(window.PIPELINE_DATA?.INGREDIENT_SUPPLIERS || []).map(s => (
          <option key={s.id} value={s.name} />
        ))}
      </datalist>
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <input
          type="number" step="0.1" placeholder="pack"
          value={packSize}
          onChange={e => setPackSize(e.target.value)}
          style={{ ...mqInput, width: "100%" }}
          title="Pack size (kg)"
        />
        <select
          value={packUnit}
          onChange={e => setPackUnit(e.target.value)}
          style={{ fontSize: 10.5, border: "1px solid var(--line)", borderRadius: 3, padding: "2px 4px", background: "var(--panel)" }}
        >
          <option value="kg">kg</option>
          <option value="lb">lb</option>
          <option value="g">g</option>
        </select>
      </div>
      <input
        type="number" step="0.1" placeholder="MOQ kg"
        value={moqKg}
        onChange={e => setMoqKg(e.target.value)}
        style={mqInput}
        title="Minimum order quantity (kg)"
      />
      <input
        type="number" step="0.01" placeholder="$/kg"
        value={pricePerKg}
        onChange={e => setPricePerKg(e.target.value)}
        style={{ ...mqInput, fontFamily: "var(--font-mono)", fontWeight: 600 }}
      />
      <input
        type="number" step="1" placeholder="lead d"
        value={leadDays}
        onChange={e => setLeadDays(e.target.value)}
        style={mqInput}
      />
      <input
        type="text" placeholder="notes (sample, COA…)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); }}
        style={mqInput}
      />
      <button
        className="btn xs primary"
        disabled={!valid}
        style={!valid ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        onClick={save}
      >Save</button>
      <button className="btn xs" onClick={onCancel}>×</button>
      </div>
    </div>
  );
}

// --------- Style helpers ------------------------------------------
const mqTh = { padding: "6px 6px", fontSize: 10, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center", borderBottom: "1px solid var(--line)" };
const mqThL = { ...mqTh, textAlign: "left" };
const mqTd = { padding: "8px 6px", fontSize: 11.5, textAlign: "center", verticalAlign: "middle" };
const mqTdL = { ...mqTd, textAlign: "left" };
const mqTdMono = { ...mqTd, fontFamily: "var(--font-mono)" };
const mqInput = { padding: "4px 6px", fontSize: 11, border: "1px solid var(--line)", borderRadius: 3, background: "var(--panel)", color: "var(--ink)", width: "100%" };
function mqBadge(tone) {
  const tones = {
    ok: { bg: "oklch(95% 0.06 145)", fg: "oklch(45% 0.15 145)" },
    info: { bg: "oklch(95% 0.05 240)", fg: "oklch(45% 0.15 240)" },
  };
  const t = tones[tone] || tones.info;
  return { fontSize: 9.5, padding: "1px 5px", background: t.bg, color: t.fg, borderRadius: 3, fontWeight: 600 };
}

window.RD2 = Object.assign(window.RD2 || {}, { MultiQuoteIngredientRow });
