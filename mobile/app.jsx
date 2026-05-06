/* global React, ReactDOM, RM, IOSDevice */
// R&D Pipeline — Mobile Companion (Direction A: Inbox-driven, evolved)
// State-driven router. Screens: inbox, productDetail, commentComposer, ideaCapture,
// pipeline, ideas, people, me. Approval flow with toasts. @-mention composer.

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;
const T = RM.TOKENS;

// ─────────────────────────────────────────────────────────
// App store — minimal global state
// ─────────────────────────────────────────────────────────
function useAppStore() {
  const [route, setRoute] = useS({ name: "inbox" });
  const [products, setProducts] = useS(() => RM.PRODUCTS.map(p => ({ ...p })));
  const [mentions, setMentions] = useS(() => [...RM.MENTIONS]);
  const [readIds, setReadIds] = useS(new Set());
  const [toast, setToast] = useS(null);
  const [comments, setComments] = useS({}); // { productId: [{who, text, at, mentions:[]}] }
  const [currentUser, setCurrentUser] = useS("chesky"); // role switcher

  function showToast(msg, tone = "ok") {
    setToast({ msg, tone, at: Date.now() });
    setTimeout(() => setToast(t => (t && Date.now() - t.at >= 2400) ? null : t), 2500);
  }
  function go(name, params = {}) { setRoute({ name, ...params }); window.scrollTo(0, 0); }
  function back() { setRoute({ name: "inbox" }); }
  function markRead(id) { setReadIds(s => new Set([...s, id])); }
  function approve(productId, decision, note) {
    setProducts(ps => ps.map(p => {
      if (p.id !== productId) return p;
      const approvals = { ...p.approvals, chesky: { decision, at: 0, note: note || "" } };
      // Stage transition logic
      let stage = p.stage, waitingOn = p.waitingOn;
      if (decision === "approve") {
        // Move to build only if Joel also approved
        stage = approvals.joel?.decision === "approve" ? "build" : "approval";
        waitingOn = approvals.joel?.decision === "approve" ? null : "joel";
      } else if (decision === "reject") {
        stage = "archived"; waitingOn = null;
      } else if (decision === "changes") {
        // Stays in approval, but ball is back in Malik's court
        waitingOn = "malik";
      }
      return { ...p, approvals, stage, waitingOn };
    }));
    // Auto-clear matching inbox entry
    setReadIds(s => new Set([...s, "approve-" + productId]));
    showToast(
      decision === "approve" ? "Approved · moved to Build" :
      decision === "changes" ? "Changes requested · sent to Malik" :
      "Rejected · archived"
    );
  }
  function postComment(productId, text, mentions = []) {
    setComments(c => ({ ...c, [productId]: [...(c[productId] || []),
      { who: "chesky", text, at: 0, mentions }] }));
    showToast(mentions.length ? `Comment posted · pinged ${mentions.join(", ")}` : "Comment posted");
  }
  function addIdea(idea) {
    // Timestamp-based id avoids collision if any idea is later deleted
    const id = "I-" + Date.now().toString().slice(-6);
    setProducts(ps => [...ps, { ...idea, id, stage: "idea", owner: "chesky",
      createdBy: "chesky", lastActivity: 0 }]);
    showToast("Idea captured");
  }

  return { route, go, back, products, mentions, readIds, markRead, toast, showToast,
           approve, comments, postComment, addIdea, currentUser, setCurrentUser };
}

// ─────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────
function Avatar({ user, size = 24 }) {
  if (!user) return null;
  return (
    <div style={{ width: size, height: size, borderRadius: 99, background: user.color, color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 600, flexShrink: 0 }}>{user.initials}</div>
  );
}
function BrandChip({ b }) {
  return <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3,
    background: RM.brandBg(b), color: RM.brandColor(b), letterSpacing: "0.02em" }}>{b}</span>;
}
function StagePill({ s }) {
  const i = RM.stageInfo(s);
  return <span style={{ fontSize: 10, fontWeight: 500, padding: "1px 7px", borderRadius: 99,
    background: i.bg, color: i.color }}>{i.label}</span>;
}
function NavBar({ title, leftLabel = "Inbox", onBack, rightLabel, onRight }) {
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, height: 44,
      display: "flex", alignItems: "center", padding: "0 6px",
      background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
      <button onClick={onBack} style={{ background: "transparent", border: 0, color: T.accent,
        fontSize: 16, padding: "8px 8px", cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 1 }}>
        <span style={{ fontSize: 22, lineHeight: "16px", marginTop: -2 }}>‹</span>{leftLabel}
      </button>
      <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center",
        fontSize: 14.5, fontWeight: 600, pointerEvents: "none", color: T.ink }}>{title}</div>
      <div style={{ marginLeft: "auto" }}>
        {rightLabel && (
          <button onClick={onRight} style={{ background: "transparent", border: 0, color: T.accent,
            fontSize: 16, fontWeight: 600, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}>
            {rightLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 100, zIndex: 100,
      background: T.ink, color: "#fff", padding: "12px 16px", borderRadius: 12,
      fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      animation: "toastIn 0.2s ease-out" }}>
      <span style={{ color: toast.tone === "ok" ? "#7AE5A6" : "#FFB58A" }}>●</span>
      {toast.msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Inbox builder — role-aware. Chesky keeps the rich queue
// (approvals + @mentions + stuck builds). Other roles dispatch
// to RM.buildInbox(role) and we adapt the shape.
// ─────────────────────────────────────────────────────────
function buildInboxItems(products, mentions, readIds, currentUser = "chesky") {
  if (currentUser !== "chesky") {
    // Adapt RM.buildInbox shape → InboxRow shape
    const kindMeta = {
      "approval":   { kind: "Approval", bg: T.accentBg, color: T.accent, focus: { tab: "decide" } },
      "cost-pass":  { kind: "Cost",     bg: T.warnBg,   color: T.warn,   focus: { tab: "overview" } },
      "blocker":    { kind: "Stuck",    bg: T.errBg,    color: T.err,    focus: { tab: "streams", stream: "sourcing" } },
      "design":     { kind: "Design",   bg: "#EBE5F8",  color: "#5C2EBE", focus: { tab: "streams", stream: "design" } },
      "listing":    { kind: "Listing",  bg: "#DCEEF2",  color: "#0B7A8E", focus: { tab: "streams", stream: "listing" } },
      "research":   { kind: "Niche",    bg: T.warnBg,   color: T.warn,   focus: { tab: "overview" } },
      "idea-aged":  { kind: "Idea",     bg: T.line2,    color: T.ink2,   focus: { tab: "overview" } },
      "mention":    { kind: "Mention",  bg: T.warnBg,   color: T.warn,   focus: { tab: "comments" } },
    };
    return RM.buildInbox(currentUser, products).map(it => {
      const meta = kindMeta[it.kind] || { kind: "Task", bg: T.line2, color: T.ink2, focus: {} };
      return {
        id: it.id, productId: it.productId, code: it.code, brand: it.brand,
        title: it.title, preview: it.preview,
        fromUser: it.fromUser, at: it.at,
        kind: meta.kind, kindBg: meta.bg, kindColor: meta.color,
        focus: meta.focus,
        unread: !readIds.has(it.id),
        urgent: it.priority === 1,
      };
    });
  }

  // CHESKY — original rich queue
  const items = [];
  products.filter(p => p.stage === "approval" && p.waitingOn === "chesky").forEach(p => {
    items.push({
      id: "approve-" + p.id, productId: p.id, code: p.code, brand: p.brand,
      title: "Niche review · " + p.name,
      preview: p.recommendation || p.synopsis,
      fromUser: p.owner, at: p.lastActivity,
      kind: "Approval", kindBg: T.accentBg, kindColor: T.accent,
      focus: { tab: "decide" },
      unread: !readIds.has("approve-" + p.id), urgent: p.urgency === "high",
    });
  });
  mentions.forEach(m => {
    const p = products.find(x => x.id === m.productId);
    if (!p) return;
    items.push({
      id: "ment-" + m.productId + "-" + m.from, productId: p.id, code: p.code, brand: p.brand,
      title: p.name,
      preview: m.text.replace("@chesky", "").trim(),
      fromUser: m.from, at: m.at,
      kind: "Mention", kindBg: T.warnBg, kindColor: T.warn,
      focus: { tab: "comments", reply: m.from },
      unread: !readIds.has("ment-" + m.productId + "-" + m.from),
    });
  });
  products.filter(p => p.blocker && p.blocker.days > 5).forEach(p => {
    items.push({
      id: "block-" + p.id, productId: p.id, code: p.code, brand: p.brand,
      title: "Stuck · " + p.name,
      preview: p.blocker.reason + " · " + p.blocker.days + "d in this state",
      fromUser: p.streams?.[p.blocker.stream]?.owner || p.owner,
      at: p.lastActivity,
      kind: "Stuck", kindBg: T.errBg, kindColor: T.err,
      focus: { tab: "stream", stream: p.blocker.stream },
      urgent: true, unread: !readIds.has("block-" + p.id),
    });
  });
  return items.sort((a, b) => a.at - b.at);
}

// ─────────────────────────────────────────────────────────
// Inbox row + screen
// ─────────────────────────────────────────────────────────
function InboxRow({ item, onTap }) {
  const u = RM.person(item.fromUser);
  const dot = item.urgent ? T.err : item.unread ? T.accent : "transparent";
  return (
    <button onClick={onTap}
      style={{ width: "100%", textAlign: "left", background: "transparent", border: 0,
        padding: "12px 16px", display: "flex", gap: 11, borderBottom: "0.5px solid " + T.line,
        cursor: "pointer", font: "inherit", color: "inherit" }}>
      <div style={{ width: 8, display: "flex", alignItems: "flex-start", paddingTop: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: 99, background: dot }}></div>
      </div>
      <Avatar user={u} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 11.5, color: T.ink3, fontFamily: "ui-monospace, SFMono-Regular, Menlo" }}>{item.code}</span>
          <BrandChip b={item.brand} />
          <span style={{ marginLeft: "auto", fontSize: 11, color: T.ink3 }}>{RM.ago(item.at)}</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: item.unread ? 600 : 500, lineHeight: 1.3, letterSpacing: "-0.01em",
          marginTop: 1, color: T.ink }}>{item.title}</div>
        <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 3, lineHeight: 1.4,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {item.preview}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 7px", borderRadius: 4,
            background: item.kindBg, color: item.kindColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {item.kind}
          </span>
        </div>
      </div>
    </button>
  );
}

