import { CheckCircle2, Clock3, LoaderCircle, TriangleAlert } from "lucide-react";

export default function AuditJobProgress({ job }) {
  if (!job) return null;
  const failed = job.status === "failed";
  const done = job.status === "completed";
  return <section className="job-panel">
    <div className="job-head"><div className={`job-state ${failed?"failed":done?"done":"running"}`}>{failed?<TriangleAlert size={18}/>:done?<CheckCircle2 size={18}/>:<LoaderCircle className="spin" size={18}/>}</div><div><strong>{job.stage || "Working"}</strong><span>{done?"Audit completed":failed?"Audit stopped":`${job.progress || 0}% complete`}</span></div><b>{job.progress || 0}%</b></div>
    <div className="job-track"><i style={{width:`${job.progress || 0}%`}} /></div>
    <div className="job-log"><div className="job-log-title"><Clock3 size={14}/> Live audit log</div>{(job.logs || []).slice(-7).map((log,i)=><div className={`job-log-line ${log.level || "info"}`} key={`${log.at}-${i}`}><time>{new Date(log.at).toLocaleTimeString()}</time><span>{log.message}</span></div>)}</div>
    {job.error && <div className="error-box">{job.error}</div>}
  </section>;
}
