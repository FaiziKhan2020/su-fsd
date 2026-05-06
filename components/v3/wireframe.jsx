/* global React, RD2, PIPELINE_DATA */
// ============================================================
// Wireframe brief — what Esty receives for every label/box/insert.
// Generated from the product's existing data so each brief has
// real copy, real claims, real regulatory boilerplate, etc.
// Esty opens this, sees every detail, then uploads her design.
// ============================================================

const { useState: useWFState } = React;

// ---- Type-specific layout templates ----------------------------
const LABEL_LAYOUTS = {
  liquid:  { format: "Wraparound bottle label", dieline: "5.0\" w × 3.25\" h, .125\" bleed, .25\" safe", panels: ["Front (hero)", "Right (Supplement Facts)", "Left (Other Ingredients + Directions)", "Back-bridge (UPC)"] },
  capsule: { format: "Front + back jar label",  dieline: "4.5\" w × 2.75\" h, .125\" bleed, .25\" safe", panels: ["Front (hero)", "Back (Supplement Facts + Directions)"] },
  powder:  { format: "Pouch front + back",       dieline: "Pouch face 6\" × 8.5\", .125\" bleed", panels: ["Front (hero + claims)", "Back (Supplement Facts + Directions + Mfg)"] },
  softgel: { format: "Front + back jar label",  dieline: "4.5\" w × 2.75\" h, .125\" bleed, .25\" safe", panels: ["Front (hero)", "Back (Supplement Facts)"] },
  cream:   { format: "Tube + carton label",     dieline: "Tube wrap 4.5\" × 2\", carton net 6\" × 1.5\" × 5\"", panels: ["Tube wrap", "Carton net (front, back, sides, top)"] },
  gummy:   { format: "Front + back jar label",  dieline: "4.75\" w × 3\" h, .125\" bleed, .25\" safe", panels: ["Front (hero)", "Back (Supplement Facts + Warning + Directions)"] },
  tea:     { format: "Carton net",              dieline: "Carton 5.5\" × 3.25\" × 2\" net, .125\" bleed", panels: ["Front", "Back (Supplement Facts)", "Sides", "Top + bottom"] },
};

const BOX_LAYOUTS = {
  liquid:  { format: "Folding carton (tuck-end)", dieline: "Holds 2oz amber bottle. Net 1.5\" × 1.5\" × 5\", tuck-end top + bottom", panels: ["Front", "Back", "Left", "Right", "Top tuck", "Bottom tuck"] },
  capsule: { format: "Folding carton (tuck-end)", dieline: "Holds 60ct jar. Net 2.75\" × 2.75\" × 4.5\", tuck-end top + bottom", panels: ["Front", "Back", "Left", "Right", "Top", "Bottom"] },
  powder:  null, // pouch is its own box
  softgel: { format: "Folding carton (tuck-end)", dieline: "Holds 60ct jar. Net 2.75\" × 2.75\" × 4.5\", tuck-end top + bottom", panels: ["Front", "Back", "Left", "Right", "Top", "Bottom"] },
  cream:   { format: "Folding carton (tuck-end)", dieline: "Holds 1.7oz tube. Net 1.5\" × 1.5\" × 5\", tuck-end top + bottom", panels: ["Front", "Back", "Left", "Right", "Top tuck", "Bottom tuck"] },
  gummy:   { format: "Folding carton (tuck-end)", dieline: "Holds 60ct jar. Net 3\" × 3\" × 4.5\", tuck-end top + bottom", panels: ["Front", "Back", "Left", "Right", "Top", "Bottom"] },
  tea:     null, // tea is sold in its own carton, no outer
};