function InboxScreen({ store }) {
  const [filter, setFilter] = useS("All");
  const items = useM(() => buildInboxItems(store.products, store.mentions, store.readIds, store.currentUser),
    [store.products, store.mentions, store.readIds, store.currentUser]);
  const filtered = filter === "All" ? items : items.filter(i => i.kind === filter);
  const today   = filtered.filter(i => i.at < 1);
  const earlier = filtered.filter(i => i.at >= 1);
  // Compute filter chips dynamically — only show kinds that have items
  const allKinds = [...new Set(items.map(i => i.kind))];
  const counts = { All: items.length };
  allKinds.forEach(k => { counts[k] = items.filter(i => i.kind === k).length; });

  function open(item) {
    store.markRead(item.id);
    store.go("productDetail", { productId: item.productId, focus: item.focus });
  }

  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <div style={{ padding: "8px 16px 12px", background: T.bg,
        position: "sticky", top: 0, zIndex: 5, borderBottom: "0.5px solid " + T.line }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: T.ink }}>Inbox</h1>
          <span style={{ fontSize: 14, color: T.ink3 }}>{items.length} items</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: T.ink3, display: "flex", alignItems: "center", gap: 6 }}>
            <Avatar user={RM.person(store.currentUser)} size={20} />
            {RM.person(store.currentUser).name}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {["All", ...allKinds].map(k => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ padding: "5px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
                background: filter === k ? T.ink : "#fff", color: filter === k ? "#fff" : T.ink2,
                border: filter === k ? "0" : "0.5px solid " + T.line, whiteSpace: "nowrap",
                cursor: "pointer", fontFamily: "inherit" }}>
              {k} <span style={{ opacity: 0.6, marginLeft: 2 }}>{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      {today.length > 0 && (
        <>
          <SectionLabel>Today</SectionLabel>
          {today.map(i => <InboxRow key={i.id} item={i} onTap={() => open(i)} />)}
        </>
      )}
      {earlier.length > 0 && (
        <>
          <SectionLabel>Earlier</SectionLabel>
          {earlier.map(i => <InboxRow key={i.id} item={i} onTap={() => open(i)} />)}
        </>
      )}
      {filtered.length === 0 && (
        <div style={{ padding: "56px 24px 40px", textAlign: "center", color: T.ink3 }}>
          <div style={{ width: 56, height: 56, borderRadius: 99, background: T.okBg,
            color: T.ok, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 700, margin: "0 auto 14px" }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
            {items.length === 0 ? "Inbox zero" : "Nothing in " + filter}
          </div>
          <div style={{ fontSize: 13, marginTop: 4, color: T.ink3, lineHeight: 1.45,
            maxWidth: 260, margin: "4px auto 0" }}>
            {items.length === 0
              ? "Nothing waiting on you. New approvals and @-mentions land here."
              : "Try another filter or check the Pipeline."}
          </div>
          {items.length === 0 && (
            <button onClick={() => store.go("pipeline")}
              style={{ marginTop: 16, padding: "9px 16px", borderRadius: 99,
                background: "#fff", border: "0.5px solid " + T.line,
                fontSize: 12.5, fontWeight: 600, color: T.accent,
                fontFamily: "inherit", cursor: "pointer" }}>
              Browse pipeline →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ padding: "16px 16px 4px", fontSize: 11, fontWeight: 600, color: T.ink3,
    textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────
// Product detail — stage-aware. Tabs: Decide (if approval) / Streams / Comments
// ─────────────────────────────────────────────────────────
function ProductDetailScreen({ store, productId, focus }) {
  const p = store.products.find(x => x.id === productId);
  const initialTab = focus?.tab === "decide"   ? "decide"
                   : focus?.tab === "comments" ? "comments"
                   : focus?.tab === "stream"   ? "streams"
                   : (p.stage === "approval" ? "decide"
                      : p.stage === "build"   ? "streams"
                      : "overview");
  const [tab, setTab] = useS(initialTab);

  const tabs = useM(() => {
    const t = [];
    if (p.stage === "approval") t.push({ id: "decide", l: "Decide" });
    t.push({ id: "overview", l: "Overview" });
    if (p.streams)              t.push({ id: "streams", l: "Streams" });
    t.push({ id: "comments", l: "Comments" });
    return t;
  }, [p]);

  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <NavBar title={p.code} onBack={store.back} />

      {/* Header */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <BrandChip b={p.brand} />
          <StagePill s={p.stage} />
          <span style={{ fontSize: 11, color: T.ink3, marginLeft: "auto" }}>
            {p.type} · owner {RM.person(p.owner).name}
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em",
          margin: "4px 0 6px", color: T.ink }}>{p.name}</h1>
        {p.synopsis && <p style={{ fontSize: 13.5, lineHeight: 1.5, color: T.ink2, margin: 0 }}>{p.synopsis}</p>}
      </div>

      {/* Tab strip */}
      <div style={{ display: "flex", gap: 4, padding: "0 12px", borderBottom: "0.5px solid " + T.line,
        position: "sticky", top: 44, background: T.bg, zIndex: 4 }}>
        {tabs.map(t_ => (
          <button key={t_.id} onClick={() => setTab(t_.id)}
            style={{ background: "transparent", border: 0, padding: "10px 8px", fontFamily: "inherit",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: tab === t_.id ? T.ink : T.ink3,
              borderBottom: "2px solid " + (tab === t_.id ? T.accent : "transparent"),
              marginBottom: -1 }}>{t_.l}</button>
        ))}
      </div>

      {tab === "decide"   && <DecideTab p={p} store={store} />}
      {tab === "overview" && <OverviewTab p={p} />}
      {tab === "streams"  && <StreamsTab p={p} focusStream={focus?.stream} store={store} />}
      {tab === "comments" && <CommentsTab p={p} store={store} replyTo={focus?.reply} />}
    </div>
  );
}

function Card({ children, accent, style }) {
  return (
    <div style={{ margin: "12px 16px", padding: 14, borderRadius: 12, background: "#fff",
      border: accent ? "1px solid " + accent : "0.5px solid " + T.line,
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)", ...style }}>{children}</div>
  );
}
function CardLabel({ tone = "muted", children }) {
  const color = tone === "ok" ? T.ok : tone === "accent" ? T.accent : tone === "warn" ? T.warn :
                tone === "err" ? T.err : T.ink3;
  return <div style={{ fontSize: 10.5, fontWeight: 600, color,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{children}</div>;
}

// ─── Decide tab — approval action ─────────────────────────
function DecideTab({ p, store }) {
  const joel = p.approvals?.joel;
  const me   = p.approvals?.chesky;
  const decided = !!me;
  const [reasonModal, setReasonModal] = useS(null); // null | "reject" | "changes"

  function submitReason(decision, note) {
    store.approve(p.id, decision, note);
    setReasonModal(null);
  }
  return (
    <div>
      <Card accent={decided ? T.ok : T.ok}>
        <CardLabel tone="ok">Formulation Verdict</CardLabel>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ok, letterSpacing: "-0.015em",
          margin: "2px 0 6px" }}>{p.nicheVerdict || "Proceed"}</div>
        <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.45 }}>{p.recommendation}</div>
      </Card>

      <NicheDocViewer p={p} />

      <Card>
        <CardLabel>Dual Approval Required</CardLabel>
        <ApprovalRow person="joel" status={joel} role="Finance" />
        <div style={{ height: 6 }}></div>
        <ApprovalRow person="chesky" status={me} role="Overseer" me />
      </Card>

      {!decided && (
        <div style={{ position: "absolute", bottom: 86, left: 0, right: 0, padding: "10px 16px 12px",
          background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
          borderTop: "0.5px solid " + T.line, display: "flex", gap: 8, zIndex: 9 }}>
          <button onClick={() => setReasonModal("reject")} style={btnStyle(T.errBg, T.err)}>Reject</button>
          <button onClick={() => setReasonModal("changes")} style={btnStyle(T.warnBg, T.warn)}>Changes</button>
          <button onClick={() => store.approve(p.id, "approve")}
            style={{ ...btnStyle("#0E8B4F", "#fff"), flex: 2, fontWeight: 700 }}>Approve →</button>
        </div>
      )}
      {reasonModal && (
        <ReasonModal kind={reasonModal} productName={p.name} onCancel={() => setReasonModal(null)} onSubmit={submitReason} />
      )}
    </div>
  );
}

// ─── Reject / Changes-required reason modal ─────────────────
function ReasonModal({ kind, productName, onCancel, onSubmit }) {
  const isReject = kind === "reject";
  const [note, setNote] = useS("");
  const presets = isReject
    ? ["Margin too thin at this price point", "Too crowded — strong incumbents own the keyword", "Compliance risk on the claims", "Doesn't fit our brand portfolio", "Wait — re-explore in 6 months"]
    : ["Need stronger competitive teardown", "Margin assumptions need a sourcing pass", "Reframe the recommendation", "Show 2–3 packaging directions first", "Get a second niche analysis"];
  const tint = isReject ? T.err : T.warn;
  const tintBg = isReject ? T.errBg : T.warnBg;

  return (
    <div onClick={onCancel} style={{
      position: "absolute", inset: 0, background: "rgba(15, 15, 17, 0.5)",
      zIndex: 30, display: "flex", flexDirection: "column", justifyContent: "flex-end",
      animation: "fadeIn 0.18s ease-out"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: "18px 18px 28px", maxHeight: "82%", overflowY: "auto",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.12)",
        animation: "slideUp 0.22s ease-out"
      }}>
        <div style={{ width: 36, height: 4, background: T.line, borderRadius: 99, margin: "0 auto 14px" }}></div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: tintBg, color: tint,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 700
          }}>{isReject ? "✗" : "↻"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.01em" }}>
              {isReject ? "Reject this niche?" : "Request changes"}
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {productName}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.45, marginBottom: 12 }}>
          {isReject
            ? "Malik will see your reason and re-route or archive. Required so we don't lose the learning."
            : "Malik will get a Slack ping with this note and revise the analysis."}
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 600, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Common reasons · tap to add
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
          {presets.map((r, i) => (
            <button key={i} onClick={() => setNote(n => n ? n + " " + r : r)}
              style={{
                padding: "7px 11px", borderRadius: 99,
                background: "#fff", border: "0.5px solid " + T.line,
                fontSize: 11.5, color: T.ink2, fontFamily: "inherit", cursor: "pointer"
              }}>{r}</button>
          ))}
        </div>

        <textarea
          autoFocus
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={isReject ? "Why are we passing on this?" : "What needs to change?"}
          style={{
            width: "100%", minHeight: 92, padding: 12,
            border: "1px solid " + T.line, borderRadius: 10,
            fontFamily: "inherit", fontSize: 14, color: T.ink,
            resize: "none", boxSizing: "border-box", outline: "none"
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: T.bg2, color: T.ink, border: 0,
            borderRadius: 12, padding: "13px 0",
            fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer"
          }}>Cancel</button>
          <button
            onClick={() => onSubmit(kind, note.trim())}
            disabled={!note.trim()}
            style={{
              flex: 2, background: note.trim() ? tint : T.bg2,
              color: note.trim() ? "#fff" : T.ink3, border: 0,
              borderRadius: 12, padding: "13px 0",
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              cursor: note.trim() ? "pointer" : "not-allowed",
              opacity: note.trim() ? 1 : 0.6
            }}>
            {isReject ? "Reject niche" : "Send change request"}
          </button>
        </div>
      </div>
    </div>
  );
}
function btnStyle(bg, color) {
  return { flex: 1, background: bg, color, border: 0, borderRadius: 12,
    padding: "13px 0", fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" };
}
function ApprovalRow({ person, status, role, me }) {
  const u = RM.person(person);
  const ok      = status?.decision === "approve";
  const reject  = status?.decision === "reject";
  const changes = status?.decision === "changes";
  const bg = ok ? T.okBg : reject ? T.errBg : changes ? T.warnBg : T.bg2;
  const border = me && !status ? "1.5px solid " + T.accent : "0.5px solid " + T.line;
  return (
    <div style={{ padding: 10, borderRadius: 8, background: bg, border,
      display: "flex", alignItems: "flex-start", gap: 10 }}>
      <Avatar user={u} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{me ? "You" : u.name}</span>
          <span style={{ fontSize: 11, color: T.ink3 }}>· {role}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600,
            color: ok ? T.ok : reject ? T.err : changes ? T.warn : T.accent }}>
            {ok ? "✓ Approved" : reject ? "✗ Rejected" : changes ? "↻ Changes" : "Pending"}
          </span>
        </div>
        {status?.note && (
          <div style={{ fontSize: 12, color: T.ink2, fontStyle: "italic", marginTop: 4, lineHeight: 1.4 }}>
            "{status.note}"
          </div>
        )}
        {status && <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 2 }}>{RM.ago(status.at)}</div>}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────
