import { useState } from "react";
import { Download, Mail, Send, FileDown } from "lucide-react";
import { downloadStoredReport, downloadWeeklyReport, sendAuditEmail, sendWeeklyEmail } from "../services/api.js";

export default function ReportDelivery({ audit, defaultEmail = "shadmansakibalam@gmail.com" }) {
  const [email, setEmail] = useState(defaultEmail);
  const [type, setType] = useState("full");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!audit?.id) return null;

  async function send() {
    setBusy(true); setStatus("");
    try { await sendAuditEmail(audit.id, email, type); setStatus(`Report sent to ${email}`); }
    catch (e) { setStatus(e.message); }
    finally { setBusy(false); }
  }
  async function weeklyMail() {
    setBusy(true); setStatus("");
    try { await sendWeeklyEmail(audit.url, email); setStatus(`Weekly report sent to ${email}`); }
    catch (e) { setStatus(e.message); }
    finally { setBusy(false); }
  }
  return <section className="delivery-panel">
    <div className="delivery-title"><div className="delivery-icon"><Mail size={19}/></div><div><strong>Reports & email delivery</strong><span>Download a report or send it to any email address.</span></div></div>
    <div className="report-buttons">
      <button onClick={() => downloadStoredReport(audit.id,"full","monez-full-audit.pdf")}><Download size={15}/> Full report</button>
      <button onClick={() => downloadStoredReport(audit.id,"seo","monez-seo-aeo-geo.pdf")}><FileDown size={15}/> SEO · AEO · GEO</button>
      <button onClick={() => downloadStoredReport(audit.id,"performance","monez-performance.pdf")}><FileDown size={15}/> Performance report</button>
      <button onClick={() => downloadWeeklyReport(audit.url,"monez-weekly.pdf")}><FileDown size={15}/> Weekly summary</button>
    </div>
    <div className="mail-row">
      <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="report@example.com" />
      <select value={type} onChange={(e)=>setType(e.target.value)}><option value="full">Full audit</option><option value="seo">SEO · AEO · GEO</option><option value="performance">Performance only</option></select>
      <button className="send-btn" onClick={send} disabled={!email || busy}><Send size={15}/>{busy ? "Sending…" : "Send report"}</button>
      <button className="secondary-mail" onClick={weeklyMail} disabled={!email || busy}>Send weekly summary</button>
    </div>
    {status && <div className={`delivery-status ${/sent/i.test(status)?"ok":"warn"}`}>{status}</div>}
  </section>;
}
