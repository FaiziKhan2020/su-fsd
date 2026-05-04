/* global React, ReactDOM, RD2, PIPELINE_DATA */
const { useState: useSA, useMemo: useMA } = React;

function AppV2() {
  const [view, setView] = useSA("home");
  const [openId, setOpenId] = useSA(null);
  const [showNew, setShowNew] = useSA(false);
  const [activePerson, setActivePerson] = useSA(null);
  const [products, setProducts] = useSA(() => PIPELINE_DATA.PRODUCTS);

  // Bookkeeping helpers (in-memory mutations)
  const upd = (id, fn) => {
    setProducts(prev => {
      const next = prev.map(p => p.id === id ? fn(p) : p);
      // also reflect in shared store so derived computations stay in sync
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };
  const promote  = (id) => upd(id, p => ({ ...p, stage: "niche", nicheSubState: "researching", researchingDaysAgo: 0, lastActivity: 0 }));
  const reject   = (id) => upd(id, p => ({ ...p, stage: "killed", lastActivity: 0 }));
  const uploadNiche = (id, { url }) => upd(id, p => ({
    ...p, nicheSubState: "parsed", docUrl: url, docUploadedDaysAgo: 0, lastActivity: 0,
    niche: p.niche || { versions: [], current: null }
  }));
  const decide = (id, who, decision, note) => {
    if (who === "__submitForReview") {
      upd(id, p => ({ ...p, stage: "approval", waitingOn: "chesky", approvals: { chesky: null, joel: null }, lastActivity: 0 }));
      return;
    }
    if (who === "__promote") {
      upd(id, p => ({
        ...p, stage: "build", waitingOn: null, lastActivity: 0,
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
      // If both approve, leave for user to click Promote → Build
      // If anyone rejects, send back to niche with researching sub-state
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
      createdDaysAgo: 0, lastActivity: 0, health: "ok",
    };
    setProducts(prev => {
      const next = [idea, ...prev];
      PIPELINE_DATA.PRODUCTS.length = 0;
      PIPELINE_DATA.PRODUCTS.push(...next);
      return next;
    });
  };

  // Filter products for stage views
  const visibleProducts = useMA(() => {
    if (view.startsWith("stage:")) {
      const sid = view.slice(6);
      return products.filter(p => p.stage === sid);
    }
    return products;
  }, [view, products]);

  const crumbs = useMA(() => {
    if (view === "home") return ["Home"];
    if (view === "inbox") return ["Idea Inbox"];
    if (view === "pipeline") return ["Pipeline"];
    if (view === "people") return activePerson ? ["People", RD2.person(activePerson)?.name] : ["People"];
    if (view === "activity") return ["Activity"];
    if (view === "rules") return ["Rules"];
    if (view.startsWith("stage:")) return ["Pipeline", RD2.stage(view.slice(6))?.label];
    return ["Home"];
  }, [view, activePerson]);

  return (
    <div className="app">
      <RD2.Sidebar view={view} setView={(v) => { setView(v); setActivePerson(null); }} products={products} />
      <div className="main">
        <RD2.TopBar crumbs={crumbs} onNewIdea={() => setShowNew(true)} />
        <div className="content">
          {view === "home" && <RD2.Home onOpen={setOpenId} setView={setView} />}
          {view === "inbox" && <RD2.IdeaInbox products={products} onOpen={setOpenId} onPromote={promote} onReject={reject} />}
          {view === "pipeline" && <RD2.Board products={products.filter(p => p.stage !== "idea")} onOpen={setOpenId} />}
          {view.startsWith("stage:") && <RD2.Board products={visibleProducts} onOpen={setOpenId} />}
          {view === "people" && !activePerson && <RD2.People onPersonClick={setActivePerson} />}
          {view === "people" && activePerson && <RD2.PersonQueue personId={activePerson} onOpen={setOpenId} onBack={() => setActivePerson(null)} />}
          {view === "activity" && <ActivityView onOpen={setOpenId} />}
          {view === "rules" && <RulesView />}
        </div>
      </div>
      {openId && <RD2.Dossier productId={openId} onClose={() => setOpenId(null)}
        onUploadNiche={uploadNiche}
        onDecide={(who, decision, note) => decide(openId, who, decision, note)} />}
      {showNew && <RD2.NewIdeaModal onClose={() => setShowNew(false)} onCreate={createIdea} />}
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
  return (
    <div style={{ padding: 20, maxWidth: 880, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 4px" }}>Notification rules</h1>
      <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>What pings Slack and who. Toggle to test before going live.</div>
      <div className="card">
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Trigger</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Where</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Notify</th>
              <th style={{ textAlign: "left", padding: "10px 8px" }}>Label</th>
              <th style={{ textAlign: "right", padding: "10px 8px" }}>On</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "12px 8px", fontWeight: 500 }}>{r.on}</td>
                <td style={{ padding: "12px 8px", color: "var(--ink-2)" }}>{r.where}</td>
                <td style={{ padding: "12px 8px" }}>
                  {r.notify.map(n => (
                    <span key={n} style={{ display: "inline-block", padding: "2px 7px", marginRight: 4, marginBottom: 2, borderRadius: 4, fontSize: 11.5, fontFamily: "var(--font-mono)", background: n.startsWith("#") ? "var(--info-bg)" : "var(--accent-bg)", color: n.startsWith("#") ? "var(--info)" : "var(--accent)" }}>{n}</span>
                  ))}
                </td>
                <td style={{ padding: "12px 8px", color: "var(--ink-3)", fontSize: 12 }}>{r.label}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppV2 />);