function OverviewTab({ p }) {
  const desktopItems = p.stage === "build"
    ? ["BOM · vendors · lead times", "Packaging artwork (Esty)", "Listing draft (April)", "Cost roll-up"]
    : p.stage === "production"
    ? ["PO + tracking", "QC report", "Live thesis vs actual", "Catalog status"]
    : p.stage === "approval"
    ? ["Full Niche Analysis doc", "Competitor teardown", "Margin model"]
    : null;
  return (
    <div>
      {p.synopsis && (
        <Card>
          <CardLabel>About</CardLabel>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: T.ink }}>{p.synopsis}</div>
        </Card>
      )}
      {p.market && (
        <Card>
          <CardLabel>Market</CardLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {Object.entries(p.market).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10.5, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k}</div>
                <div style={{ fontSize: 17, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular", color: T.ink, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {p.stage === "build" && <EstyWireframeHandoff p={p} />}
      {p.stage === "production" && (
        <Card>
          <CardLabel tone="accent">Production</CardLabel>
          <div style={{ display: "flex", gap: 14 }}>
            <div><div style={{ fontSize: 10.5, color: T.ink3, textTransform: "uppercase" }}>Status</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{p.poStatus}</div></div>
            <div><div style={{ fontSize: 10.5, color: T.ink3, textTransform: "uppercase" }}>ETA</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{p.eta}d</div></div>
          </div>
        </Card>
      )}
      <DesktopOnly items={desktopItems} />
    </div>
  );
}
function DesktopOnly({ items }) {
  const list = items || ["Full BOM + sourcing", "Packaging spec sheet", "Listing draft (April)", "Live thesis vs actual"];
  return (
    <div style={{ margin: "20px 16px 0", padding: "14px 16px", borderRadius: 10,
      background: T.bg2, border: "0.5px dashed " + T.line }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: T.ink3,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Continue on desktop
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {list.map((x, i) => (
          <li key={i} style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.7,
            display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: T.ink4 }}></span>
            {x}
          </li>
        ))}
      </ul>
      <div style={{ fontSize: 11.5, color: T.accent, fontWeight: 600, marginTop: 10 }}>
        Open dossier on desktop →
      </div>
    </div>
  );
}

// ─── Streams tab ──────────────────────────────────────────
function StreamsTab({ p, focusStream, store }) {
  if (!p.streams) return <div style={{ padding: 40, textAlign: "center", color: T.ink3, fontSize: 13 }}>No streams yet.</div>;
  return (
    <div>
      {Object.entries(p.streams).map(([k, s]) => {
        const owner = RM.person(s.owner);
        const focused = focusStream === k;
        const tone = s.status === "Approved" || s.status === "Live" ? T.ok :
                     s.status === "Backorder" || s.status === "Stuck" ? T.err :
                     s.pct === 0 ? T.ink3 : T.accent;
        return (
          <Card key={k} accent={focused ? T.accent : null}
            style={{ marginBottom: 0, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar user={owner} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize", color: T.ink }}>{k}</div>
                <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 1 }}>{owner.name} · {owner.role}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
                background: focused ? T.accentBg : T.bg2, color: tone }}>{s.status}</span>
            </div>
            <div style={{ height: 5, background: T.bg2, borderRadius: 3, overflow: "hidden", marginTop: 11 }}>
              <div style={{ width: s.pct + "%", height: "100%", background: tone, transition: "width 0.3s" }}></div>
            </div>
            <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 8, lineHeight: 1.4 }}>{s.lastNote}</div>
            <button onClick={() => store.go("commentComposer", { productId: p.id, replyTo: s.owner, topic: k })}
              style={{ marginTop: 10, background: T.bg2, border: 0, borderRadius: 8, padding: "8px 12px",
                fontSize: 12.5, fontWeight: 600, color: T.accent, fontFamily: "inherit",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
              ↩ Ping {owner.name}
            </button>
          </Card>
        );
      })}
      <div style={{ height: 12 }}></div>
      <DesktopOnly />
    </div>
  );
}

