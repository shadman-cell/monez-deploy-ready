import { useEffect, useState } from "react";
import { Clock3, Download, Mail } from "lucide-react";
import { listAudits, downloadStoredReport } from "../services/api.js";

export default function AuditHistory({ onOpen }) {
  const [items,setItems]=useState([]); const [error,setError]=useState("");
  useEffect(()=>{listAudits(60).then(setItems).catch(e=>setError(e.message));},[]);
  return <section className="history-panel"><div className="panel-title"><Clock3 size={19}/><div><strong>Audit history</strong><span>Saved results are used to build weekly summaries and performance trends.</span></div></div>{error&&<div className="error-box">{error}</div>}{!items.length?<div className="empty-state">No saved audits yet. Run your first website audit.</div>:<div className="history-list">{items.map(a=><article className="history-row" key={a.id}><div className="history-main"><strong>{a.url}</strong><span>{new Date(a.scannedAt).toLocaleString()}</span></div><div className="history-scores"><span>Overall <b>{a.overallScore ?? "—"}</b></span><span>SEO <b>{a.categories?.seo?.score ?? "—"}</b></span><span>AEO <b>{a.categories?.aeo?.score ?? "—"}</b></span><span>GEO <b>{a.categories?.geo?.score ?? "—"}</b></span><span>Perf <b>{a.categories?.performance?.score ?? "—"}</b></span></div><div className="history-actions"><button onClick={()=>onOpen?.(a)}>Open</button><button onClick={()=>downloadStoredReport(a.id,"full","monez-audit.pdf")}><Download size={14}/></button></div></article>)}</div>}</section>;
}
