export default function ScoreCard({ label, score, hint, compact = false }) {
  const shown = score === null || score === undefined ? "—" : score;
  const scoreNumber = typeof score === "number" ? score : 0;
  const tone = score == null ? "neutral" : score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 55 ? "warning" : "bad";
  return <div className={`score-card ${compact ? "compact" : ""} tone-${tone}`}>
    <div className="score-label">{label}</div>
    <div className="score-ring" style={{ "--score": `${scoreNumber * 3.6}deg` }}>
      <div><strong>{shown}</strong>{shown !== "—" && <span>/100</span>}</div>
    </div>
    {hint && <div className="score-hint">{hint}</div>}
  </div>;
}