// ─── Comments tab ─────────────────────────────────────────
function CommentsTab({ p, store, replyTo }) {
  const live = store.comments[p.id] || [];
  const seed = useM(() => {
    const arr = [];
    if (p.stage === "build" && p.streams?.design?.lastNote) {
      arr.push({ who: "esty", text: "@chesky " + (p.streams.design.lastNote), at: 0.3, mentions: ["chesky"] });
    }
    if (p.blocker) {
      const o = p.streams?.[p.blocker.stream]?.owner || p.owner;
      arr.push({ who: o, text: "@chesky " + p.blocker.reason + ". Need direction.", at: 0.5, mentions: ["chesky"] });
    }
    arr.push({ who: p.owner, text: "Update — " + (p.synopsis || "see latest spec"), at: 1.5, mentions: [] });
    return arr;
  }, [p]);
  const all = [...seed, ...live].sort((a, b) => b.at - a.at);

  return (
    <div>
      <div style={{ padding: "8px 0" }}>
        {all.map((c, i) => {
          const u = RM.person(c.who);
          return (
            <div key={i} style={{ padding: "10px 16px", display: "flex", gap: 10,
              borderBottom: "0.5px solid " + T.line }}>
              <Avatar user={u} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                  <span style={{ fontSize: 11, color: T.ink3 }}>{RM.ago(c.at)}</span>
                </div>
                <div style={{ fontSize: 13.5, color: T.ink, marginTop: 2, lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: highlightMentions(c.text) }} />
              </div>
            </div>
          );
        })}
      </div>
      {/* Composer launcher */}
      <div style={{ position: "absolute", bottom: 86, left: 0, right: 0, padding: "10px 16px 12px",
        background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)",
        borderTop: "0.5px solid " + T.line, zIndex: 9 }}>
        <button onClick={() => store.go("commentComposer", { productId: p.id, replyTo })}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 22, background: T.bg2,
            border: "0.5px solid " + T.line, fontFamily: "inherit", fontSize: 13.5, color: T.ink3,
            textAlign: "left", cursor: "pointer" }}>
          {replyTo ? `Reply to @${replyTo}…` : "Add a comment…"}
        </button>
      </div>
    </div>
  );
}

