import { ExternalLink } from "lucide-react";
import ScoreCard from "./ScoreCard.jsx";
import SummaryCards from "./SummaryCards.jsx";
import CheckTable from "./CheckTable.jsx";
import DiscoverySection from "./DiscoverySection.jsx";
import PerformanceVisual from "./PerformanceVisual.jsx";
import ResponsiveVisual from "./ResponsiveVisual.jsx";
import ReportDelivery from "./ReportDelivery.jsx";

export default function WebsiteAuditResults({ audit }) {
  const c = audit.categories || {};
  return <section className="results-shell website-results">
    <div className="result-head">
      <div><p className="eyebrow">WEBSITE AUDIT RESULT</p><h2>{audit.url}</h2><p className="muted">Scanned {new Date(audit.scannedAt).toLocaleString()} · {Math.round((audit.metadata?.durationMs || 0)/1000)}s</p></div>
      <div className="result-actions"><a className="ghost-link" href={audit.url} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Open site</a></div>
    </div>
    <ReportDelivery audit={audit}/>
    <div className="section-jumps"><a href="#discovery-section">SEO · AEO · GEO</a><a href="#performance-section">Performance</a><a href="#responsive-section">Responsive</a><a href="#website-qa-section">Website QA</a></div>
    <div className="overview-row"><ScoreCard label="Overall quality" score={audit.overallScore} hint="SEO + AEO + GEO + Performance + Responsive + Website QA" /><SummaryCards summary={audit.summary} /></div>
    <div className="category-score-grid six">
      <ScoreCard label="SEO" score={c.seo?.score} hint="SEO Audit MCP" compact />
      <ScoreCard label="AEO" score={c.aeo?.score} hint="Answer readiness" compact />
      <ScoreCard label="GEO" score={c.geo?.score} hint="Generative readiness" compact />
      <ScoreCard label="Performance" score={c.performance?.score} hint="Speed & runtime" compact />
      <ScoreCard label="Responsive" score={c.responsive?.score} hint="Device QA" compact />
      <ScoreCard label="Website QA" score={c.websiteQA?.score} hint="Links · Images · Buttons" compact />
    </div>
    <DiscoverySection seo={c.seo} aeo={c.aeo} geo={c.geo}/>
    <PerformanceVisual category={c.performance}/>
    <ResponsiveVisual category={c.responsive}/>
    <section className="audit-section" id="website-qa-section"><div className="section-heading"><div><span className="section-kicker">WEBSITE QA</span><h3>Links, images and interactive elements</h3></div><div className="section-score">{c.websiteQA?.score ?? "—"}<span>/100</span></div></div><CheckTable checks={c.websiteQA?.checks || []}/></section>
    <section className="audit-section"><div className="two-column-review"><details open><summary>Failed checks ({audit.failedChecks?.length || 0})</summary><CheckTable checks={audit.failedChecks || []} empty="No failed checks."/></details><details><summary>Warnings ({audit.warnings?.length || 0})</summary><CheckTable checks={audit.warnings || []} empty="No warnings."/></details><details><summary>Passed checks ({audit.passedChecks?.length || 0})</summary><CheckTable checks={audit.passedChecks || []} empty="No passed checks."/></details></div></section>
  </section>;
}
