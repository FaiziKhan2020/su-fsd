/* global React, ReactDOM, RD2, PIPELINE_DATA */
const { useState: useSA, useMemo: useMA } = React;

function AppV3() {
  const [view, setView] = useSA("home");
  const [openId, setOpenId] = useSA(null);
  const [openFocus, setOpenFocus] = useSA(null);
  const [showNew, setShowNew] = useSA(false);
  const [rejectingId, setRejectingId] = useSA(null);
  const [activePerson, setActivePerson] = useSA(null);
  const [products, setProducts] = useSA(() => PIPELINE_DATA.PRODUCTS);

  const openProduct = (id, focus = null) => { setOpenId(id); setOpenFocus(focus); };

  const upd = (id, fn) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? fn(p) : p);
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };
  const promote  = (id) => upd(id, p => ({ ...p, stage: "niche", nicheSubState: "researching", researchingDaysAgo: 0, lastActivity: 0, stageAge: 0 }));
  const reject   = (id) => setRejectingId(id);
  const confirmReject = (id, { category, reason }) => upd(id, p => ({
    ...p, stage: "killed", lastActivity: 0, stageAge: 0,
    rejection: { category, reason, by: "chesky", daysAgo: 0 }
  }));
  const uploadNiche = (id, { url }) => upd(id, p => ({
    ...p, nicheSubState: "parsed", docUrl: url, docUploadedDaysAgo: 0, lastActivity: 0,
    niche: p.niche || { versions: [], current: null }
  }));
  const decide = (id, who, decision, note) => {
    if (who === "__submitForReview") {
      upd(id, p => ({ ...p, stage: "approval", waitingOn: "chesky", approvals: { chesky: null, joel: null }, lastActivity: 0, stageAge: 0 }));
      return;
    }
    if (who === "__promote") {
      upd(id, p => ({
        ...p, stage: "build", waitingOn: null, lastActivity: 0, stageAge: 0,
        streams: p.streams || {
          sourcing: { owner: "ronel", status: "Not started", pct: 0, lastNote: "Just kicked off" },
          design:   { owner: "esty",  status: "Not started", pct: 0, lastNote: "Just kicked off" },
          listing:  { owner: "april", status: "Not started", pct: 0, lastNote: "Just kicked off" },
        }
      }));
      return;
    }
    upd(id, p => {
      const next = { ...p, approvals: { ...(p.approvals || {}), [who]: { decision, at: 0, note } }, lastActivity: 0 };
      if (decision === "reject") return { ...next, stage: "niche", nicheSubState: "parsed", waitingOn: null };
      if (decision === "changes") return { ...next, stage: "niche", nicheSubState: "parsed", waitingOn: "malik" };
      return next;
    });
  };
  const createIdea = (form) => {
    const id = "I-" + (310 + products.filter(p => p.id.startsWith("I-")).length);
    const idea = {
      id, code: form.code || form.name.replace(/\s+/g, "").slice(0, 14),
      name: form.name, brand: form.brand, type: form.type, stage: "idea",
      owner: "malik", createdBy: "malik", synopsis: form.synopsis,
      createdDaysAgo: 0, lastActivity: 0, stageAge: 0, health: "ok",
    };
    setProducts(prev => {
      const next = [idea, ...prev];
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };

  const visibleProducts = useMA(() => {
    if (view.startsWith("stage:")) {
      const sid = view.slice(6);
      return products.filter(p => p.stage === sid);
    }
    return products;
  }, [view, products]);

  const crumbs = useMA(() => {
    if (view === "home") return ["Today"];
    if (view === "inbox") return ["Idea Inbox"];
    if (view === "pipeline") return ["Pipeline"];
    if (view === "people") return activePerson ? ["People", RD2.person(activePerson)?.name] : ["People"];
    if (view === "watchlist") return ["Watchlist"];
    if (view === "activity") return ["Activity"];
    if (view === "rules") return ["Rules"];
    if (view.startsWith("stage:")) return ["Pipeline", RD2.stage(view.slice(6))?.label];
    return ["Today"];
  }, [view, activePerson]);

  return (
    <div className="app">
      <RD2.Sidebar view={view} setView={(v) => { setView(v); setActivePerson(null); }} products={products} />
      <div className="main">
        <RD2.TopBar crumbs={crumbs} onNewIdea={() => setShowNew(true)} />
        <div className="content">
          {view === "home" && <RD2.Home onOpen={openProduct} setView={setView} />}
          {view === "inbox" && <RD2.IdeaInbox products={products} onOpen={openProduct} onPromote={promote} onReject={reject} />}
          {view === "pipeline" && <RD2.Board products={products.filter(p => p.stage !== "idea")} onOpen={openProduct} />}
          {view.startsWith("stage:") && view.slice(6) === "idea" && (
            <RD2.IdeaInbox products={products} onOpen={openProduct} onPromote={promote} onReject={reject} />
          )}
          {view.startsWith("stage:") && view.slice(6) !== "idea" && (
            <RD2.StageDashboard stageId={view.slice(6)} products={products} onOpen={openProduct} />
          )}
          {view === "people" && !activePerson && <RD2.People onPersonClick={setActivePerson} />}
          {view === "people" && activePerson && <RD2.PersonQueue personId={activePerson} onOpen={openProduct} onBack={() => setActivePerson(null)} />}
          {view === "watchlist" && <RD2.Watchlist />}
          {view === "activity" && <ActivityView onOpen={openProduct} />}
          {view === "rules" && <RulesView />}
        </div>
      </div>
      {openId && <RD2.Dossier productId={openId} onClose={() => { setOpenId(null); setOpenFocus(null); }}
        focus={openFocus}
        onUploadNiche={uploadNiche}
        onPromote={(id) => { promote(id); setOpenId(null); setOpenFocus(null); }}
        onReject={(id) => { reject(id); /* opens reject modal; dossier stays mounted until confirm */ }}
        onDecide={(who, decision, note) => decide(openId, who, decision, note)} />}
      {showNew && <RD2.NewIdeaModal onClose={() => setShowNew(false)} onCreate={createIdea} />}
      {rejectingId && (
        <RD2.RejectIdeaModal
          product={products.find(p => p.id === rejectingId)}
          onClose={() => setRejectingId(null)}
          onConfirm={(payload) => { confirmReject(rejectingId, payload); setRejectingId(null); setOpenId(null); setOpenFocus(null); }}
        />
      )}
    </div>
  );
}

function ActivityView({ onOpen }) {
  return (
    <div style={{ padding: 20, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 4px" }}>Activity</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>Everything that's happened, freshest first.</div>
      <div className="card">
        <div className="feed">
          {PIPELINE_DATA.ACTIVITY.sort((a, b) => a.ts - b.ts).map((e, i) => {
            const u = RD2.person(e.user);
            const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === e.productId);
            return (
              <div className="feed-row" key={i}>
                <span className="when mono">{RD2.daysAgoLabel(e.ts)}</span>
                <span className="icon">{e.type === "version" ? "⤴" : e.type === "stage" ? "→" : e.type === "alert" ? "!" : e.type === "approval" ? "✓" : "✎"}</span>
                <div className="body">
                  {u && <RD2.Avatar user={u} size="sm" />} <span style={{ fontWeight: 500 }}>{u?.name}</span>
                  <span style={{ color: "var(--ink-2)" }}> {e.text} on </span>
                  <span style={{ color: "var(--accent)", cursor: "pointer", fontWeight: 500 }} onClick={() => onOpen(e.productId)}>{p?.code || e.productId}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RulesView() {
  const [rules, setRules] = useSA(PIPELINE_DATA.RULES);
  const toggle = (id) => setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

  // Generate "would have fired" events per rule from product state + activity
  const triggers = useMA(() => {
    const out = [];
    rules.forEach(r => {
      if (r.id === "approval-stale") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.waitingOn === "chesky" && p.lastActivity >= 1).forEach(p => {
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: p.lastActivity, message: `Approval pending ${p.lastActivity}d on ${p.code}`, channel: r.where, who: r.notify });
        });
      }
      if (r.id === "stage-stuck") {
        PIPELINE_DATA.PRODUCTS.forEach(p => {
          const b = PIPELINE_DATA.CYCLE_BENCHMARKS[p.stage];
          if (b && (p.stageAge || 0) > b.target + 3) {
            out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: 0, message: `${p.code} is ${p.stageAge - b.target}d over ${b.label}`, channel: r.where, who: r.notify });
          }
        });
      }
      if (r.id === "stream-backorder") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.streams).forEach(p => {
          Object.entries(p.streams).forEach(([k, s]) => {
            if (s.status === "Backorder" || s.status === "Stuck") {
              out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: p.lastActivity, message: `${k} stream ${s.status} on ${p.code}: ${s.lastNote}`, channel: r.where, who: r.notify });
            }
          });
        });
      }
      if (r.id === "version-published") {
        PIPELINE_DATA.ACTIVITY.filter(e => e.type === "version" && e.ts < 5).forEach(e => {
          const p = PIPELINE_DATA.PRODUCTS.find(x => x.id === e.productId);
          if (!p) return;
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: e.ts, message: `${e.text} on ${p.code}`, channel: r.where, who: r.notify });
        });
      }
      if (r.id === "idea-aged") {
        PIPELINE_DATA.PRODUCTS.filter(p => p.stage === "idea" && p.createdDaysAgo >= 5).forEach(p => {
          out.push({ rule: r, productId: p.id, code: p.code, name: p.name, daysAgo: 0, message: `Idea ${p.code} aged ${p.createdDaysAgo}d without triage`, channel: r.where, who: r.notify });
        });
      }
    });
    return out.sort((a, b) => a.daysAgo - b.daysAgo);
  }, [rules]);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 4px" }}>Notification rules</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>What pings Slack and who. The right side shows what would have fired in the last 7 days — flip rules on once they look right.</div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="card">
          <div className="card-h"><h3>Rules</h3><span className="meta">{rules.filter(r => r.enabled).length}/{rules.length} live</span></div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Trigger</th>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Where</th>
                <th style={{ textAlign: "left", padding: "10px 8px" }}>Notify</th>
                <th style={{ textAlign: "right", padding: "10px 8px" }}>Fired</th>
                <th style={{ textAlign: "right", padding: "10px 8px" }}>On</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const count = triggers.filter(t => t.rule.id === r.id).length;
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 500 }}>{r.on}<div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{r.label}</div></td>
                    <td style={{ padding: "12px 8px", color: "var(--ink-2)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{r.where}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {r.notify.map(n => (
                        <span key={n} style={{ display: "inline-block", padding: "2px 7px", marginRight: 4, marginBottom: 2, borderRadius: 4, fontSize: 11.5, fontFamily: "var(--font-mono)", background: n.startsWith("#") ? "var(--info-bg)" : "var(--accent-bg)", color: n.startsWith("#") ? "var(--info)" : "var(--accent)" }}>{n}</span>
                      ))}
                    </td>
                    <td style={{ padding: "12px 8px", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: count > 0 ? (r.enabled ? "var(--ok)" : "var(--ink-2)") : "var(--ink-3)" }}>{count}×</td>
                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      <button onClick={() => toggle(r.id)} style={{
                        width: 36, height: 20, borderRadius: 10, border: 0, cursor: "pointer",
                        background: r.enabled ? "var(--ok)" : "var(--bg-3)", position: "relative"
                      }}>
                        <span style={{
                          position: "absolute", top: 2, left: r.enabled ? 18 : 2,
                          width: 16, height: 16, borderRadius: 8, background: "white",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                        }}></span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="card-h"><h3>What would have fired · last 7d</h3><span className="meta">{triggers.length} events</span></div>
          <div style={{ overflow: "auto", maxHeight: 580 }}>
            {triggers.length === 0 && <div className="empty" style={{ padding: 30, textAlign: "center" }}>Nothing — pipeline is calm.</div>}
            {triggers.map((t, i) => (
              <div key={i} style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "auto 1fr", gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", whiteSpace: "nowrap", paddingTop: 2 }}>{RD2.daysAgoLabel(t.daysAgo)}</span>
                <div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                    {t.who.map(n => (
                      <span key={n} style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10.5, fontFamily: "var(--font-mono)", background: n.startsWith("#") ? "var(--info-bg)" : "var(--accent-bg)", color: n.startsWith("#") ? "var(--info)" : "var(--accent)" }}>{n}</span>
                    ))}
                    {!t.rule.enabled && <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, background: "var(--bg-3)", color: "var(--ink-3)" }}>silent</span>}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ink)" }}>{t.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppV3 />);