const INSERT_LAYOUTS = {
  liquid:  { format: "Tri-fold usage card",     dieline: "8.5\" × 3.5\" tri-fold, .125\" bleed, prints 4/4", panels: ["Cover", "How to use", "Stack with", "Routine + warning"] },
  capsule: { format: "Bi-fold usage card",      dieline: "5.5\" × 4.25\" bi-fold, prints 4/4",            panels: ["Cover", "How to use", "Stack + routine", "Warning + contact"] },
  powder:  { format: "Single-sheet card",       dieline: "5\" × 7\" single sheet, prints 4/4",            panels: ["Front: how to mix", "Back: warnings + contact"] },
  softgel: { format: "Bi-fold usage card",      dieline: "5.5\" × 4.25\" bi-fold, prints 4/4",            panels: ["Cover", "How to use", "Stack + routine", "Warning + contact"] },
  cream:   { format: "Single-sheet card",       dieline: "4\" × 6\" single sheet, prints 4/4",            panels: ["Front: how to apply", "Back: ingredients + cautions"] },
  gummy:   { format: "Bi-fold usage card",      dieline: "5.5\" × 4.25\" bi-fold, prints 4/4",            panels: ["Cover", "How to chew + frequency", "Warning (not for under 4)", "Contact"] },
  tea:     { format: "Single-sheet card",       dieline: "5\" × 7\" single sheet, prints 4/4",            panels: ["Front: how to brew", "Back: blend story + caution"] },
};

// ---- Brand voice + colors --------------------------------------
const BRAND_VOICE = {
  PN:  { palette: "Cream + warm peach + sage. Earthy, clinical-clean.", logo: "PN wordmark, lockup horizontal, min 0.75\".", tone: "Honest, science-backed. No exclamations.", typography: "Display: Mariposa Sans 600. Body: Söhne 400/500." },
  DON: { palette: "Off-white + dusty navy + ochre accent.",              logo: "DON monogram + 'DON.' wordmark. Min 0.6\".",  tone: "Premium, slightly editorial. Confident not loud.", typography: "Display: Editorial Old. Body: Inter 400/500." },
  HHH: { palette: "Ivory + clay + forest. Wellness-coded.",              logo: "HHH stacked mark. Min 0.5\".",                tone: "Warm, tactile. Inclusive language.",                typography: "Display: Reckless. Body: Söhne 400." },
};

// ---- Build the wireframe brief object --------------------------
function buildWireframe(p, kind) {
  if (!p) return null;
  const layouts = kind === "label" ? LABEL_LAYOUTS : kind === "box" ? BOX_LAYOUTS : INSERT_LAYOUTS;
  const layout = layouts[p.type];
  if (!layout) return null; // not applicable for this product type

  const brand = BRAND_VOICE[p.brand] || BRAND_VOICE.PN;
  const formula = p.formula || {};
  const ingredients = (formula.ingredients || []).map(i => `${i.name} ${i.dose || ""}`.trim()).filter(Boolean);
  const claims = formula.claims || [];
  const dosage = formula.serving || formula.directions || "Take 1 serving daily.";
  const warning = formula.warning || "Consult a physician before use if pregnant, nursing, or taking medication. Keep out of reach of children.";

  // ---- Per-kind copy blocks ----
  let copy, regulatory, files;
  if (kind === "label") {
    copy = {
      heroClaim: claims[0] || `${p.name} — daily.`,
      productName: p.name,
      brandLockup: `${p.brand} brand mark, ${brand.logo}`,
      bullets: claims.slice(0, 4),
      ingredientPanel: ingredients.length ? ingredients : ["See spec sheet for locked formula"],
      directions: dosage,
      otherIngredients: formula.otherIngredients || "Vegetable cellulose, microcrystalline cellulose, magnesium stearate.",
    };
    regulatory = [
      "Supplement Facts panel must follow 21 CFR 101.36 layout (FDA).",
      "% Daily Value column required for nutrients with established RDIs.",
      "Statement: \"These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.\"",
      "Allergen disclosure if applicable (Big-9 + sesame).",
      "Country-of-origin: Made in USA from domestic and imported ingredients.",
      "Lot # + Best-by date area — leave clear zone 0.75\" × 0.25\" on back panel.",
    ];
    files = [
      "Print-ready PDF (CMYK, .125\" bleed, fonts outlined)",
      "Editable AI source file",
      "Mockup PNG (3D bottle render, 2000×2000, transparent bg)",
    ];
  } else if (kind === "box") {
    copy = {
      heroClaim: claims[0] || p.name,
      productName: p.name,
      brandLockup: brand.logo,
      bullets: claims.slice(0, 3),
      sideCopy: "Brand story / why-this-product (2-3 sentences max).",
      backCopy: "Repeat Supplement Facts from label OR cross-ref \"see label.\" Match label exactly.",
    };
    regulatory = [
      "If full Supplement Facts on box back, must match label exactly.",
      "FDA disclaimer required where claims appear.",
      "UPC barcode area: 1.469\" × 1.02\" min, on back panel near bottom.",
      "Country-of-origin statement.",
      "Recyclability mark (chasing arrows + paperboard).",
    ];
    files = [
      "Print-ready PDF on Insta Print Pack dieline",
      "Dieline overlay PDF (separate layer)",
      "3D mockup render (carton closed, hero angle)",
    ];
  } else {
    copy = {
      heroClaim: `How to get the most from ${p.name}`,
      productName: p.name,
      brandLockup: brand.logo,
      bullets: claims.slice(0, 2),
      howToUse: dosage,
      stackWith: formula.stackWith || "Pairs well with our daily multivitamin and omega-3.",
      routineCopy: "Suggested routine — when to take, with food / on empty stomach, expected timeline to results.",
    };
    regulatory = [
      "FDA disclaimer required.",
      "Warning section required for any product (pregnancy / nursing / medication interaction).",
      "Contact info: customer support email + URL must appear.",
    ];
    files = [
      "Print-ready PDF on Deluxe Printing dieline",
      "Editable AI source file",
    ];
  }

  return {
    kind,
    layout,
    brand: {
      brandId: p.brand,
      palette: brand.palette,
      typography: brand.typography,
      tone: brand.tone,
      logo: brand.logo,
    },
    copy,
    regulatory,
    files,
    references: [
      `Match lighting + style of ${p.brand}'s last approved ${kind} (see asset library).`,
      `Don't deviate from ${p.brand} brand system — palette and type only.`,
    ],
    deliveryTo: kind === "label" ? "Starrk (orders@starrk.com)" : kind === "box" ? "Insta Print Pack (Viraj Patel)" : "Deluxe Printing (sales@deluxeprinting.com)",
  };
}

