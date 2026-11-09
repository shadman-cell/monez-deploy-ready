import ScoreCard from "./ScoreCard.jsx";
import CheckTable from "./CheckTable.jsx";

function formatMetric(key, value) {
  if (value === null || value === undefined) return "N/A";
  if (key === "cls") return Number(value).toFixed(3);
  if (key === "totalTransfer") return `${(Number(value) / 1_000_000).toFixed(2)} MB`;
  if (key === "resourceCount") return String(value);
  return `${Math.round(Number(value))} ms`;
}

function metricTone(key, value) {
  if (value === null || value === undefined) return "neutral";
  const v = Number(value);
  const limits = {
    fcp: [1800, 3000], lcp: [2500, 4000], cls: [0.1, 0.25], tbt: [200, 600],
    loadTime: [3000, 6000], ttfb: [800, 1800],
  };
  if (!limits[key]) return "neutral";
  return v <= limits[key][0] ? "good" : v >= limits[key][1] ? "bad" : "warning";
}

export default function PerformanceVisual({ category }) {
  if (!category) return null;
  const m = category.metrics || {};
  const metrics = [
    ["fcp", "First Contentful Paint"], ["lcp", "Largest Contentful Paint"], ["cls", "Layout Shift"],
    ["tbt", "Blocking Time"], ["loadTime", "Load Time"], ["ttfb", "TTFB"], ["totalTransfer", "Transfer Size"], ["resourceCount", "Resources"],
  ];
  const issueChecks = (category.checks || []).filter((c) => c.status === "fail" || c.status === "warning");
  return <section className="audit-section" id="performance-section">
    <div className="section-heading"><div><span className="section-kicker">PERFORMANCE</span><h3>Performance visual analysis</h3><p>Browser timing, page-weight signals and detected performance issues.</p></div></div>
    <div className="performance-layout">
      <ScoreCard label="Performance" score={category.score} hint="Monez performance score" />
      <div className="metric-grid">{metrics.map(([key,label]) => <div className={`metric-card metric-${metricTone(key,m[key])}`} key={key}><span>{label}</span><strong>{formatMetric(key,m[key])}</strong><div className="metric-bar"><i style={{ width: m[key] == null ? "0%" : key === "cls" ? `${Math.min(100, Number(m[key]) * 260)}%` : key === "totalTransfer" ? `${Math.min(100, Number(m[key]) / 70000)}%` : key === "resourceCount" ? `${Math.min(100, Number(m[key]) / 1.5)}%` : `${Math.min(100, Number(m[key]) / 60)}%` }} /></div></div>)}</div>
    </div>
    <div className="subsection"><h4>Performance issues & recommendations</h4><CheckTable checks={issueChecks} empty="No performance warnings or failures detected." /></div>
  </section>;
}
