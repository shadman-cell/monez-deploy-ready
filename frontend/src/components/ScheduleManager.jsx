import { useEffect, useState } from "react";
import { CalendarClock, Play, Plus, Trash2, Mail, Gauge } from "lucide-react";
import { createSchedule, deleteSchedule, listSchedules, runScheduleNow } from "../services/api.js";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
export default function ScheduleManager({ initialUrl = "" }) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
  const [form,setForm]=useState({url:initialUrl,dayOfWeek:1,time:"09:00",timezone,recipient:"shadmansakibalam@gmail.com",lowPerformanceThreshold:70,notifyOnLowPerformance:true,sendWeeklyReport:true});
  const [items,setItems]=useState([]); const [status,setStatus]=useState(""); const [busy,setBusy]=useState(false);
  async function load(){ try{setItems(await listSchedules());}catch(e){setStatus(e.message);} }
  useEffect(()=>{load();},[]); useEffect(()=>{if(initialUrl)setForm(f=>({...f,url:initialUrl}));},[initialUrl]);
  async function add(e){e.preventDefault();setBusy(true);setStatus("");try{await createSchedule(form);setStatus("Weekly schedule saved.");await load();}catch(e){setStatus(e.message);}finally{setBusy(false);}}
  async function remove(id){await deleteSchedule(id);await load();}
  async function run(id){setStatus("");try{const r=await runScheduleNow(id);setStatus(`Audit queued: ${r.jobId}`);}catch(e){setStatus(e.message);}}
  return <div className="schedule-layout">
    <form className="schedule-form" onSubmit={add}><div className="panel-title"><CalendarClock size={19}/><div><strong>Weekly audit schedule</strong><span>Monez runs the site every week and saves the report to history.</span></div></div>
      <label>Website URL<input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://example.com" required /></label>
      <div className="form-grid"><label>Day<select value={form.dayOfWeek} onChange={e=>setForm({...form,dayOfWeek:Number(e.target.value)})}>{DAYS.map((d,i)=><option value={i} key={d}>{d}</option>)}</select></label><label>Time<input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} required /></label><label>Timezone<input value={form.timezone} onChange={e=>setForm({...form,timezone:e.target.value})} /></label></div>
      <label><Mail size={14}/> Weekly recipient<input type="email" value={form.recipient} onChange={e=>setForm({...form,recipient:e.target.value})} /></label>
      <label><Gauge size={14}/> Low-performance threshold<div className="range-row"><input type="range" min="20" max="95" value={form.lowPerformanceThreshold} onChange={e=>setForm({...form,lowPerformanceThreshold:Number(e.target.value)})}/><b>{form.lowPerformanceThreshold}/100</b></div></label>
      <div className="check-options"><label><input type="checkbox" checked={form.sendWeeklyReport} onChange={e=>setForm({...form,sendWeeklyReport:e.target.checked})}/> Email weekly report after scheduled run</label><label><input type="checkbox" checked={form.notifyOnLowPerformance} onChange={e=>setForm({...form,notifyOnLowPerformance:e.target.checked})}/> Send low-performance alert</label></div>
      <button disabled={busy}><Plus size={16}/>{busy?"Saving…":"Add weekly schedule"}</button>{status&&<div className="inline-status">{status}</div>}
    </form>
    <div className="schedule-list"><div className="panel-title"><CalendarClock size={19}/><div><strong>Scheduled websites</strong><span>{items.length} active configuration(s)</span></div></div>{!items.length?<div className="empty-state">No weekly schedules yet.</div>:items.map(s=><article className="schedule-card" key={s.id}><div><strong>{s.url}</strong><span>{DAYS[s.dayOfWeek]} · {s.time} · {s.timezone}</span><small>Weekly email: {s.recipient || "Not set"} · Alert below {s.lowPerformanceThreshold}/100</small></div><div className="schedule-actions"><button onClick={()=>run(s.id)} title="Run now"><Play size={14}/></button><button className="danger" onClick={()=>remove(s.id)} title="Delete"><Trash2 size={14}/></button></div></article>)}</div>
  </div>;
}
