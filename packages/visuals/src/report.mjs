/* The layout report (CONTRACT-009): every box, text and edge path of a scene, and the colour
   pairs it draws, so checks run on geometry rather than pixels. */

const r2 = (n) => Math.round(n * 100) / 100;

export function report(scene, visual, m) {
  const boxes = [], texts = [], edges = [], colors = [];
  const pairs = new Set();
  const pair = (id, kind, fg, bg) => {
    const key = `${kind}|${JSON.stringify(fg)}|${JSON.stringify(bg)}`;
    if (fg && bg && fg !== "none" && !pairs.has(key)) { pairs.add(key); colors.push({ id, kind, fg, bg }); }
  };
  for (const [z, item] of scene.items.entries()) {
    if (item.box) boxes.push({ id: item.id, kind: item.box.kind, x: r2(item.box.x), y: r2(item.box.y), width: r2(item.box.w), height: r2(item.box.h) });
    if (item.edge) {
      edges.push({ id: item.id, z, from: item.edge.from, to: item.edge.to, points: item.edge.points.map(([x, y]) => [r2(x), r2(y)]), label: item.edge.label ? `${item.id}#label` : item.edge.bundle ? `${item.edge.bundle}#label` : null });
      if (item.edge.label) boxes.push({ id: `${item.id}#label`, kind: "label", x: r2(item.edge.label.x), y: r2(item.edge.label.y), width: r2(item.edge.label.w), height: r2(item.edge.label.h) });
    }
    for (const s of item.shapes) {
      if (s.t === "text") {
        const x = s.anchor === "middle" ? s.x - s.w / 2 : s.anchor === "end" ? s.x - s.w : s.x;
        texts.push({ id: item.id, z, text: s.text, box: s.owner, x: r2(x), y: r2(s.y - s.size * 0.8), width: r2(s.w), height: r2(s.size * 1.05), size: s.size });
        pair(item.id, "text", s.fill, s.on);
      } else if (s.stroke && s.on) pair(item.id, "line", s.stroke, s.on);
    }
  }
  return {
    width: scene.width, height: scene.height, form: `${visual.kind}/${visual.form}`,
    font: { family: m.family, standIn: m.standIn, ...(m.standIn ? { intended: m.intended } : {}) },
    boxes, texts, edges, colors, ...(scene.budget !== undefined ? { budget: scene.budget } : {}),
  };
}
