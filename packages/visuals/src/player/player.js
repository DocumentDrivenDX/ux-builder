/* The walkthrough player (CONTRACT-009 Presentation): moves between a visual's steps, marks the
   items each step focuses, and glides the SVG's view to them. Plain browser JavaScript with no
   dependencies; the presentation inlines this function's source. */

/**
 * @param {{svg: SVGSVGElement, steps: {id:string,title:string,caption?:string,box:{x:number,y:number,width:number,height:number}}[],
 *   title: HTMLElement, caption: HTMLElement, counter: HTMLElement, prev: HTMLButtonElement, next: HTMLButtonElement,
 *   list?: HTMLElement, root?: Document}} ui
 */
export function createPlayer(ui) {
  const { svg, steps } = ui;
  const doc = ui.root ?? document;
  const full = svg.viewBox.baseVal;
  const home = { x: full.x, y: full.y, width: full.width, height: full.height };
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let index = -1, frame = 0;
  const items = [...svg.querySelectorAll("[data-steps]")];
  const setView = (v) => svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.width} ${v.height}`);
  // Fit the focus with a margin, keeping the stage's aspect ratio, never beyond the whole visual.
  function frameFor(box) {
    if (!box) return home;
    const pad = 48, aspect = home.width / home.height;
    let w = Math.max(box.width + 2 * pad, home.width * 0.45), h = Math.max(box.height + 2 * pad, home.height * 0.45);
    if (w / h > aspect) h = w / aspect; else w = h * aspect;
    w = Math.min(w, home.width); h = Math.min(h, home.height);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    return { x: Math.min(Math.max(cx - w / 2, home.x), home.x + home.width - w), y: Math.min(Math.max(cy - h / 2, home.y), home.y + home.height - h), width: w, height: h };
  }
  function glide(to) {
    cancelAnimationFrame(frame);
    const from = { x: svg.viewBox.baseVal.x, y: svg.viewBox.baseVal.y, width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height };
    if (reduced) return setView(to);
    const start = performance.now(), ms = 650;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms), e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      setView({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, width: from.width + (to.width - from.width) * e, height: from.height + (to.height - from.height) * e });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function go(i) {
    index = Math.max(-1, Math.min(steps.length - 1, i));
    const step = steps[index];
    for (const el of items) {
      const on = !!step && el.getAttribute("data-steps").split(" ").includes(step.id);
      el.classList.toggle("uxb-is-focus", on);
    }
    svg.classList.toggle("uxb-is-stepping", !!step);
    ui.title.textContent = step ? step.title : ui.title.dataset.overview ?? "";
    ui.caption.textContent = step ? step.caption ?? "" : ui.caption.dataset.overview ?? "";
    ui.counter.textContent = step ? `${index + 1} / ${steps.length}` : `${steps.length} steps`;
    ui.prev.disabled = index < 0;
    ui.next.disabled = index >= steps.length - 1;
    if (ui.list) for (const [n, li] of [...ui.list.children].entries()) li.toggleAttribute("aria-current", n === index);
    glide(step ? frameFor(step.box) : home);
  }
  ui.prev.addEventListener("click", () => go(index - 1));
  ui.next.addEventListener("click", () => go(index + 1));
  if (ui.list) for (const [n, li] of [...ui.list.children].entries()) li.querySelector("button")?.addEventListener("click", () => go(n));
  doc.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const move = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, " ": 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 }[event.key];
    if (move) { event.preventDefault(); go(index + move); }
    if (event.key === "Home") { event.preventDefault(); go(-1); }
    if (event.key === "End") { event.preventDefault(); go(steps.length - 1); }
  });
  go(-1);
  return { go, get index() { return index; } };
}
