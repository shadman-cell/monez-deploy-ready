function Status({ value }) { return <span className={`status status-${value}`}>{String(value).replace("_", " ")}</span>; }

export default function CheckTable({ checks = [], empty = "No checks to show.", limit }) {
  const shown = limit ? checks.slice(0, limit) : checks;
  if (!shown.length) return <div className="empty-state">{empty}</div>;
  return <div className="check-list">{shown.map((check) => <article className="check-row" key={check.id}>
    <div className="check-main"><div className="check-heading"><Status value={check.status} /><strong>{check.label}</strong>{check.severity && <span className="severity">{check.severity}</span>}</div>
      {check.url && <div className="muted ellipsis">{check.url}</div>}
      {(check.expected || check.actual) && <div className="expectation"><span><b>Expected:</b> {check.expected || "—"}</span><span><b>Actual:</b> {check.actual || "—"}</span></div>}
      {check.evidence && <div className="evidence">{String(check.evidence)}</div>}
      {check.recommendation && <div className="recommendation"><b>Fix:</b> {check.recommendation}</div>}
    </div>
  </article>)}</div>;
}
