/* ==========================================================================
   THE LOG — CHARTS
   Plain SVG, no dependency. Kept intentionally simple: a handful of
   readable shapes rather than a full charting engine, per §41
   ("clean, smooth, minimal — not Excel").
   ========================================================================== */

export function ringSVG(percent, size = 96, stroke = 10) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;
  return `
    <svg class="ring" role="img" aria-label="${Math.round(percent)} percent complete" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"></circle>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
    </svg>`;
}

export function lineChartSVG(values, labels, { width = 640, height = 220, pad = 28 } = {}) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y];
  });

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`;

  const dots = points
    .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="white"></circle>`)
    .join("");

  const labelEls = labels
    .map((l, i) => `<text x="${points[i][0].toFixed(1)}" y="${height - 6}" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">${l}</text>`)
    .join("");

  return `
    <svg role="img" aria-label="Progress line chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <path d="${area}" fill="rgba(255,255,255,0.12)" stroke="none"></path>
      <path d="${path}" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path>
      ${dots}
      ${labelEls}
    </svg>`;
}

export function barChartSVG(values, labels, { width = 640, height = 220, pad = 28 } = {}) {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const barW = (width - pad * 2) / values.length;
  const bars = values
    .map((v, i) => {
      const h = (v / max) * (height - pad * 2);
      const x = pad + i * barW + barW * 0.18;
      const y = height - pad - h;
      const w = barW * 0.64;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="white" opacity="0.9"></rect>`;
    })
    .join("");
  const labelEls = labels
    .map((l, i) => {
      const x = pad + i * barW + barW / 2;
      return `<text x="${x.toFixed(1)}" y="${height - 6}" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">${l}</text>`;
    })
    .join("");
  return `
    <svg role="img" aria-label="Activity bar chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      ${bars}
      ${labelEls}
    </svg>`;
}
