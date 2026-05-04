/* global React, ReactDOM, RD, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect */
const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "density": "cozy",
    "showAI": true
  }/*EDITMODE-END*/);

  useEffectApp(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  const [view, setView] = useStateApp("home");
  const [openId, setOpenId] = useStateApp(null);
  const [typeFilter, setTypeFilter] = useStateApp(null);

  const products = PIPELINE_DATA.products;
  const openP = openId && products.find(p => p.id === openId);

  // Filter logic
  const filtered = useMemoApp(() => {
    let list = products;
    if (typeFilter) list = list.filter(p => p.type === typeFilter);
    if (view.startsWith("stage:")) {
      const sid = view.split(":")[1];
      list = list.filter(p => p.stage === sid);
    }
    return list;
  }, [view, products, typeFilter]);

  const onOpen = (id) => setOpenId(id);
  const onBack = () => setOpenId(null);

  let content, crumbs = ["R&D"];
  if (openP) {
    content = <RD.Dossier p={openP} onBack={onBack} />;
    crumbs = ["R&D", RD.stage(openP.stage)?.label, openP.id];
  } else if (view === "home") {
    content = <RD.HomeView onOpen={onOpen} setView={setView} />;
    crumbs = ["R&D", "Home"];
  } else if (view === "board") {
    content = <RD.Board products={filtered} onOpen={onOpen} />;
    crumbs = ["R&D", "Pipeline"];
  } else if (view === "table") {
    content = <RD.ProductsTable products={filtered} onOpen={onOpen} />;
    crumbs = ["R&D", "All products"];
  } else if (view === "dashboard") {
    content = <RD.Dashboard products={products} onOpen={onOpen} />;
    crumbs = ["R&D", "Dashboard"];
  } else if (view === "activity") {
    content = <RD.ActivityView onOpen={onOpen} />;
    crumbs = ["R&D", "Activity"];
  } else if (view === "rules") {
    content = <RD.RulesView />;
    crumbs = ["R&D", "Automation", "Rules"];
  } else if (view === "slack") {
    content = <RD.SlackFeed onOpen={onOpen} />;
    crumbs = ["R&D", "Automation", "Slack feed"];
  } else if (view === "ai") {
    content = (
      <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", marginBottom: 8 }}>Pipeline AI</div>
        <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 16 }}>Ask anything about the pipeline. Drafts, summaries, risk flags, niche analyses in your voice.</div>
        <RD.AIPanel p={null} />
      </div>
    );
    crumbs = ["R&D", "Pipeline AI"];
  } else if (view.startsWith("stage:")) {
    const sid = view.split(":")[1];
    content = <RD.Board products={filtered} onOpen={onOpen} />;
    crumbs = ["R&D", "Stage", RD.stage(sid)?.label];
  }

  return (
    <div className="app" data-density={tweaks.density} data-fullscreen={openP ? "1" : "0"}>
      {!openP && <RD.Sidebar view={view} setView={(v) => { setView(v); setOpenId(null); }} onSelect={onOpen} products={products} typeFilter={typeFilter} setTypeFilter={setTypeFilter} />}
      <div className="main">
        <RD.TopBar crumbs={crumbs} />
        <div className="content">
          {content}
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Appearance">
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          />
          <TweakRadio
            label="Density"
            value={tweaks.density}
            onChange={(v) => setTweak("density", v)}
            options={[{ value: "cozy", label: "Cozy" }, { value: "compact", label: "Compact" }]}
          />
          <TweakToggle
            label="Show AI panel in dossier"
            value={tweaks.showAI}
            onChange={(v) => setTweak("showAI", v)}
          />
        </TweakSection>
        <TweakSection title="Jump to view">
          <TweakSelect
            label="View"
            value={view}
            onChange={(v) => { setView(v); setOpenId(null); }}
            options={[
              { value: "board", label: "Pipeline board" },
              { value: "table", label: "All products table" },
              { value: "dashboard", label: "Dashboard" },
              { value: "activity", label: "Activity feed" },
              { value: "rules", label: "Notification rules" },
              { value: "slack", label: "Slack feed (mock)" },
              { value: "ai", label: "Pipeline AI" },
            ]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
