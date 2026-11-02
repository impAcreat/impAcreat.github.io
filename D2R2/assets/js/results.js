// Results: main table (Table 1 of the paper) and the generation-order ablation (Table 2).

(function () {
  const METRICS = [
    { key: "pd", label: "Pearson Δ", up: true },
    { key: "lfc", label: "Cos. LogFC", up: true },
    { key: "rank", label: "Cos. LogFC Rank", up: false },
    { key: "pca", label: "Cos. PCA", up: true },
    { key: "kl", label: "Sym. KL", up: false },
  ];

  // [method, venue, [mean, std] x 5]  (order: pd, lfc, rank, pca, kl)
  const MAIN = {
    norman: [
      ["SAMS-VAE", "NeurIPS 2023", [[0.553, 0.079], [0.560, 0.043], [0.028, 0.010], [0.251, 0.042], [50.888, 4.215]]],
      ["Biolord", "Nat. Biotechnol. 2024", [[0.404, 0.069], [0.388, 0.051], [0.046, 0.010], [0.035, 0.016], [0.526, 0.040]]],
      ["STATE", "NeurIPS 2025", [[0.467, 0.020], [0.379, 0.020], [0.525, 0.017], [-0.009, 0.039], [0.273, 0.014]]],
      ["Cell Flow", "bioRxiv 2025", [[0.489, 0.077], [0.373, 0.066], [0.329, 0.013], [0.084, 0.066], [0.207, 0.024]]],
      ["Squidiff", "Nat. Methods 2025", [[0.291, 0.001], [0.226, 0.002], [0.427, 0.007], [0.110, 0.000], [2.861, 0.019]]],
      ["scDFM", "ICLR 2026", [[0.526, 0.010], [0.313, 0.015], [0.379, 0.008], [0.264, 0.032], [0.390, 0.034]]],
      ["D²R²", "Ours", [[0.706, 0.004], [0.724, 0.006], [0.024, 0.006], [0.703, 0.009], [0.148, 0.007]]],
    ],
    h1: [
      ["SAMS-VAE", "NeurIPS 2023", [[0.262, 0.017], [0.231, 0.016], [0.192, 0.028], [0.319, 0.042], [40.638, 3.679]]],
      ["Biolord", "Nat. Biotechnol. 2024", [[0.201, 0.008], [0.159, 0.008], [0.063, 0.007], [0.151, 0.010], [0.240, 0.018]]],
      ["STATE", "NeurIPS 2025", [[0.253, 0.012], [0.178, 0.006], [0.095, 0.006], [0.378, 0.029], [0.272, 0.016]]],
      ["Cell Flow", "bioRxiv 2025", [[0.042, 0.016], [0.028, 0.009], [0.493, 0.013], [0.014, 0.009], [0.089, 0.006]]],
      ["Squidiff", "Nat. Methods 2025", [[0.046, 0.000], [0.049, 0.012], [0.368, 0.032], [-0.008, 0.005], [8.435, 0.372]]],
      ["scDFM", "ICLR 2026", [[0.069, 0.004], [0.038, 0.009], [0.421, 0.029], [0.029, 0.010], [0.390, 0.025]]],
      ["D²R²", "Ours", [[0.271, 0.002], [0.541, 0.004], [0.001, 0.000], [0.358, 0.001], [0.229, 0.002]]],
    ],
  };

  // [order, group, [score, gain % vs Random] x 5]; gains as reported in the paper (computed before rounding).
  const ABLATION = [
    ["Random", "ref", [[0.623, 0], [0.720, 0], [0.032, 0], [0.597, 0], [0.183, 0]]],
    ["Confidence high", "unc", [[0.590, -5.3], [0.537, -25.4], [0.030, 5.2], [0.353, -40.9], [0.410, -124.4]]],
    ["Confidence low", "unc", [[0.672, 7.9], [0.522, -27.5], [0.068, -114.1], [0.640, 7.2], [0.203, -11.0]]],
    ["Entropy high", "unc", [[0.624, 0.2], [0.452, -37.2], [0.073, -130.9], [0.564, -5.6], [0.206, -12.5]]],
    ["Entropy low", "unc", [[0.591, -5.1], [0.538, -25.3], [0.030, 5.2], [0.355, -40.5], [0.399, -118.5]]],
    ["Biological prior", "bio", [[0.706, 13.4], [0.703, -2.3], [0.027, 14.4], [0.699, 17.0], [0.119, 35.0]]],
    ["Reversed prior", "bio", [[0.573, -8.1], [0.533, -26.0], [0.064, -101.8], [0.509, -14.7], [0.197, -7.5]]],
    ["RPM (random init.)", "rpm", [[0.677, 8.6], [0.734, 2.0], [0.026, 19.0], [0.675, 13.1], [0.186, -1.6]]],
    ["RPM (bio init.)", "rpm", [[0.711, 14.2], [0.723, 0.5], [0.020, 35.8], [0.693, 16.1], [0.138, 24.5]]],
  ];
  const GROUP_COLOR = { ref: "--ink-3", unc: "--gray-mark", bio: "--orange", rpm: "--purple" };
  const GROUP_NAME = { ref: "Reference", unc: "Model-uncertainty order", bio: "Biological-prior order", rpm: "Adaptive RPM (GRPO)" };

  const fmt = (v) => v.toFixed(3).replace("-", "−");
  const signed = (v) => (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(1) + "%";
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const arrow = (m) => (m.up ? "↑" : "↓");

  // ---------- main table ----------
  const mainTable = document.getElementById("main-table");

  function renderMain(ds) {
    const rows = MAIN[ds];
    const rank = METRICS.map((m, j) => {
      const vals = rows.map((r) => r[2][j][0]);
      const sorted = [...new Set(vals)].sort((a, b) => (m.up ? b - a : a - b));
      return { best: sorted[0], second: sorted[1] };
    });
    let html = `<thead>
      <tr class="group"><th></th><th colspan="3"><span>Differential expression</span></th><th colspan="2"><span>Absolute expression</span></th></tr>
      <tr><th>Method</th>${METRICS.map((m) => `<th>${m.label} ${arrow(m)}</th>`).join("")}</tr>
    </thead><tbody>`;
    rows.forEach(([name, venue, vals]) => {
      const ours = venue === "Ours";
      html += `<tr${ours ? ' class="ours"' : ""}><td>${name}<span class="venue">${venue}</span></td>`;
      vals.forEach(([mean, std], j) => {
        const cls = mean === rank[j].best ? "best" : mean === rank[j].second ? "second" : "";
        html += `<td><span class="${cls}">${fmt(mean)}</span><span class="pm">±${fmt(std)}</span></td>`;
      });
      html += "</tr>";
    });
    mainTable.innerHTML = html + "</tbody>";
  }

  document.querySelectorAll(".tab[data-ds]").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab[data-ds]").forEach((t) => t.setAttribute("aria-selected", t === tab));
      renderMain(tab.dataset.ds);
    });
  });
  renderMain("norman");

  // ---------- ablation table view ----------
  const abTable = document.getElementById("ablation-table");
  abTable.innerHTML = `<thead><tr><th>Order</th>${METRICS.map((m) => `<th>${m.label} ${arrow(m)}</th>`).join("")}</tr></thead><tbody>` +
    ABLATION.map(([name, g, vals]) => `<tr><td>${name}</td>${vals.map(([s, gain]) =>
      `<td>${fmt(s)}<span class="gain">${g === "ref" ? "ref." : signed(gain)}</span></td>`).join("")}</tr>`).join("") + "</tbody>";

  // ---------- ablation chart ----------
  const tabsEl = document.getElementById("metric-tabs");
  const chartEl = document.getElementById("ablation-chart");
  const tip = document.getElementById("tooltip");
  let metric = 0;

  tabsEl.innerHTML = METRICS.map((m, j) =>
    `<button class="tab" role="tab" type="button" aria-selected="${j === 0}" data-m="${j}">${m.label} ${arrow(m)}</button>`).join("");
  tabsEl.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    metric = +t.dataset.m;
    tabsEl.querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", x === t));
    drawChart();
  }));

  function drawChart() {
    const W = chartEl.clientWidth || 800;
    const narrow = W < 560;
    const labelW = narrow ? 118 : 160;
    const rowH = 34, barH = 18, top = 8, bottom = 26;
    const H = top + ABLATION.length * rowH + bottom;
    const gains = ABLATION.map((r) => r[2][metric][1]);
    const lo = Math.min(0, ...gains), hi = Math.max(0, ...gains);
    const span = hi - lo || 1;
    const padL = (lo < 0 ? 0.16 : 0.04) * span, padR = (hi > 0 ? 0.16 : 0.04) * span;
    const x0 = labelW + 8, x1 = W - 8;
    const x = (v) => x0 + ((v - (lo - padL)) / (span + padL + padR)) * (x1 - x0);
    const ink2 = css("--ink-2"), ink3 = css("--ink-3"), line = css("--line"), lineStrong = css("--line-strong");
    const fs = narrow ? 12 : 13;

    // ticks at clean steps
    const stepRaw = span / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(stepRaw)));
    const tickStep = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= stepRaw);
    const ticks = [];
    for (let t = Math.ceil((lo - padL) / tickStep) * tickStep; t <= hi + padR; t += tickStep) ticks.push(+t.toFixed(6));

    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Relative change versus random order for ${METRICS[metric].label}">`;
    ticks.forEach((t) => {
      svg += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - bottom}" stroke="${t === 0 ? lineStrong : line}" stroke-width="1"/>`;
      svg += `<text x="${x(t)}" y="${H - 8}" fill="${ink3}" font-size="${fs - 1}" text-anchor="middle">${t > 0 ? "+" : t < 0 ? "−" : ""}${Math.abs(t)}%</text>`;
    });
    ABLATION.forEach(([name, g, vals], i) => {
      const [score, gain] = vals[metric];
      const cy = top + i * rowH + rowH / 2;
      const bold = name === "RPM (bio init.)" || name === "Biological prior";
      svg += `<text x="${labelW}" y="${cy + 4}" fill="${css("--ink")}" font-size="${fs}" font-weight="${bold ? 650 : 400}" text-anchor="end">${name}</text>`;
      if (g === "ref") {
        svg += `<text x="${x(0) + 8}" y="${cy + 4}" fill="${ink3}" font-size="${fs - 1}">reference · ${fmt(score)}</text>`;
        return;
      }
      const xa = x(Math.min(0, gain)), xb = x(Math.max(0, gain));
      const w = Math.max(xb - xa, 1.5);
      const r = Math.min(4, w / 2);
      const color = css(GROUP_COLOR[g]);
      // 4px rounded data-end, square at the baseline
      const path = gain >= 0
        ? `M${xa},${cy - barH / 2} h${w - r} a${r},${r} 0 0 1 ${r},${r} v${barH - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - r} z`
        : `M${xb},${cy - barH / 2} h-${w - r} a${r},${r} 0 0 0 -${r},${r} v${barH - 2 * r} a${r},${r} 0 0 0 ${r},${r} h${w - r} z`;
      svg += `<path d="${path}" fill="${color}"/>`;
      const lx = gain >= 0 ? xb + 6 : xa - 6;
      svg += `<text x="${lx}" y="${cy + 4}" fill="${ink2}" font-size="${fs - 1}" text-anchor="${gain >= 0 ? "start" : "end"}" style="font-variant-numeric:tabular-nums">${signed(gain)}</text>`;
      // hit target: whole row
      svg += `<rect x="0" y="${cy - rowH / 2}" width="${W}" height="${rowH}" fill="transparent" data-row="${i}"/>`;
    });
    chartEl.innerHTML = svg + "</svg>";

    chartEl.querySelectorAll("rect[data-row]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const [name, g, vals] = ABLATION[+el.dataset.row];
        const [score, gain] = vals[metric];
        tip.innerHTML = `<b>${name}</b> · ${GROUP_NAME[g]}<br>${METRICS[metric].label} ${fmt(score)} (${signed(gain)} vs. Random ${fmt(ABLATION[0][2][metric][0])})`;
        const box = chartEl.parentElement.getBoundingClientRect();
        const tw = tip.offsetWidth;
        const px = Math.min(Math.max(e.clientX - box.left, tw / 2 + 4), box.width - tw / 2 - 4);
        tip.style.left = `${px}px`;
        tip.style.top = `${e.clientY - box.top}px`;
        tip.classList.add("is-on");
      });
      el.addEventListener("mouseleave", () => tip.classList.remove("is-on"));
    });
  }

  let lastW = 0;
  new ResizeObserver(() => {
    if (chartEl.clientWidth !== lastW) { lastW = chartEl.clientWidth; drawChart(); }
  }).observe(chartEl);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawChart);

  // ---------- BibTeX copy ----------
  const copyBtn = document.getElementById("copy-bib");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(document.getElementById("bib-text").textContent).then(() => {
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });
  });
})();