function highlightMentions(text) {
  return text.replace(/@(\w+)/g,
    `<span style="color:${T.accent};font-weight:600">@$1</span>`);
}

// ─────────────────────────────────────────────────────────
// Niche Doc — structured 6-section viewer
// (mirrors the canonical Google Sheet: Market · Competitors ·
//  Ingredients · Claims · Positioning · Financials)
// Synthesizes from p.nicheSummary + adjacent product fields when
// the rich `niche.current.parsed.content` shape isn't present.
// ─────────────────────────────────────────────────────────
function NicheDocViewer({ p }) {
  const rich = p.niche?.current?.parsed?.content || null;
  const summary = p.nicheSummary || {};
  const sections = useM(() => buildNicheSections(p, rich, summary), [p, rich, summary]);
  const [open, setOpen] = useS(0); // first section open by default
  const ago = p.niche?.parsedDaysAgo != null ? RM.ago(p.niche.parsedDaysAgo)
            : p.docUploadedDaysAgo != null  ? RM.ago(p.docUploadedDaysAgo)
            : null;
  const docUrl = p.niche?.docUrl || p.docUrl;

  return (
    <Card style={{ paddingBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <CardLabel>Niche Analysis</CardLabel>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, marginTop: -2 }}>
            6 sections · parsed by Opus 4.7{ago ? " · " + ago : ""}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 99,
          background: T.okBg, color: T.ok, letterSpacing: "0.02em" }}>
          {summary.verdict || "GO"}
        </span>
      </div>

      {docUrl && (
        <div style={{ fontSize: 11, color: T.ink3, marginTop: 4, fontFamily: "ui-monospace, SFMono-Regular",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docUrl}</div>
      )}

      <div style={{ marginTop: 10, marginLeft: -2, marginRight: -2 }}>
        {sections.map((s, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderTop: "0.5px solid " + T.line }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)}
                style={{ width: "100%", background: "transparent", border: 0, fontFamily: "inherit",
                  padding: "11px 4px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  textAlign: "left" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.ink3, minWidth: 14,
                  fontFamily: "ui-monospace, SFMono-Regular" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{s.title}</span>
                {s.headline && (
                  <span style={{ fontSize: 11.5, color: T.ink3, fontFamily: "ui-monospace, SFMono-Regular",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>
                    {s.headline}
                  </span>
                )}
                <span style={{ fontSize: 13, color: T.ink3, transform: isOpen ? "rotate(90deg)" : "none",
                  transition: "transform 0.15s" }}>›</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 4px 14px", animation: "fadeIn 0.15s" }}>
                  {s.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function buildNicheSections(p, rich, summary) {
  // Helper renderers
  const KV = ({ items }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
      {items.filter(([_, v]) => v != null && v !== "").map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: 10, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular",
            color: T.ink, marginTop: 1 }}>{v}</div>
        </div>
      ))}
    </div>
  );
  const Para = ({ children }) => (
    <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.5, marginTop: 4 }}>{children}</div>
  );
  const Note = ({ children }) => (
    <div style={{ fontSize: 11.5, color: T.ink3, lineHeight: 1.4, marginTop: 6, fontStyle: "italic" }}>{children}</div>
  );
  const PillRow = ({ items }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
      {items.map((x, i) => (
        <span key={i} style={{ padding: "3px 8px", borderRadius: 99, background: T.bg2,
          fontSize: 11.5, color: T.ink2, border: "0.5px solid " + T.line }}>{x}</span>
      ))}
    </div>
  );

  // 1 · Market
  const market = rich?.overview?.market || p.market || {};
  const marketItems = Object.entries(market);
  const marketHeadline = market.sv || market.searchVolume || summary.tam || null;

  // 2 · Competitors
  const compList = rich?.competitors || [];
  const compHeadline = (compList.length || summary.competitors) + " brands";

  // 3 · Ingredients
  const formula = rich?.formula || p.formulationGate?.proposedFormula || p.rdGate?.proposedFormula || [];
  const ingHeadline = formula.length ? formula.length + " actives" : (p.type || null);

  // 4 · Claims & Positioning
  const claims = rich?.claims || p.claims || null;
  const positioning = rich?.differentiation?.angle || rich?.positioning || summary.gap || p.recommendation || null;

  // 5 · Financials (margin model)
  const fin = rich?.financials || p.financials || null;
  const finHeadline = fin?.targetRetail || fin?.cogsBudget || (summary.tam ? "TAM " + summary.tam : null);

  // 6 · Verdict
  const verdict = rich?.verdict || { recommendation: p.nicheVerdict || summary.verdict, rationale: p.recommendation };

  return [
    {
      title: "Market sizing",
      headline: marketHeadline,
      body: marketItems.length > 0
        ? <>
            <KV items={marketItems.map(([k, v]) => [labelize(k), v])} />
            {summary.tam && !market.revenue && <Para>Total addressable: <b>{summary.tam}</b></Para>}
          </>
        : <>
            {summary.tam && <Para>Total addressable: <b>{summary.tam}</b></Para>}
            <Note>Market data not yet captured in structured form.</Note>
          </>,
    },
    {
      title: "Competitive landscape",
      headline: compHeadline,
      body: compList.length > 0
        ? <div style={{ marginTop: 8 }}>
            {compList.slice(0, 4).map((c, i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: i === Math.min(3, compList.length - 1) ? 0 : "0.5px solid " + T.line,
                display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink }}>{c.brand}</div>
                  <div style={{ fontSize: 11, color: T.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.title || c.asin}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, fontFamily: "ui-monospace, SFMono-Regular" }}>{c.price}</div>
                  <div style={{ fontSize: 10.5, color: T.ink3 }}>{c.revenue || c.sales}</div>
                </div>
              </div>
            ))}
            {compList.length > 4 && <Note>+ {compList.length - 4} more in source doc</Note>}
          </div>
        : <>
            <Para><b>{summary.competitors || "?"}</b> direct competitors identified.</Para>
            {summary.gap && <Note>{summary.gap}</Note>}
          </>,
    },
    {
      title: "Ingredient stack",
      headline: ingHeadline,
      body: formula.length > 0
        ? <div style={{ marginTop: 8 }}>
            {formula.map((f, i) => (
              <div key={i} style={{ padding: "7px 0", borderBottom: i === formula.length - 1 ? 0 : "0.5px solid " + T.line,
                display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, flex: 1 }}>
                  {f.ingredient || f.name}
                </span>
                <span style={{ fontSize: 12, color: T.ink2, fontFamily: "ui-monospace, SFMono-Regular" }}>{f.dose}</span>
              </div>
            ))}
            {rich?.formula?.[0]?.rationale && (
              <Note>Rationale captured per ingredient. Open desktop dossier to see full notes.</Note>
            )}
          </div>
        : <>
            <Para>Format: <b>{p.type || "TBD"}</b></Para>
            {p.synopsis && <Para>{p.synopsis}</Para>}
            <Note>Locked formula appears here once Malik finalizes the PDS.</Note>
          </>,
    },
    {
      title: "Claims & positioning",
      headline: claims ? "Locked" : "Drafted",
      body: <>
        {positioning && <Para><b>Angle.</b> {positioning}</Para>}
        {rich?.differentiation?.whitespace && <Para><b>Whitespace.</b> {rich.differentiation.whitespace}</Para>}
        {claims && Array.isArray(claims) && <PillRow items={claims} />}
        {!positioning && !claims && <Note>Positioning will solidify after the cost pass + final PDS.</Note>}
      </>,
    },
    {
      title: "Margin model",
      headline: finHeadline,
      body: <>
        {fin && <KV items={Object.entries(fin).map(([k, v]) => [labelize(k), v])} />}
        {!fin && summary.tam && <Para>TAM: <b>{summary.tam}</b></Para>}
        {!fin && p.costPass?.summary && (
          <KV items={[
            ["All-in / unit", "$" + p.costPass.summary.allInPerBottle?.toFixed(2)],
            ["Ingredients", "$" + p.costPass.summary.ingredientTotal?.toFixed(2)],
            ["Packaging", "$" + p.costPass.summary.packagingTotal?.toFixed(2)],
            ["Cost-pass complete", (p.costPass.summary.completePct || 0) + "%"],
          ]} />
        )}
        {!fin && !summary.tam && !p.costPass && <Note>Margin model gets attached once Ronel runs the cost pass.</Note>}
      </>,
    },
    {
      title: "Verdict & rationale",
      headline: verdict?.recommendation || summary.verdict || "GO",
      body: <>
        <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: 99,
          background: T.okBg, color: T.ok, fontSize: 12, fontWeight: 700, marginTop: 4 }}>
          {verdict?.recommendation || summary.verdict || "GO"}
        </div>
        {verdict?.rationale && <Para>{verdict.rationale}</Para>}
        {p.approvals && (
          <Note>
            Joel: {fmtApproval(p.approvals.joel)} · Chesky: {fmtApproval(p.approvals.chesky)}
          </Note>
        )}
      </>,
    },
  ];
}

