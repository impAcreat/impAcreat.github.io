// Framework figure: inline the SVG, tag each drawn element by the component it
// belongs to, and let the component cards dim everything else.
// gen = MDDM, rpm = Regulatory Policy Module, io = shared inputs, loop and output.

(function () {
  const box = document.getElementById("fw-svg");
  if (!box) return;
  const cards = document.querySelectorAll(".pillar[data-focus]");

  // Regions in figure points (fig2.pdf coordinates).
  function region(x0, y0, x1, y1) {
    if (x1 - x0 > 200 || y1 - y0 > 200) return null; // page and panel backgrounds
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (cx >= 266) return "rpm"; // biological prior + RL optimized panels
    if (cx >= 186 && cy >= 44 && cy <= 88) return "rpm"; // pi bars and links into them
    if (cx >= 92 && cx <= 186 && cy >= 52 && cy <= 88) return "rpm"; // Regulatory Policy box
    if (cx >= 92 && cx <= 186 && cy >= 100 && cy <= 130) return "gen"; // MDDM box
    if (cx >= 46 && cx <= 262 && cy >= 128 && cy <= 212) return "gen"; // fan-out + trajectory
    return "io";
  }

  function tag(svg) {
    const vb = svg.viewBox.baseVal;
    const s = svg.getBoundingClientRect();
    const k = vb.width / s.width;
    svg.querySelectorAll("path, use, image").forEach((el) => {
      if (el.closest("defs, clipPath, mask")) return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      const part = region(
        vb.x + (r.left - s.left) * k, vb.y + (r.top - s.top) * k,
        vb.x + (r.right - s.left) * k, vb.y + (r.bottom - s.top) * k);
      if (part) el.classList.add(`r-${part}`);
    });
  }

  fetch(box.dataset.src)
    .then((r) => r.text())
    .then((text) => {
      const alt = box.querySelector("img").alt;
      box.innerHTML = text;
      const svg = box.querySelector("svg");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", alt);
      tag(svg);
    })
    .catch(() => {}); // keep the <img> fallback

  function focus(part) {
    box.dataset.focus = part || "";
    cards.forEach((c) => {
      const on = c.dataset.focus === part;
      c.setAttribute("aria-pressed", on);
      c.classList.toggle("is-dimmed", !!part && !on);
    });
  }

  cards.forEach((card) => {
    const toggle = () => focus(box.dataset.focus === card.dataset.focus ? "" : card.dataset.focus);
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") focus("");
    });
  });
})();
