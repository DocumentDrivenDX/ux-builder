/* A unified diff of two texts, as `git apply` and `patch -p1` read it
   (FEAT-012 DRF-01). Internal to @ux-builder/ui/blueprint. Deterministic:
   the same texts give the same patch. */

const lines = (t) => (t === "" ? [] : t.replace(/\n$/, "").split("\n"));

/* The edit script from a to b: [op, line] with op " ", "-" or "+". */
function script(a, b) {
  // Trim the common head and tail, then an LCS table over what is left.
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const A = a.slice(s, a.length - e), B = b.slice(s, b.length - e);
  const n = A.length, m = B.length;
  const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = A[i] === B[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out = a.slice(0, s).map((l) => [" ", l]);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push([" ", A[i]]); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push(["-", A[i++]]);
    else out.push(["+", B[j++]]);
  }
  while (i < n) out.push(["-", A[i++]]);
  while (j < m) out.push(["+", B[j++]]);
  return out.concat(a.slice(a.length - e).map((l) => [" ", l]));
}

/* A patch turning `before` (null for a new file) into `after` at `path`
   (relative to the repository root), with three lines of context; "" when
   they are the same. */
export function unifiedDiff(path, before, after, context = 3) {
  if (before === after) return "";
  const a = lines(before ?? ""), b = lines(after);
  const ops = script(a, b);
  const hunks = [];
  let cur = null, ai = 0, bi = 0, since = Infinity;
  ops.forEach(([op, l], k) => {
    if (op !== " ") {
      if (!cur) {
        const back = Math.min(context, ops.slice(0, k).length, since === Infinity ? context : context);
        const pre = [];
        for (let q = k - 1, c = 0; q >= 0 && c < back && ops[q][0] === " "; q--, c++) pre.unshift(ops[q]);
        cur = { a: ai - pre.length, b: bi - pre.length, lines: pre.map(([o, x]) => o + x) };
        hunks.push(cur);
      }
      cur.lines.push(op + l);
      since = 0;
    } else if (cur) {
      // Context after a change: keep up to 2 * context to join nearby changes, then close.
      const ahead = ops.slice(k, k + 2 * context + 1).some(([o]) => o !== " ");
      if (since < context || ahead) { cur.lines.push(" " + l); since++; }
      else cur = null;
    }
    if (op !== "+") ai++;
    if (op !== "-") bi++;
  });
  const range = (start, count) => `${count === 0 ? start : start + 1}${count === 1 ? "" : `,${count}`}`;
  const head = before == null
    ? [`diff --git a/${path} b/${path}`, "new file mode 100644", "--- /dev/null", `+++ b/${path}`]
    : [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
  const body = hunks.map((h) => {
    const ac = h.lines.filter((l) => l[0] !== "+").length, bc = h.lines.filter((l) => l[0] !== "-").length;
    return [`@@ -${range(h.a, ac)} +${range(h.b, bc)} @@`, ...h.lines].join("\n");
  });
  return [...head, ...body].join("\n") + "\n";
}