function labelize(k) {
  if (k === "sv") return "Search vol";
  if (k === "cvr") return "CVR";
  if (k === "tam") return "TAM";
  if (k === "yoy") return "YoY";
  if (k === "tiktok") return "TikTok";
  return k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}
function fmtApproval(a) {
  if (!a) return "pending";
  return a.decision === "approve" ? "approved" : a.decision;
}

// ─────────────────────────────────────────────────────────
// Esty Wireframe Handoff — appears on the build-stage Overview
// tab. Surfaces the locked PDS wireframe, copy direction, and
// a one-tap action that opens her design composer for that asset.
// ─────────────────────────────────────────────────────────
function EstyWireframeHandoff({ p }) {
  // Use what we have: design stream + packaging defaults + niche
  const design = p.streams?.design;
  if (!design) return null;
  // Don't show if design stream is already done
  if (design.status === "Approved" || design.pct >= 100) return null;

  const esty = RM.person("esty");
  const lockedAt = p.docUploadedDaysAgo != null
    ? RM.ago(p.docUploadedDaysAgo)
    : design.lastNote ? "recently" : "today";

  // Asset list — derive from product type
  const assets = [
    { kind: "label",  title: "Bottle label",   need: "Wireframe v1 · cap front + back panel", status: "ready" },
    { kind: "box",    title: "Folding carton", need: "Print-ready dieline + render", status: "ready" },
    { kind: "insert", title: "Insert card",    need: "Usage + claims, A6 fold", status: "queued" },
  ];

  return (
    <Card accent={T.accent} style={{ background: "linear-gradient(180deg, " + T.accentBg + " 0%, #fff 60%)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Avatar user={esty} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <CardLabel tone="accent">Wireframe Handoff · Esty</CardLabel>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, letterSpacing: "-0.005em" }}>
            PDS wireframe locked {lockedAt}
          </div>
          <div style={{ fontSize: 12, color: T.ink2, marginTop: 3, lineHeight: 1.45 }}>
            Esty designs against the wireframe. Each asset gets a versioned upload — Chesky/Joel approve before print.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {assets.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0",
            borderTop: "0.5px solid " + T.line,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 6,
              background: a.status === "ready" ? T.accentBg : T.bg2,
              border: "0.5px solid " + T.line,
              color: a.status === "ready" ? T.accent : T.ink3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700,
            }}>
              {a.kind === "label" ? "▭" : a.kind === "box" ? "◰" : "≡"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{a.title}</div>
              <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 1 }}>{a.need}</div>
            </div>
            <span style={{
              fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: a.status === "ready" ? T.okBg : T.bg2,
              color: a.status === "ready" ? T.ok : T.ink3,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>{a.status}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button style={{ flex: 1, background: T.bg2, border: 0, borderRadius: 10, padding: "10px 12px",
          fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: T.ink2, cursor: "pointer" }}>
          View wireframe
        </button>
        <button style={{ flex: 2, background: T.accent, border: 0, borderRadius: 10, padding: "10px 12px",
          fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer",
          letterSpacing: "0.005em" }}>
          Open Esty's queue →
        </button>
      </div>

      <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 10, textAlign: "center" }}>
        Continue this on desktop for inline label preview + diff.
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Comment composer — full screen
// ─────────────────────────────────────────────────────────
function CommentComposerScreen({ store, productId, replyTo, topic }) {
  const p = store.products.find(x => x.id === productId);
  const [text, setText] = useS(replyTo ? `@${replyTo} ` : "");
  const [showMentions, setShowMentions] = useS(false);
  const ref = useR(null);
  useE(() => { setTimeout(() => ref.current?.focus(), 50); }, []);

  const mentions = useM(() => {
    const m = text.match(/@(\w+)/g) || [];
    return [...new Set(m.map(x => x.slice(1)))];
  }, [text]);

  function insertMention(handle) {
    const before = text.replace(/@\w*$/, "");
    setText(before + "@" + handle + " ");
    setShowMentions(false);
    setTimeout(() => ref.current?.focus(), 10);
  }

  function onChange(e) {
    setText(e.target.value);
    const tail = e.target.value.split(/\s/).pop();
    setShowMentions(tail.startsWith("@"));
  }

  function send() {
    if (!text.trim()) return;
    store.postComment(productId, text.trim(), mentions);
    store.go("productDetail", { productId, focus: { tab: "comments" } });
  }

  const peopleList = Object.values(RM.PEOPLE).filter(u => u.id !== "chesky");

  return (
    <div style={{ background: T.bg, minHeight: "100%" }}>
      <NavBar title={p.code + (topic ? " · " + topic : "")} leftLabel="Cancel" onBack={store.back}
        rightLabel="Post" onRight={send} />
      <div style={{ padding: "10px 16px 12px" }}>
        <div style={{ fontSize: 11.5, color: T.ink3, marginBottom: 4, textTransform: "uppercase",
          letterSpacing: "0.06em", fontWeight: 600 }}>Comment on</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{p.name}</div>
      </div>
      <div style={{ padding: "0 16px" }}>
        <textarea ref={ref} value={text} onChange={onChange}
          placeholder="Write your comment… use @ to mention someone"
          style={{ width: "100%", minHeight: 180, padding: "12px 14px", borderRadius: 10,
            border: "0.5px solid " + T.line, background: "#fff", fontSize: 15, lineHeight: 1.5,
            fontFamily: "inherit", color: T.ink, resize: "none", outline: "none" }} />
      </div>

      {/* @-mention picker */}
      {showMentions && (
        <div style={{ margin: "8px 16px", borderRadius: 10, background: "#fff",
          border: "0.5px solid " + T.line, overflow: "hidden",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
          {peopleList.map(u => (
            <button key={u.id} onClick={() => insertMention(u.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "transparent", border: 0,
                borderBottom: "0.5px solid " + T.line2, fontFamily: "inherit",
                cursor: "pointer", textAlign: "left" }}>
              <Avatar user={u} size={26} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: T.ink3 }}>{u.role}</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: T.ink3,
                fontFamily: "ui-monospace, SFMono-Regular" }}>@{u.id}</span>
            </button>
          ))}
        </div>
      )}

      {/* Quick reactions */}
      {!showMentions && (
        <div style={{ padding: "0 16px", marginTop: 12 }}>
          <div style={{ fontSize: 11, color: T.ink3, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Quick</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["👍 Looks good", "✓ Approved on my end", "↻ Need more info", "⏸ Hold for now"].map(q => (
              <button key={q} onClick={() => setText(t => t + (t.endsWith(" ") || !t ? "" : " ") + q.slice(2))}
                style={{ padding: "8px 12px", borderRadius: 99, background: "#fff",
                  border: "0.5px solid " + T.line, fontSize: 12.5, fontFamily: "inherit",
                  cursor: "pointer" }}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Mention badges */}
      {mentions.length > 0 && (
        <div style={{ padding: "12px 16px", marginTop: 8, fontSize: 12, color: T.ink3 }}>
          Will ping: {mentions.map(m => (
            <span key={m} style={{ color: T.accent, fontWeight: 600, marginRight: 6 }}>@{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Idea capture
// ─────────────────────────────────────────────────────────
function IdeaCaptureScreen({ store }) {
  const [name, setName]     = useS("");
  const [brand, setBrand]   = useS("DON");
  const [type, setType]     = useS("Capsule");
  const [why, setWhy]       = useS("");

  const valid = name.trim().length >= 3 && why.trim().length >= 10;
  function save() {
    if (!valid) return;
    store.addIdea({ code: brand + "-" + name.replace(/\s/g, "").slice(0, 8),
      name, brand, type: type.toLowerCase(), synopsis: why });
    store.back();
  }

  return (
    <div style={{ background: T.bg, minHeight: "100%", paddingBottom: 90 }}>
      <NavBar title="New idea" leftLabel="Cancel" onBack={store.back}
        rightLabel={valid ? "Save" : null} onRight={save} />

      <div style={{ padding: "14px 16px 6px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em",
          margin: 0, color: T.ink }}>Capture an idea</h1>
        <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>
          Quick capture. Flesh it out later in Niche Analysis.
        </div>
      </div>

      <div style={{ background: "#fff", margin: "14px 0", padding: "0 16px",
        borderTop: "0.5px solid " + T.line, borderBottom: "0.5px solid " + T.line }}>
        <Field label="Working name">
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Lymphatic Drainage Tea"
            style={inputStyle()} />
        </Field>
        <Field label="Brand" inline>
          <Segmented options={["DON", "PN"]} value={brand} onChange={setBrand} />
        </Field>
        <Field label="Format" inline>
          <Segmented options={["Capsule", "Liquid", "Powder", "Tea", "Topical"]} value={type} onChange={setType} />
        </Field>
        <Field label="Why now?">
          <textarea value={why} onChange={e => setWhy(e.target.value)} rows={3}
            placeholder="Trend signal, gap, or angle. ≥10 chars."
            style={{ ...inputStyle(), resize: "none" }} />
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 4, textAlign: "right" }}>
            {why.length} / 280
          </div>
        </Field>
      </div>

      <div style={{ padding: "8px 16px" }}>
        <button onClick={save} disabled={!valid}
          style={{ width: "100%", background: valid ? T.accent : T.line, color: "#fff",
            border: 0, borderRadius: 12, padding: "14px 0", fontSize: 15, fontWeight: 700,
            fontFamily: "inherit", cursor: valid ? "pointer" : "default" }}>
          Capture idea →
        </button>
      </div>
    </div>
  );
}

function Field({ label, inline, children }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "0.5px solid " + T.line2,
      display: inline ? "flex" : "block", alignItems: inline ? "center" : "flex-start",
      gap: inline ? 12 : 0 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.ink3, textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: inline ? 0 : 4, minWidth: inline ? 84 : "auto" }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
function inputStyle() {
  return { width: "100%", padding: "8px 0", border: 0, fontSize: 16,
    fontFamily: "inherit", color: T.ink, background: "transparent", outline: "none" };
}
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)}
          style={{ padding: "5px 10px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
            background: value === o ? T.ink : "#fff", color: value === o ? "#fff" : T.ink2,
            border: value === o ? "0" : "0.5px solid " + T.line,
            fontFamily: "inherit", cursor: "pointer" }}>{o}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Pipeline / Ideas / People / Me — light read views
// ─────────────────────────────────────────────────────────
function PipelineScreen({ store }) {
  const [stage, setStage] = useS("build");
  const stages = ["niche", "approval", "build", "production"];
  const list = store.products.filter(p => p.stage === stage);
  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <div style={{ padding: "8px 16px 12px", background: T.bg, position: "sticky", top: 0,
        zIndex: 5, borderBottom: "0.5px solid " + T.line }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em",
          margin: 0, color: T.ink }}>Pipeline</h1>
        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {stages.map(s => {
            const i = RM.stageInfo(s);
            const n = store.products.filter(p => p.stage === s).length;
            return (
              <button key={s} onClick={() => setStage(s)}
                style={{ padding: "5px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 500,
                  background: stage === s ? T.ink : "#fff", color: stage === s ? "#fff" : T.ink2,
                  border: stage === s ? "0" : "0.5px solid " + T.line, whiteSpace: "nowrap",
                  cursor: "pointer", fontFamily: "inherit" }}>
                {i.label} <span style={{ opacity: 0.6, marginLeft: 2 }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>
      {list.map(p => (
        <button key={p.id} onClick={() => store.go("productDetail", { productId: p.id })}
          style={{ width: "100%", textAlign: "left", background: "transparent", border: 0,
            padding: "12px 16px", borderBottom: "0.5px solid " + T.line, font: "inherit",
            color: "inherit", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, color: T.ink3, fontFamily: "ui-monospace, SFMono-Regular" }}>{p.code}</span>
            <BrandChip b={p.brand} />
            {p.urgency === "high" && <span style={{ fontSize: 10, color: T.err, fontWeight: 600 }}>● urgent</span>}
            <span style={{ marginLeft: "auto", fontSize: 11, color: T.ink3 }}>{RM.ago(p.lastActivity)}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{p.name}</div>
          {p.streams && (
            <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
              {Object.entries(p.streams).map(([k, s]) => (
                <div key={k} style={{ flex: 1, height: 4, background: T.bg2, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: s.pct + "%", height: "100%",
                    background: s.status === "Backorder" ? T.err : s.status === "Approved" ? T.ok : T.accent }}></div>
                </div>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function IdeasScreen({ store }) {
  const list = store.products.filter(p => p.stage === "idea")
    .sort((a, b) => a.lastActivity - b.lastActivity);
  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <div style={{ padding: "8px 16px 12px", background: T.bg, position: "sticky", top: 0, zIndex: 5,
        borderBottom: "0.5px solid " + T.line, display: "flex", alignItems: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: T.ink }}>Ideas</h1>
        <button onClick={() => store.go("ideaCapture")}
          style={{ marginLeft: "auto", background: T.accent, color: "#fff", border: 0, borderRadius: 99,
            padding: "8px 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
          + New
        </button>
      </div>
      {list.map(p => (
        <div key={p.id} style={{ padding: "14px 16px", borderBottom: "0.5px solid " + T.line }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <BrandChip b={p.brand} />
            <span style={{ fontSize: 11, color: T.ink3, textTransform: "capitalize" }}>{p.type}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: T.ink3 }}>{RM.ago(p.lastActivity)}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 4 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.4 }}>{p.synopsis}</div>
        </div>
      ))}
    </div>
  );
}

function PeopleScreen({ store }) {
  const people = Object.values(RM.PEOPLE).filter(u => u.id !== "chesky");
  const counts = {};
  people.forEach(u => {
    counts[u.id] = {
      stuck: store.products.filter(p => p.blocker && (p.streams?.[p.blocker.stream]?.owner === u.id || p.owner === u.id)).length,
      open:  store.products.filter(p => p.owner === u.id || (p.streams && Object.values(p.streams).some(s => s.owner === u.id))).length,
    };
  });
  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <div style={{ padding: "8px 16px 12px", background: T.bg, position: "sticky", top: 0, zIndex: 5,
        borderBottom: "0.5px solid " + T.line }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", margin: 0, color: T.ink }}>People</h1>
      </div>
      {people.map(u => (
        <div key={u.id} style={{ padding: "14px 16px", borderBottom: "0.5px solid " + T.line,
          display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar user={u} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: T.ink }}>{u.name}</div>
            <div style={{ fontSize: 11.5, color: T.ink3 }}>{u.role}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "ui-monospace, SFMono-Regular",
              color: counts[u.id].stuck > 0 ? T.err : T.ink }}>{counts[u.id].open}</div>
            <div style={{ fontSize: 10.5, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              open{counts[u.id].stuck > 0 ? ` · ${counts[u.id].stuck} stuck` : ""}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MeScreen({ store }) {
  const me = RM.person(store.currentUser);
  const roles = ["chesky", "joel", "malik", "ronel", "esty", "april", "talha"];
  return (
    <div style={{ paddingBottom: 90, background: T.bg, minHeight: "100%" }}>
      <div style={{ padding: "24px 16px 16px", background: T.bg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar user={me} size={56} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.015em" }}>{me.name}</div>
            <div style={{ fontSize: 13, color: T.ink3 }}>{me.role}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 600, color: T.ink3,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>View as (demo)</div>
      <div style={{ background: "#fff", borderTop: "0.5px solid " + T.line,
        borderBottom: "0.5px solid " + T.line }}>
        {roles.map((r, i) => {
          const u = RM.person(r);
          const active = store.currentUser === r;
          return (
            <button key={r} onClick={() => { store.setCurrentUser(r); store.go("inbox"); }}
              style={{ width: "100%", padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
                background: "transparent", border: 0, borderTop: i === 0 ? 0 : "0.5px solid " + T.line2,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
              <Avatar user={u} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.ink, fontWeight: active ? 600 : 400 }}>{u.name}</div>
                <div style={{ fontSize: 11.5, color: T.ink3 }}>{u.role}</div>
              </div>
              {active && <span style={{ color: T.accent, fontSize: 18 }}>✓</span>}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "20px 16px 4px", fontSize: 11, fontWeight: 600, color: T.ink3,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>Settings</div>
      {[
        { l: "Notifications", v: "Slack + push" },
        { l: "Quiet hours", v: "10pm–7am" },
        { l: "Daily briefing", v: "8:00 AM" },
        { l: "Weekly digest", v: "Mondays 9 AM" },
        { l: "Approval channel", v: "#rd-approvals" },
        { l: "Sign out", v: "" },
      ].map((row, i) => (
        <div key={i} style={{ padding: "14px 16px", display: "flex", alignItems: "center",
          background: "#fff", borderTop: i === 0 ? "0.5px solid " + T.line : 0,
          borderBottom: "0.5px solid " + T.line }}>
          <div style={{ fontSize: 14, color: T.ink, flex: 1 }}>{row.l}</div>
          <div style={{ fontSize: 13, color: T.ink3, marginRight: 4 }}>{row.v}</div>
          <span style={{ color: T.ink4, fontSize: 18 }}>›</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────
function TabBar({ store }) {
  const tabs = [
    { id: "inbox",    label: "Inbox",    icon: "✦" },
    { id: "pipeline", label: "Pipeline", icon: "▦" },
    { id: "ideaCapture", label: "Idea",  icon: "✜", primary: true },
    { id: "people",   label: "People",   icon: "◐" },
    { id: "me",       label: "Me",       icon: "◉" },
  ];
  const activeMap = { inbox: "inbox", pipeline: "pipeline", ideas: "ideas", people: "people",
    ideaCapture: "ideaCapture", productDetail: "inbox", commentComposer: "inbox", me: "me" };
  const active = activeMap[store.route.name] || "inbox";
  const inboxCount = useM(() => buildInboxItems(store.products, store.mentions, store.readIds, store.currentUser).length,
    [store.products, store.mentions, store.readIds, store.currentUser]);

  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 86,
      paddingBottom: 22, paddingTop: 6, display: "flex",
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderTop: "0.5px solid rgba(0,0,0,0.08)", zIndex: 50 }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const isPrimary = t.primary;
        if (isPrimary) {
          return (
            <div key={t.id} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
              <button onClick={() => store.go(t.id)}
                style={{ width: 50, height: 50, borderRadius: 99, border: 0, background: T.accent,
                  color: "#fff", fontSize: 26, fontWeight: 600, cursor: "pointer",
                  marginTop: -12, boxShadow: "0 4px 12px rgba(31,102,245,0.3)",
                  fontFamily: "inherit" }}>+</button>
            </div>
          );
        }
        return (
          <button key={t.id} onClick={() => store.go(t.id)}
            style={{ flex: 1, background: "transparent", border: 0, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              color: isActive ? T.accent : T.ink3, padding: "6px 0", fontFamily: "inherit" }}>
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</div>
              {t.id === "inbox" && inboxCount > 0 && (
                <div style={{ position: "absolute", top: -3, right: -8, minWidth: 16, height: 16, padding: "0 4px",
                  borderRadius: 99, background: T.err, color: "#fff",
                  fontSize: 10, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {inboxCount}
                </div>
              )}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 500 }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────
function MobileApp() {
  const store = useAppStore();
  const r = store.route;
  return (
    <div style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden",
      background: T.bg }}>
      <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden",
        WebkitOverflowScrolling: "touch", paddingBottom: r.name === "ideaCapture" ? 0 : 0 }}>
        {r.name === "inbox"           && <InboxScreen store={store} />}
        {r.name === "productDetail"   && <ProductDetailScreen store={store} productId={r.productId} focus={r.focus} />}
        {r.name === "commentComposer" && <CommentComposerScreen store={store} productId={r.productId} replyTo={r.replyTo} topic={r.topic} />}
        {r.name === "ideaCapture"     && <IdeaCaptureScreen store={store} />}
        {r.name === "pipeline"        && <PipelineScreen store={store} />}
        {r.name === "ideas"           && <IdeasScreen store={store} />}
        {r.name === "people"          && <PeopleScreen store={store} />}
        {r.name === "me"              && <MeScreen store={store} />}
      </div>
      <TabBar store={store} />
      <Toast toast={store.toast} />
    </div>
  );
}

window.MobileApp = MobileApp;
