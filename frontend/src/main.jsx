import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

function BootError({ error }) {
  return (
    <div style={{minHeight:"100vh",background:"#07111f",color:"#e5e7eb",padding:"40px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{maxWidth:"900px",margin:"60px auto",border:"1px solid #7f1d1d",background:"#221017",borderRadius:"16px",padding:"24px"}}>
        <h1 style={{marginTop:0}}>Monez frontend could not start</h1>
        <p style={{color:"#fecaca"}}>A frontend module failed to load. Copy the error below and send it to ChatGPT.</p>
        <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#080d14",padding:"16px",borderRadius:"10px",color:"#fda4af"}}>{String(error?.stack || error?.message || error)}</pre>
      </div>
    </div>
  );
}

import("./App.jsx")
  .then(({ default: App }) => {
    root.render(<React.StrictMode><App /></React.StrictMode>);
  })
  .catch((error) => {
    console.error("Monez bootstrap error:", error);
    root.render(<BootError error={error} />);
  });
