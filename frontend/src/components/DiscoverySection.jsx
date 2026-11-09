import ScoreCard from "./ScoreCard.jsx";
import CheckTable from "./CheckTable.jsx";

function DeepSeo({ seo }) {
  const values = seo?.mcpCategories || {};
  if (!Object.keys(values).length) return null;
  const labels = { technicalSEO: "Technical", onPageSEO: "On-page", localSEO: "Local", schema: "Schema", performance: "MCP Performance", content: "Content" };
  return <div className="mcp-score-grid">{Object.entries(values).map(([key,value]) => <div className="mcp-score" key={key}><span>{labels[key] || key}</span><strong>{value}<small>/10</small></strong><div><i style={{width:`${Math.min(100, Number(value)*10)}%`}} /></div></div>)}</div>;
}

export default function DiscoverySection({ seo, aeo, geo }) {
  const cats = [
    { key:"seo", title:"SEO", sub:"Search visibility", data:seo, hint:"Powered by your SEO Audit MCP" },
    { key:"aeo", title:"AEO", sub:"Answer Engine Optimization", data:aeo, hint:"Direct-answer readiness" },
    { key:"geo", title:"GEO", sub:"Generative Engine Optimization", data:geo, hint:"Generative discovery readiness" },
  ];
  return <section className="audit-section discovery-section" id="discovery-section">
    <div className="section-heading"><div><span className="section-kicker">DISCOVERABILITY</span><h3>SEO · AEO · GEO</h3><p>Three separate audit layers with the same Monez reporting design.</p></div></div>
    <div className="triple-category-grid">{cats.map((cat) => <article className="discovery-card" key={cat.key}>
      <ScoreCard label={cat.title} score={cat.data?.score} hint={cat.hint} compact />
      <div className="discovery-copy"><strong>{cat.sub}</strong>{cat.data?.note && <p>{cat.data.note}</p>}</div>
      {cat.key === "seo" && <DeepSeo seo={cat.data} />}
      <CheckTable checks={cat.data?.checks || []} />
    </article>)}</div>
  </section>;
}
