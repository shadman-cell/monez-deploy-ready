import CheckTable from "./CheckTable.jsx";

export default function ResponsiveVisual({ category }) {
  if (!category) return null;
  const devices = category.devices || [];
  return <section className="audit-section" id="responsive-section">
    <div className="section-heading"><div><span className="section-kicker">RESPONSIVE</span><h3>Desktop, tablet & mobile visual verification</h3><p>Each preview is captured from the audited website at the exact viewport shown below.</p></div><div className="section-score">{category.score ?? "—"}<span>/100</span></div></div>
    <div className="device-grid">{devices.map((device) => <article className="device-card" key={device.name}>
      <div className="device-head"><div><strong>{device.name}</strong><span>{device.width} × {device.height}</span></div><span className={device.overflow <= 2 ? "mini-pass" : "mini-fail"}>{device.overflow <= 2 ? "No overflow" : `${Math.round(device.overflow)}px overflow`}</span></div>
      <div className={`device-frame device-${device.name.toLowerCase()}`}>
        {device.screenshot ? <img src={device.screenshot} alt={`${device.name} audited website preview`} /> : <div className="preview-missing">Preview unavailable</div>}
      </div>
      <div className="device-meta"><span>Viewport meta: <b>{device.viewportMeta ? "Detected" : "Missing"}</b></span>{device.name !== "Desktop" && <span>Small targets: <b>{device.tinyTargets ?? 0}</b></span>}</div>
    </article>)}</div>
    <div className="subsection"><h4>Responsive checks</h4><CheckTable checks={category.checks || []} /></div>
  </section>;
}
