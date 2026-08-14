// Hand-rolled, dependency-free SVG chart builders for the PDF report.
// We avoid client-side chart libraries here because the PDF is rendered by a
// headless browser from a static HTML string — plain SVG guarantees pixel-perfect,
// deterministic output with zero runtime JS required.

export interface ChartTheme {
  primary: string;
  accent: string;
  grid: string;
  text: string;
  muted: string;
}

export const defaultTheme: ChartTheme = {
  primary: "#0B3B37",
  accent: "#C9A24B",
  grid: "#E7E2D6",
  text: "#1F2422",
  muted: "#8A8578",
};

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toFixed(0);
}

/**
 * Grouped bar chart — used for property value growth per year.
 */
export function barChart(
  data: { label: string; value: number }[],
  opts: { width?: number; height?: number; theme?: ChartTheme; valuePrefix?: string } = {}
): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? 280;
  const theme = opts.theme ?? defaultTheme;
  const padding = { top: 24, right: 16, bottom: 36, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1) * 1.15;
  const barGap = 14;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;

  const bars = data
    .map((d, i) => {
      const barH = (d.value / maxVal) * chartH;
      const x = padding.left + i * (barW + barGap);
      const y = padding.top + (chartH - barH);
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="url(#barGrad)" />
        <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="11" font-weight="600" fill="${theme.text}">${opts.valuePrefix ?? ""}${fmtCompact(d.value)}</text>
        <text x="${x + barW / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="${theme.muted}">${d.label}</text>
      `;
    })
    .join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme.accent}" />
        <stop offset="100%" stop-color="${theme.primary}" />
      </linearGradient>
    </defs>
    <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="${theme.grid}" stroke-width="1" />
    ${bars}
  </svg>`;
}

/**
 * Multi-series line chart — used to compare subject project vs. comparable
 * projects, normalized to an index (rebased to 100 at the first data point).
 */
export function lineChart(
  series: { name: string; color: string; points: { x: number; y: number }[] }[],
  opts: { width?: number; height?: number; theme?: ChartTheme; yLabel?: string } = {}
): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? 280;
  const theme = opts.theme ?? defaultTheme;
  const padding = { top: 20, right: 20, bottom: 34, left: 44 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const allX = series.flatMap((s) => s.points.map((p) => p.x));
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const dataMinY = Math.min(...allY);
  const dataMaxY = Math.max(...allY);
  const yRange = Math.max(1, dataMaxY - dataMinY);
  const minY = dataMinY - yRange * 0.15;
  const maxY = dataMaxY + yRange * 0.15;

  const sx = (x: number) => padding.left + ((x - minX) / Math.max(1, maxX - minX)) * chartW;
  const sy = (y: number) => padding.top + chartH - ((y - minY) / Math.max(1, maxY - minY)) * chartH;

  const gridLines = Array.from({ length: 4 }, (_, i) => {
    const y = padding.top + (chartH / 3) * i;
    const val = maxY - ((maxY - minY) / 3) * i;
    return `
      <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="${theme.grid}" stroke-width="1" />
      <text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="${theme.muted}">${fmtCompact(val)}</text>
    `;
  }).join("");

  const xLabels = Array.from(new Set(allX)).sort((a, b) => a - b);
  const xLabelSvgs = xLabels
    .map((x) => `<text x="${sx(x)}" y="${height - 10}" text-anchor="middle" font-size="10" fill="${theme.muted}">${x}</text>`)
    .join("");

  const lines = series
    .map((s) => {
      const path = s.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
        .join(" ");
      const dots = s.points
        .map((p) => `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3.5" fill="${s.color}" />`)
        .join("");
      return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />${dots}`;
    })
    .join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}
    ${lines}
    ${xLabelSvgs}
  </svg>`;
}

/**
 * HTML (non-SVG) legend row for a multi-series chart — kept as plain HTML
 * rather than packed into the SVG so long series names wrap naturally instead
 * of overlapping or getting clipped.
 */
export function htmlLegend(series: { name: string; color: string }[]): string {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const items = series
    .map(
      (s) =>
        `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:18px;">
           <span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block;"></span>
           <span style="font-size:11px;">${esc(s.name)}</span>
         </span>`
    )
    .join("");
  return `<div style="display:flex;flex-wrap:wrap;margin-top:8px;">${items}</div>`;
}

/**
 * Horizontal stacked bar — used for the payment plan (% during construction
 * vs % on/after handover).
 */
export function horizontalStackedBar(
  segments: { label: string; percent: number; color: string }[],
  opts: { width?: number; height?: number } = {}
): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? 56;
  let x = 0;
  const bars = segments
    .map((s) => {
      const w = (s.percent / 100) * width;
      const rect = `<rect x="${x}" y="0" width="${w}" height="${height - 20}" fill="${s.color}" />`;
      const label =
        s.percent >= 8
          ? `<text x="${x + w / 2}" y="${(height - 20) / 2 + 5}" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">${s.percent}%</text>`
          : "";
      x += w;
      return rect + label;
    })
    .join("");

  const legend = segments
    .map(
      (s, i) =>
        `<rect x="${i * 180}" y="${height - 14}" width="10" height="10" rx="2" fill="${s.color}" />
         <text x="${i * 180 + 16}" y="${height - 5}" font-size="11" fill="#1F2422">${s.label}</text>`
    )
    .join("");

  return `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <g>${bars}</g>
    <g>${legend}</g>
  </svg>`;
}

/**
 * Donut chart — used for loan vs. down payment breakdown.
 */
export function donutChart(
  segments: { label: string; value: number; color: string }[],
  opts: { size?: number; strokeWidth?: number } = {}
): string {
  const size = opts.size ?? 180;
  const strokeWidth = opts.strokeWidth ?? 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offset = 0;
  const arcs = segments
    .map((seg) => {
      const fraction = seg.value / total;
      const dash = fraction * circumference;
      const gap = circumference - dash;
      const circle = `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${size / 2} ${size / 2})" />`;
      offset += dash;
      return circle;
    })
    .join("");

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${arcs}
  </svg>`;
}
