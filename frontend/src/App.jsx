import { Gauge, ShieldCheck } from "lucide-react";
import WebsiteAuditPage from "./pages/WebsiteAuditPage.jsx";

export default function App() {
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><ShieldCheck size={21}/></span><div><strong>Monez</strong><small>Website Audit Intelligence</small></div></div>
      <nav className="main-tabs"><button className="active"><Gauge size={17}/> Website Audit</button></nav>
      <span className="build-badge">Deploy-ready · v1</span>
    </header>
    <main><WebsiteAuditPage/></main>
  </div>;
}
