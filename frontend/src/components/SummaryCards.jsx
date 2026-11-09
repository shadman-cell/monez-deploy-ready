export default function SummaryCards({ summary = {} }) {
  const data = [
    ["Total checks", summary.total ?? 0], ["Passed", summary.passed ?? 0], ["Failed", summary.failed ?? 0], ["Warnings", summary.warnings ?? 0], ["Pass rate", `${summary.passPercentage ?? 0}%`]
  ];
  return <div className="summary-grid">{data.map(([k,v]) => <div className="summary-card" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div>;
}
