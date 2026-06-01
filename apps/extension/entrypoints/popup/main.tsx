import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/app.css";
import { Logo } from "../../src/components/Logo";

function Popup() {
  const [status, setStatus] = useState<{ tone: "info" | "success" | "error"; text: string }>({
    tone: "info",
    text: "Ready on normal web pages. Some browser and store pages block capture."
  });
  const [busy, setBusy] = useState(false);

  async function startCapture() {
    setBusy(true);
    setStatus({ tone: "info", text: "Starting capture mode..." });
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
        setStatus({ tone: "error", text: "Capture cannot run on browser settings, extension, or store pages. Open a regular website first." });
        return;
      }
      chrome.runtime.sendMessage({ type: "INSPRA_START_CAPTURE", tabId: tab.id }, (response) => {
        const lastError = chrome.runtime.lastError;
        if (lastError || !response?.ok) {
          setStatus({ tone: "error", text: response?.error ?? lastError?.message ?? "Capture mode could not start on this page." });
          setBusy(false);
          return;
        }
        setStatus({ tone: "success", text: "Capture mode is active. Click a page element to save it." });
        window.setTimeout(() => window.close(), 650);
      });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Capture mode could not start." });
      setBusy(false);
    }
  }

  async function openPanel() {
    setBusy(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.windowId) {
        setStatus({ tone: "error", text: "No active browser window found." });
        return;
      }
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Basket could not open." });
      setBusy(false);
    }
  }

  return (
    <main className="w-[360px] bg-white p-4 text-ink">
      <Logo />
      <p className="mt-3 text-sm leading-6 text-ink/65">Capture visual inspiration, code blocks, and website experience patterns into transferable agent-ready design skills.</p>
      <div className={`mt-4 rounded-md border px-3 py-2 text-xs leading-5 ${status.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : status.tone === "success" ? "border-teal/25 bg-teal/10 text-teal" : "border-black/10 bg-mist/40 text-ink/65"}`}>
        {status.text}
      </div>
      <div className="mt-4 grid gap-2">
        <button disabled={busy} onClick={startCapture} className="rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-teal disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Working..." : "Start capture"}</button>
        <button disabled={busy} onClick={openPanel} className="rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-ink hover:border-teal/40 disabled:cursor-not-allowed disabled:opacity-50">Open basket</button>
      </div>
      <div className="mt-4 rounded-md border border-black/10 bg-[#fbfdfc] p-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">Quick tutorial</div>
        <ol className="mt-2 grid gap-1 text-[11px] leading-5 text-ink/60">
          <li>1. Start capture on a normal webpage.</li>
          <li>2. Click the section, card, image, text, or code worth studying.</li>
          <li>3. Open basket, generate skill, then copy into your agent.</li>
        </ol>
      </div>
      <p className="mt-4 font-mono text-[11px] text-ink/45">Shortcut: Alt+Shift+I</p>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
