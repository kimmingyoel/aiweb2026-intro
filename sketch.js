/* ════════════════════════════════════════════════════════════════════════
   sketch.js — the hand-drawn engine, ported from moses-web's <Sketch>.
   Measures every [data-sketch] box and paints a wobbly ink outline behind it,
   so the border feels pen-drawn while the text inside stays crisp.
   No framework, no build step — just one <script defer src="sketch.js">.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const STROKE = { ink: "#262626", soft: "#666666", muted: "#9e9e9e" };

  /* Variant presets — pick the look with a class, tweak with data-* overrides. */
  const VARIANTS = {
    "sk--card":  { radius: 18, fill: "#ffffff", stroke: "ink",  sw: 2.4, shadow: "soft", seed: 7 },
    "sk--note":  { radius: 16, fill: "#f5f5f5", stroke: "ink",  sw: 2.3, shadow: "drop", seed: 11 },
    "sk--ink":   { radius: 22, fill: "#262626", stroke: "ink",  sw: 2.4, shadow: "drop", seed: 5 },
    "sk--ghost": { radius: 18, fill: "transparent", stroke: "soft", sw: 2.2, shadow: "none", seed: 23 },
    "sk--tag":   { radius: 10, fill: "#ffffff", stroke: "soft", sw: 2.1, shadow: "none", seed: 14 },
    "sk--photo": { radius: 10, fill: "#ffffff", stroke: "ink",  sw: 2.4, shadow: "drop", seed: 31 },
    "sk--badge": { radius: 9999, fill: "#f5f5f5", stroke: "ink", sw: 2.3, shadow: "soft", seed: 41 },
    "sk--badge-ink": { radius: 9999, fill: "#262626", stroke: "ink", sw: 2.3, shadow: "drop", seed: 42 },
  };

  /* ── deterministic noise so a box redraws identically ── */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function linePath(sx, sy, ex, ey, rand, wobble, segs, axis) {
    const dx = ex - sx, dy = ey - sy;
    const out = ["M " + sx.toFixed(2) + " " + sy.toFixed(2)];
    for (let i = 1; i <= segs; i++) {
      const t = i / segs;
      let x = sx + dx * t, y = sy + dy * t;
      const j = (rand() - 0.5) * 2 * wobble;
      if (axis === "x") y += j; else x += j;
      out.push("L " + x.toFixed(2) + " " + y.toFixed(2));
    }
    return out.join(" ");
  }

  function cornerArc(fx, fy, tx, ty, r, sweep) {
    return "M " + fx.toFixed(2) + " " + fy.toFixed(2) +
      " A " + r.toFixed(2) + " " + r.toFixed(2) + " 0 0 " + sweep +
      " " + tx.toFixed(2) + " " + ty.toFixed(2);
  }

  function buildRect(w0, h0, radius, wobble, seed) {
    const w = Math.max(w0, 4), h = Math.max(h0, 4);
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    const rand = mulberry32(seed);
    const longSide = Math.max(w, h);
    const segs = Math.max(3, Math.round(Math.max(longSide / 28, 4)));

    const top = linePath(r, 0, w - r, 0, rand, wobble, segs, "x");
    const bottom = linePath(r, h, w - r, h, rand, wobble, segs, "x");
    const left = linePath(0, h - r, 0, r, rand, wobble, segs, "y");
    const right = linePath(w, r, w, h - r, rand, wobble, segs, "y");

    const has = r > 0;
    const tl = has ? cornerArc(0, r, r, 0, r + (rand() - 0.5) * wobble, 1) : "";
    const tr = has ? cornerArc(w - r, 0, w, r, r + (rand() - 0.5) * wobble, 1) : "";
    const br = has ? cornerArc(w, h - r, w - r, h, r + (rand() - 0.5) * wobble, 1) : "";
    const bl = has ? cornerArc(r, h, 0, h - r, r + (rand() - 0.5) * wobble, 1) : "";

    const fill = [
      "M " + r + " 0", "L " + (w - r) + " 0",
      "A " + r + " " + r + " 0 0 1 " + w + " " + r,
      "L " + w + " " + (h - r),
      "A " + r + " " + r + " 0 0 1 " + (w - r) + " " + h,
      "L " + r + " " + h,
      "A " + r + " " + r + " 0 0 1 0 " + (h - r),
      "L 0 " + r,
      "A " + r + " " + r + " 0 0 1 " + r + " 0", "Z",
    ].join(" ");

    return { fill: fill, edges: [top, right, bottom, left], corners: [tl, tr, br, bl] };
  }

  /* diagonal pen hatching (Scribble=True) clipped to the rect */
  function buildScribble(w, h, gap, wobble, seed) {
    const rand = mulberry32(seed);
    const out = [];
    let first = true, dir = 1;
    for (let c = -h; c <= w + h; c += gap) {
      const ax = c, ay = 0, bx = c + h, by = h;
      const p1x = (dir > 0 ? ax : bx) + (rand() - 0.5) * wobble;
      const p1y = (dir > 0 ? ay : by) + (rand() - 0.5) * wobble;
      const p2x = (dir > 0 ? bx : ax) + (rand() - 0.5) * wobble;
      const p2y = (dir > 0 ? by : ay) + (rand() - 0.5) * wobble;
      out.push((first ? "M " : "L ") + p1x.toFixed(1) + " " + p1y.toFixed(1));
      out.push("L " + p2x.toFixed(1) + " " + p2y.toFixed(1));
      first = false;
      dir *= -1;
    }
    return out.join(" ");
  }

  let uidSeq = 0;

  function readConfig(el) {
    let cfg = { radius: 14, fill: "#f5f5f5", stroke: "ink", sw: 2.4, shadow: "none", seed: 7 };
    for (const cls in VARIANTS) {
      if (el.classList.contains(cls)) { cfg = Object.assign({}, VARIANTS[cls]); break; }
    }
    const d = el.dataset;
    if (d.radius)  cfg.radius = parseFloat(d.radius);
    if (d.fill)    cfg.fill = d.fill;
    if (d.stroke)  cfg.stroke = d.stroke;
    if (d.sw)      cfg.sw = parseFloat(d.sw);
    if (d.shadow)  cfg.shadow = d.shadow;
    if (d.seed)    cfg.seed = parseInt(d.seed, 10);
    cfg.wobble = d.wobble ? parseFloat(d.wobble) : 0.5;
    cfg.dashed = d.dashed != null;
    cfg.scribble = d.scribble != null;
    return cfg;
  }

  function paint(el, bg) {
    const rect = el.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (w < 2 || h < 2) return false;

    const cfg = readConfig(el);
    const paths = buildRect(w, h, cfg.radius, cfg.wobble, cfg.seed);
    const uid = "sk" + (uidSeq++);

    let defs = "";
    if (cfg.shadow !== "none") {
      const dy = cfg.shadow === "drop" ? 3 : 2;
      const blur = cfg.shadow === "drop" ? 0.6 : 0.35;
      const op = cfg.shadow === "drop" ? 0.22 : 0.16;
      defs +=
        '<filter id="' + uid + 's" x="-6%" y="-6%" width="112%" height="118%">' +
        '<feOffset dx="0" dy="' + dy + '"/>' +
        '<feGaussianBlur stdDeviation="' + blur + '"/>' +
        '<feColorMatrix type="matrix" values="0 0 0 0 0.149 0 0 0 0 0.149 0 0 0 0 0.149 0 0 0 ' + op + ' 0"/>' +
        '<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    }
    if (cfg.scribble) {
      defs += '<clipPath id="' + uid + 'c"><path d="' + paths.fill + '"/></clipPath>';
    }

    const strokeColor = STROKE[cfg.stroke] || cfg.stroke;
    let inner = "";
    inner += '<path d="' + paths.fill + '" fill="' + cfg.fill + '"' +
      (cfg.shadow !== "none" ? ' filter="url(#' + uid + 's)"' : "") + "/>";

    if (cfg.scribble) {
      const sc = buildScribble(w, h, 7, 1, cfg.seed + 3);
      inner += '<g clip-path="url(#' + uid + 'c)"><path d="' + sc + '" stroke="' + strokeColor +
        '" stroke-width="1.7" stroke-linecap="round" fill="none" vector-effect="non-scaling-stroke"/></g>';
    }

    const dash = cfg.dashed ? ' stroke-dasharray="9 7"' : "";
    inner += '<g stroke="' + strokeColor + '" stroke-width="' + cfg.sw +
      '" stroke-linecap="round" stroke-linejoin="round" fill="none"' + dash + '>';
    paths.edges.forEach(function (d) { if (d) inner += '<path d="' + d + '" vector-effect="non-scaling-stroke"/>'; });
    paths.corners.forEach(function (d) { if (d) inner += '<path d="' + d + '" vector-effect="non-scaling-stroke"/>'; });
    inner += "</g>";

    bg.innerHTML =
      '<svg width="100%" height="100%" viewBox="0 0 ' + w + " " + h +
      '" preserveAspectRatio="none" fill="none" style="display:block;overflow:visible">' +
      (defs ? "<defs>" + defs + "</defs>" : "") + inner + "</svg>";

    el.style.borderColor = "transparent"; // hide the no-JS fallback border
    return true;
  }

  function setup(el) {
    if (el.__skReady) return;
    el.__skReady = true;

    // Wrap existing children so content sits above the painted background.
    const content = document.createElement("div");
    content.className = "sk__content";
    while (el.firstChild) content.appendChild(el.firstChild);
    const bg = document.createElement("div");
    bg.className = "sk__bg";
    bg.setAttribute("aria-hidden", "true");
    el.appendChild(bg);
    el.appendChild(content);

    let scheduled = false, last = null;
    const repaint = function () {
      scheduled = false;
      const r = el.getBoundingClientRect();
      if (last && Math.abs(r.width - last.w) < 2 && Math.abs(r.height - last.h) < 2) return;
      if (paint(el, bg)) last = { w: r.width, h: r.height };
    };
    const schedule = function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(repaint);
    };

    schedule();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(schedule);
      ro.observe(el);
    } else {
      window.addEventListener("resize", schedule);
    }
  }

  function init() {
    document.querySelectorAll("[data-sketch]").forEach(setup);
    // Boxes settle once the (large) handwriting webfont swaps in.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        document.querySelectorAll("[data-sketch]").forEach(function (el) {
          if (el.__skReady && el.querySelector(".sk__bg")) {
            const bg = el.querySelector(".sk__bg");
            requestAnimationFrame(function () { paint(el, bg); });
          }
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
