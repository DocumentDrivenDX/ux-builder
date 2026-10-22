/* The layer a walkthrough video's replay puts above the app (FEAT-013 REP-04,
   PRV-01, PRV-02; ADR-031 decisions 3 and 6). Installed with
   context.addInitScript, so it is on every page before the app's first
   paint. It lives in a closed shadow root with no pointer events, so the
   app's styles cannot reach it and clicks pass through it.

   It does three things:
   - masks every element matching the manifest's evidence.redact selectors
     (and every password field), and every run of text matching its
     patterns, with solid boxes, re-measured every frame;
   - draws a cursor and a mark where it clicks;
   - shows an opaque card (a chapter's title, a stop, the end) over the app.

   An app's modal dialog or popover is in the browser's top layer, above
   any z-index; the layer is a popover too, and raises itself above each one
   the app opens, so masks and cards stay on top.

   It is never installed during an inspection; it draws no annotation (the
   annotations are the timeline's, ADR-031 decision 3). window.__piqVideo.ok
   says it is installed; the replay records nothing without it. */

export function layer({ selectors = [], text = [] } = {}) {
  if (window.top !== window) return;
  const masks = ["input[type=password]", ...selectors];
  const patterns = text.map((t) => { try { return new RegExp(t, "g"); } catch { return null; } }).filter(Boolean);
  let host, root, maskBox, cursor, card, ranges = [], scanQueued = false;

  const build = () => {
    host = document.createElement("piq-video-layer");
    host.style.cssText = "all: initial; position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0; border: 0; padding: 0; background: transparent; overflow: visible; z-index: 2147483647; pointer-events: none; display: block;";
    host.setAttribute("popover", "manual");
    root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      .masks > div { position: fixed; background: #1f2328; border-radius: 2px; }
      .cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; transform: translate(-100px, -100px); transition: transform var(--move, 600ms) cubic-bezier(.3,.1,.2,1); }
      .cursor svg { display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
      .ripple { position: fixed; width: 36px; height: 36px; margin: -18px 0 0 -18px; border: 3px solid #f5a524; border-radius: 50%; animation: ripple 600ms ease-out forwards; }
      @keyframes ripple { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
      .card { position: fixed; inset: 0; display: none; place-content: center; gap: 12px; padding: 48px; background: #12161c; color: #f2f4f7; font: 400 20px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
      .card.on { display: grid; }
      .card h1 { margin: 0; font-size: 38px; font-weight: 650; letter-spacing: -.01em; }
      .card h2 { margin: 0; font-size: 26px; font-weight: 600; }
      .card p { margin: 0; color: #c3cad5; }
      .card .kicker { font-size: 15px; letter-spacing: .08em; text-transform: uppercase; color: #f5a524; }
      .card ul { margin: 8px auto 0; padding: 0; list-style: none; text-align: left; max-width: 900px; }
      .card li { margin: 6px 0; color: #e3e7ee; }
    </style><div class="masks"></div><div class="cursor"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M3 2l15 8.5-6.6 1.6L8.6 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg></div><div class="card" role="presentation"></div>`;
    maskBox = root.querySelector(".masks");
    cursor = root.querySelector(".cursor");
    card = root.querySelector(".card");
  };
  // On top of the top layer: shown as a popover, and shown again after any
  // modal or popover the app opens later (the last shown is on top).
  let above = "";
  const raise = () => { try { if (host.matches(":popover-open")) host.hidePopover(); host.showPopover(); } catch { /* no popover API: z-index only */ } };
  const attach = () => {
    if (!host.isConnected) { document.documentElement?.appendChild(host); above = ""; raise(); }
    const top = [...document.querySelectorAll(":modal, :popover-open")].filter((e) => e !== host);
    const now = top.length + ":" + top.map((e) => e.tagName + (e.id || "")).join(",");
    if (now !== above) { above = now; if (top.length) raise(); }
  };

  // Text that matches a pattern, as ranges re-measured each frame.
  const scan = () => {
    scanQueued = false;
    if (!patterns.length || !document.body) return;
    const found = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const v = n.nodeValue;
      if (!v || !v.trim()) continue;
      for (const re of patterns) {
        re.lastIndex = 0;
        for (let m = re.exec(v); m; m = re.exec(v)) {
          if (!m[0]) { re.lastIndex++; continue; }
          const r = document.createRange();
          r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
          found.push(r);
        }
      }
    }
    ranges = found;
  };
  const queueScan = () => { if (!scanQueued) { scanQueued = true; queueMicrotask(scan); } };

  const frame = () => {
    attach();
    const rects = [];
    for (const sel of masks) { let list = []; try { list = document.querySelectorAll(sel); } catch { /* not a selector */ } for (const e of list) rects.push(...e.getClientRects()); }
    for (const r of ranges) rects.push(...r.getClientRects());
    const boxes = rects.filter((r) => r.width > 0 && r.height > 0);
    while (maskBox.children.length < boxes.length) maskBox.appendChild(document.createElement("div"));
    [...maskBox.children].forEach((d, i) => {
      const r = boxes[i];
      if (!r) { d.style.display = "none"; return; }
      d.style.cssText = `display:block;left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px`;
    });
    requestAnimationFrame(frame);
  };

  build();
  const start = () => {
    attach();
    new MutationObserver(queueScan).observe(document, { subtree: true, childList: true, characterData: true });
    scan();
    frame();
    window.__piqVideo.ok = true;
  };
  window.__piqVideo = {
    ok: false,
    addMask(sel) { masks.push(sel); },
    move(x, y, ms = 600) { cursor.style.setProperty("--move", `${ms}ms`); cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`; },
    mark(x, y) { const r = document.createElement("div"); r.className = "ripple"; r.style.left = `${x}px`; r.style.top = `${y}px`; root.appendChild(r); setTimeout(() => r.remove(), 700); },
    card(html) { if (html == null) { card.classList.remove("on"); card.innerHTML = ""; } else { card.innerHTML = html; card.classList.add("on"); } },
  };
  if (document.documentElement) start();
  else document.addEventListener("readystatechange", start, { once: true });
}
