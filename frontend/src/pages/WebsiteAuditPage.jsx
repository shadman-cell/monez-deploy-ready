import { useEffect, useRef, useState } from "react";
import { Globe, Play, CalendarClock, Clock3, Activity, ShieldCheck } from "lucide-react";
import { createAudit, getAudit, getJob } from "../services/api.js";
import WebsiteAuditResults from "../components/WebsiteAuditResults.jsx";
import AuditJobProgress from "../components/AuditJobProgress.jsx";
import ScheduleManager from "../components/ScheduleManager.jsx";
import AuditHistory from "../components/AuditHistory.jsx";

export default function WebsiteAuditPage() {
  const [view,setView]=useState("audit");
  const [url,setUrl]=useState("https://example.com");
  const [audit,setAudit]=useState(null);
  const [job,setJob]=useState(null);
  const [error,setError]=useState("");
  const pollRef=useRef(null);

  function stopPoll(){ if(pollRef.current){clearInterval(pollRef.current);pollRef.current=null;} }
  useEffect(()=>()=>stopPoll(),[]);

  async function poll(id){
    stopPoll();
    const tick=async()=>{
      try{
        const next=await getJob(id); setJob(next);
        if(next.status==="completed"){stopPoll();localStorage.removeItem("monezCurrentJob");setAudit(await getAudit(next.auditId));}
        if(next.status==="failed"){stopPoll();localStorage.removeItem("monezCurrentJob");setError(next.error||"Audit failed");}
      }catch(e){setError(e.message);}
    };
    await tick(); pollRef.current=setInterval(tick,1200);
  }

  useEffect(()=>{const saved=localStorage.getItem("monezCurrentJob");if(saved)poll(saved);},[]);

  async function handleRun(e){
    e.preventDefault();setError("");setAudit(null);setJob(null);
    try{const created=await createAudit(url);localStorage.setItem("monezCurrentJob",created.jobId);await poll(created.jobId);}catch(e){setError(e.message);}
  }

  function openHistory(item){setAudit(item);setUrl(item.url);setView("audit");window.scrollTo({top:0,behavior:"smooth"});}

  return <div className="page-stack">
    <section className="workspace-tabs"><button className={view==="audit"?"active":""} onClick={()=>setView("audit")}><Activity size={16}/> New audit</button><button className={view==="schedules"?"active":""} onClick={()=>setView("schedules")}><CalendarClock size={16}/> Schedules</button><button className={view==="history"?"active":""} onClick={()=>setView("history")}><Clock3 size={16}/> History</button></section>
    {view==="audit"&&<>
      <section className="hero-panel audit-hero upgraded-hero">
        <div className="hero-copy"><p className="eyebrow">DEPLOYMENT-READY WEBSITE INTELLIGENCE</p><h1>One URL. SEO, AEO, GEO, performance and responsive QA.</h1><p>SEO uses your supplied MCP audit logic. Long scans run as background jobs, so the UI stays responsive even when a website is slow.</p><div className="feature-pills"><span><ShieldCheck size={13}/> SEO MCP</span><span>AEO</span><span>GEO</span><span>Performance report</span><span>Desktop · Tablet · Mobile</span><span>Weekly email</span></div></div>
        <form className="primary-form audit-launcher" onSubmit={handleRun}><label><Globe size={16}/> Website URL</label><input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="https://example.com" required/><button disabled={job&&!["completed","failed"].includes(job.status)}><Play size={17}/>{job&&!["completed","failed"].includes(job.status)?"Audit running…":"Start full audit"}</button><small>The request returns immediately. Monez shows live progress while the worker continues the scan.</small></form>
        {error&&<div className="error-box">{error}</div>}
      </section>
      <AuditJobProgress job={job}/>
      {audit&&<WebsiteAuditResults audit={audit}/>} 
    </>}
    {view==="schedules"&&<ScheduleManager initialUrl={url}/>} 
    {view==="history"&&<AuditHistory onOpen={openHistory}/>} 
  </div>;
}
