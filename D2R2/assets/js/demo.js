// Inference animation, driven by a trajectory JSON:
// {
//   illustrative: bool, condition: str, num_bins: int,
//   genes:  [{name, regulator}],            // genes shown, one column each
//   tokens: [bin per gene],                 // final predicted token (0 .. num_bins-1)
//   steps:  [{selected: [gene idx], scores: [pi or null per gene]}]
// }
// Swapping in a real trajectory only means pointing data-src at another file.

(function () {
  const root = document.getElementById("demo");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const grid = $("demo-grid");
  const stepEl = $("demo-step");
  const caption = $("demo-caption");
  const progress = $("demo-progress");
  const playBtn = $("demo-play");

  const DURATION = { start: 1400, score: 900, select: 900, fill: 1500, end: 3200 };
  const params = new URLSearchParams(location.search);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let data, frames, cols = [];
  let frame = 0, timer = null, playing = false, visible = true;

  fetch(root.dataset.src)
    .then((r) => r.json())
    .then(init)
    .catch(() => { caption.textContent = "Could not load the animation data."; });

  function init(d) {
    data = d;
    const n = d.genes.length;
    grid.style.setProperty("--n", n);
    if (!d.illustrative) $("demo-chip").textContent = d.condition;

    // Frames: start, then (score, select, fill) per step, then end.
    frames = [{ phase: "start", k: -1 }];
    d.steps.forEach((_, k) => ["score", "select", "fill"].forEach((phase) => frames.push({ phase, k })));
    frames.push({ phase: "end", k: d.steps.length });

    // resolvedAt[i] = step at which gene i is filled
    d.resolvedAt = new Array(n).fill(Infinity);
    d.steps.forEach((s, k) => s.selected.forEach((i) => { d.resolvedAt[i] = k; }));

    buildGrid(n);
    bindControls();

    if (params.has("frame")) {
      render(Math.min(+params.get("frame") || 0, frames.length - 1));
      return;
    }
    if (reduceMotion) {
      render(frames.findIndex((f) => f.phase === "fill"));
      setPlaying(false);
      return;
    }
    render(0);
    setPlaying(true);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) stopTimer();
      else if (playing) schedule();
    }, { threshold: 0.25 }).observe(root);
  }

  function buildGrid(n) {
    const html = [];
    html.push('<div class="row-label">RPM priority <i>π</i></div>');
    for (let i = 0; i < n; i++) html.push(`<div class="col-bar" data-i="${i}"><div class="bar"></div></div>`);
    html.push('<div class="baseline-spacer"></div><div class="baseline"></div>');
    html.push('<div class="row-label">Expression token</div>');
    for (let i = 0; i < n; i++) html.push(`<div class="token" data-i="${i}"></div>`);
    html.push('<div class="row-label">Gene</div>');
    data.genes.forEach((g) => html.push(`<div class="gene${g.regulator ? " is-reg" : ""}">${g.name}</div>`));
    grid.innerHTML = html.join("");
    cols = data.genes.map((_, i) => ({
      bar: grid.querySelector(`.col-bar[data-i="${i}"]`),
      token: grid.querySelector(`.token[data-i="${i}"]`),
    }));
  }

  function render(f) {
    frame = f;
    const { phase, k } = frames[f];
    const K = data.steps.length;
    const step = data.steps[k];
    const picked = new Set(step && phase !== "score" ? step.selected : []);
    const scores = step ? step.scores : [];
    const maxScore = Math.max(...scores.filter((s) => s != null), 1e-9);

    cols.forEach((c, i) => {
      const at = data.resolvedAt[i];
      const filled = phase === "end" || at < k || (phase === "fill" && at === k);
      const showBar = step && at >= k && scores[i] != null && !(phase === "fill" && at === k);
      c.bar.classList.toggle("is-picked", picked.has(i));
      c.bar.firstChild.style.height = showBar ? `${(scores[i] / maxScore) * 100}%` : "0";
      c.token.classList.toggle("is-filled", filled);
      c.token.classList.toggle("is-new", phase === "fill" && at === k);
      if (filled) c.token.dataset.bin = data.tokens[i];
      else delete c.token.dataset.bin;
    });

    const done = data.resolvedAt.filter((at) => phase === "end" || at < k || (phase === "fill" && at === k)).length;
    progress.style.width = `${(done / data.genes.length) * 100}%`;
    const shown = phase === "start" ? 0 : phase === "end" ? K : k + 1;
    stepEl.innerHTML = `Step <b>${shown}</b> / ${K}`;
    caption.innerHTML = captionFor(phase, k, step);
  }

  function captionFor(phase, k, step) {
    const n = data.genes.length;
    const tag = (txt) => `<span class="k">${txt}</span>`;
    if (phase === "start") return `${tag("Start")}All ${n} genes are masked. The model is conditioned on the control profile <i>c</i>, the perturbation <i>p</i> and covariates <i>z</i>.`;
    if (phase === "end") return `${tag("Done")}All genes are resolved. Each token is decoded to its bin's representative value, giving the predicted perturbed profile.`;
    const b = step.selected.length;
    const regs = step.selected.filter((i) => data.genes[i].regulator).length;
    const s = tag(`Step ${k + 1}`);
    if (phase === "score") return `${s}RPM computes an unmasking priority for every still-masked gene from the partial profile, the perturbation and covariates.`;
    if (phase === "select") {
      const what = regs === b ? "all regulatory genes" : regs > 0 ? `${regs} regulatory, ${b - regs} regulated` : "all regulated genes";
      return `${s}The top ${b} genes are selected: ${what}.`;
    }
    return `${s}Their tokens, sampled by MDDM, are committed. They stay fixed and condition the genes still masked.`;
  }

  // ---- playback ----
  function schedule() {
    stopTimer();
    if (!playing || !visible) return;
    timer = setTimeout(() => {
      render((frame + 1) % frames.length);
      schedule();
    }, DURATION[frames[frame].phase]);
  }
  function stopTimer() { clearTimeout(timer); timer = null; }
  function setPlaying(on) {
    playing = on;
    playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    playBtn.querySelector(".i-pause").toggleAttribute("hidden", !on);
    playBtn.querySelector(".i-play").toggleAttribute("hidden", on);
    if (on) schedule(); else stopTimer();
  }

  // Step buttons jump between "fill" frames (one click = one generation step).
  function jump(dir) {
    const stops = frames.map((f, i) => (f.phase === "fill" || f.phase === "start" || f.phase === "end" ? i : -1)).filter((i) => i >= 0);
    const cur = dir > 0 ? stops.find((i) => i > frame) : [...stops].reverse().find((i) => i < frame);
    if (cur != null) render(cur);
  }

  function bindControls() {
    playBtn.addEventListener("click", () => {
      if (!playing && frames[frame].phase === "end") render(0);
      setPlaying(!playing);
    });
    $("demo-next").addEventListener("click", () => { setPlaying(false); jump(1); });
    $("demo-prev").addEventListener("click", () => { setPlaying(false); jump(-1); });
    $("demo-restart").addEventListener("click", () => { render(0); setPlaying(true); });
  }
})();