// ---- Wireframe preview component -------------------------------
function WireframePreview({ p, kind, compact }) {
  const wf = React.useMemo(() => buildWireframe(p, kind), [p, kind]);
  if (!wf) {
    return (
      <div className="wf-empty">
        <span style={{ fontSize: 24, opacity: 0.4 }}>·</span>
        <div>This product type doesn't use a {kind}.</div>
      </div>
    );
  }

  if (compact) {
    // Tight summary for home/list views
    return (
      <div className="wf-compact">
        <div className="wf-compact-h">
          <span className="wf-compact-kind">{kind}</span>
          <span className="wf-compact-format">{wf.layout.format}</span>
        </div>
        <div className="wf-compact-row">
          <span className="wf-compact-label">Hero:</span>
          <span className="wf-compact-val">"{wf.copy.heroClaim}"</span>
        </div>
        <div className="wf-compact-row">
          <span className="wf-compact-label">Panels:</span>
          <span className="wf-compact-val">{wf.layout.panels.length} ({wf.layout.panels.slice(0,2).join(", ")}{wf.layout.panels.length > 2 ? "…" : ""})</span>
        </div>
        <div className="wf-compact-row">
          <span className="wf-compact-label">Brand:</span>
          <span className="wf-compact-val">{wf.brand.brandId} — {wf.brand.palette.split(".")[0]}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="wf-full">
      {/* Header strip */}
      <div className="wf-head">
        <div>
          <div className="wf-head-eyebrow">WIREFRAME · {kind.toUpperCase()}</div>
          <div className="wf-head-title">{p.name}</div>
          <div className="wf-head-sub">{wf.layout.format} · ships to {wf.deliveryTo}</div>
        </div>
        <div className="wf-head-meta">
          <div className="wf-meta-row"><span>Brand</span><b>{wf.brand.brandId}</b></div>
          <div className="wf-meta-row"><span>Type</span><b style={{ textTransform: "capitalize" }}>{p.type}</b></div>
        </div>
      </div>

      {/* Body — sectioned */}
      <div className="wf-section">
        <div className="wf-section-h">1. Layout & dieline</div>
        <div className="wf-kv"><span>Format</span><b>{wf.layout.format}</b></div>
        <div className="wf-kv"><span>Dieline</span><b className="mono" style={{ fontSize: 11.5 }}>{wf.layout.dieline}</b></div>
        <div className="wf-kv">
          <span>Panels</span>
          <div className="wf-chips">
            {wf.layout.panels.map((p, i) => <span key={i} className="wf-chip">{p}</span>)}
          </div>
        </div>
      </div>

      <div className="wf-section">
        <div className="wf-section-h">2. Brand system</div>
        <div className="wf-kv"><span>Palette</span><b>{wf.brand.palette}</b></div>
        <div className="wf-kv"><span>Typography</span><b>{wf.brand.typography}</b></div>
        <div className="wf-kv"><span>Logo</span><b>{wf.brand.logo}</b></div>
        <div className="wf-kv"><span>Tone</span><b>{wf.brand.tone}</b></div>
      </div>

      <div className="wf-section">
        <div className="wf-section-h">3. Copy &amp; content</div>
        <div className="wf-kv"><span>Hero claim</span><b>"{wf.copy.heroClaim}"</b></div>
        <div className="wf-kv"><span>Product name</span><b>{wf.copy.productName}</b></div>
        {wf.copy.bullets?.length > 0 && (
          <div className="wf-kv"><span>Claim bullets</span>
            <ul className="wf-bullets">
              {wf.copy.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}
        {kind === "label" && (
          <>
            <div className="wf-kv"><span>Ingredient panel</span>
              <ul className="wf-bullets">
                {wf.copy.ingredientPanel.map((b, i) => <li key={i} className="mono" style={{ fontSize: 11.5 }}>{b}</li>)}
              </ul>
            </div>
            <div className="wf-kv"><span>Directions</span><b>{wf.copy.directions}</b></div>
            <div className="wf-kv"><span>Other ingredients</span><b style={{ fontWeight: 400, fontSize: 12 }}>{wf.copy.otherIngredients}</b></div>
          </>
        )}
        {kind === "box" && (
          <>
            <div className="wf-kv"><span>Side copy</span><b style={{ fontWeight: 400, fontSize: 12 }}>{wf.copy.sideCopy}</b></div>
            <div className="wf-kv"><span>Back panel</span><b style={{ fontWeight: 400, fontSize: 12 }}>{wf.copy.backCopy}</b></div>
          </>
        )}
        {kind === "insert" && (
          <>
            <div className="wf-kv"><span>How to use</span><b>{wf.copy.howToUse}</b></div>
            <div className="wf-kv"><span>Stack with</span><b style={{ fontWeight: 400, fontSize: 12 }}>{wf.copy.stackWith}</b></div>
            <div className="wf-kv"><span>Routine copy</span><b style={{ fontWeight: 400, fontSize: 12 }}>{wf.copy.routineCopy}</b></div>
          </>
        )}
      </div>

      <div className="wf-section">
        <div className="wf-section-h">4. Regulatory &amp; legal</div>
        <ul className="wf-bullets" style={{ marginTop: 4 }}>
          {wf.regulatory.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div className="wf-section">
        <div className="wf-section-h">5. Files to deliver</div>
        <ul className="wf-bullets" style={{ marginTop: 4 }}>
          {wf.files.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>

      <div className="wf-section" style={{ borderBottom: 0 }}>
        <div className="wf-section-h">6. References</div>
        <ul className="wf-bullets" style={{ marginTop: 4 }}>
          {wf.references.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ---- Upload box (mock, doesn't actually upload) ----------------
function WireframeUpload({ kind, onUpload }) {
  const [hover, setHover] = useWFState(false);
  return (
    <div className={`wf-upload ${hover ? "hover" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => { e.preventDefault(); setHover(false); onUpload?.(); }}
      onClick={() => onUpload?.()}>
      <div className="wf-upload-icon">↑</div>
      <div className="wf-upload-h">Drop your {kind} here</div>
      <div className="wf-upload-sub">PDF, AI, or PNG · or click to browse</div>
    </div>
  );
}

window.RD2 = Object.assign(window.RD2 || {}, {
  buildWireframe,
  WireframePreview,
  WireframeUpload,
});
