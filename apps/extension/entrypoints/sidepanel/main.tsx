import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { InspirationCapture, ProviderSettings, SkillOutput } from "@inspra/core";
import { buildSkillPack, defaultProviderSettings, providerPresets } from "@inspra/core";
import "../../src/styles/app.css";
import { clearCaptures, getCaptures, getLastOutput, getOnboardingComplete, getProfile, getProviderSettings, getSetupComplete, removeCapture, setLastOutput, setOnboardingComplete, setProfile, setProviderSettings, setSetupComplete, type InspraProfile } from "../../src/storage";
import { generateSkill } from "../../src/generateSkill";
import { Logo } from "../../src/components/Logo";
import { createFeedbackPayload, submitFeedback, type FeedbackKind } from "../../src/feedback";

const providerOptions: Array<{
  mode: ProviderSettings["mode"];
  title: string;
  body: string;
}> = [
  { mode: "openai", title: "OpenAI API", body: "Use your own API key. Best quality for generated skills." },
  { mode: "ollama", title: "Ollama", body: "Local endpoint at localhost:11434. No cloud call." },
  { mode: "lmstudio", title: "LM Studio", body: "Local OpenAI-compatible endpoint at localhost:1234." },
  { mode: "local", title: "No API yet", body: "Generate local draft skills and copy them into Codex or ChatGPT." }
];

type Notice = {
  tone: "info" | "success" | "error";
  text: string;
  action?: {
    label: string;
    run: () => void | Promise<void>;
  };
};

const feedbackOptions: Array<{ kind: FeedbackKind; label: string }> = [
  { kind: "bug", label: "Bug" },
  { kind: "confusing", label: "Confusing" },
  { kind: "idea", label: "Idea" },
  { kind: "love", label: "Love" }
];

function SidePanel() {
  const [captures, setCaptures] = useState<InspirationCapture[]>([]);
  const [provider, setProvider] = useState<ProviderSettings>(defaultProviderSettings);
  const [output, setOutput] = useState<SkillOutput>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Notice | undefined>();
  const [setupComplete, setSetupCompleteState] = useState(false);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [profile, setProfileState] = useState<InspraProfile>({});
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("bug");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const pendingProviderRef = useRef<ProviderSettings | null>(null);
  const pendingProfileRef = useRef<InspraProfile | null>(null);

  const groupedSignals = useMemo(() => {
    const colors = Array.from(new Set(captures.flatMap((capture) => capture.styleSignals.colors))).slice(0, 10);
    const fonts = Array.from(new Set(captures.flatMap((capture) => capture.styleSignals.fonts))).slice(0, 4);
    return { colors, fonts };
  }, [captures]);

  async function refresh() {
    const [nextCaptures, nextProvider, nextOutput, nextSetup, nextOnboarding, nextProfile] = await Promise.all([getCaptures(), getProviderSettings(), getLastOutput(), getSetupComplete(), getOnboardingComplete(), getProfile()]);
    setCaptures(nextCaptures);
    setProvider(nextProvider);
    setOutput(nextOutput);
    setSetupCompleteState(nextSetup);
    setOnboardingCompleteState(nextOnboarding);
    setProfileState(nextProfile);
    setFeedbackEmail(nextProfile.email ?? "");
  }

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    chrome.storage.onChanged.addListener(listener);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (pendingProviderRef.current) {
          setProviderSettings(pendingProviderRef.current);
          pendingProviderRef.current = null;
        }
        if (pendingProfileRef.current) {
          setProfile(pendingProfileRef.current);
          pendingProfileRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function startCapture() {
    setBusy(true);
    setStatus({ tone: "info", text: "Starting capture mode..." });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus({ tone: "error", text: "No active tab available." });
      setBusy(false);
      return;
    }
    if (!tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
      setStatus({
        tone: "error",
        text: "Capture cannot run on browser settings, extension, or store pages.",
        action: { label: "Try after opening a website", run: () => undefined }
      });
      setBusy(false);
      return;
    }
    chrome.runtime.sendMessage({ type: "INSPRA_START_CAPTURE", tabId: tab.id }, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError || !response?.ok) {
        setStatus({
          tone: "error",
          text: response?.error ?? lastError?.message ?? "Capture mode could not start on this page.",
          action: { label: "Retry", run: startCapture }
        });
      } else {
        setStatus({ tone: "success", text: "Capture mode active. Click a visible page element, or press Esc to cancel." });
      }
      setBusy(false);
    });
  }

  function saveProvider(next: ProviderSettings) {
    setProvider(next);
    pendingProviderRef.current = next;
  }

  async function flushProvider() {
    if (pendingProviderRef.current) {
      await setProviderSettings(pendingProviderRef.current);
      pendingProviderRef.current = null;
    }
  }

  async function chooseProvider(mode: ProviderSettings["mode"]) {
    const preset = providerPresets[mode];
    saveProvider(preset);
    await flushProvider();
    await setSetupComplete(true);
    setSetupCompleteState(true);
    setStatus({ tone: "success", text: mode === "local" ? "Local mode ready. Capture references, then copy output into Codex or ChatGPT." : `${providerOptions.find((option) => option.mode === mode)?.title} selected.` });
  }

  async function handleGenerate() {
    if (!captures.length) {
      setStatus({ tone: "error", text: "Capture at least one reference before generating." });
      return;
    }
    setBusy(true);
    setStatus({ tone: "info", text: "Generating inspiration skill..." });
    try {
      const next = await generateSkill(captures, provider);
      await setLastOutput(next);
      setOutput(next);
      setStatus({ tone: "success", text: provider.mode === "local" || !provider.apiKey ? "Local draft generated. Copy it into Codex, ChatGPT, or another agent." : "Skill generated by selected provider." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Generation failed.", action: { label: "Retry generation", run: handleGenerate } });
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value?: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus({ tone: "success", text: "Copied." });
    } catch {
      setStatus({ tone: "error", text: "Clipboard permission failed. Select the text manually and copy it." });
    }
  }

  async function exportPack() {
    if (!output) return;
    const pack = buildSkillPack(captures, output);
    await copyText(JSON.stringify(pack, null, 2));
  }

  async function completeOnboarding() {
    await setOnboardingComplete(true);
    setOnboardingCompleteState(true);
    setStatus({ tone: "success", text: "Tutorial complete. Capture your first reference when ready." });
  }

  function saveProfile(next: InspraProfile) {
    setProfileState(next);
    pendingProfileRef.current = next;
  }

  async function flushProfile() {
    if (pendingProfileRef.current) {
      await setProfile(pendingProfileRef.current);
      pendingProfileRef.current = null;
    }
  }

  async function connectChatGPT() {
    const nextProfile = { ...profile, chatgptConnected: true, connectedAt: new Date().toISOString() };
    await setProfile(nextProfile);
    setProfileState(nextProfile);
    await chrome.tabs.create({ url: import.meta.env.WXT_CHATGPT_SIGN_IN_URL || "https://chatgpt.com/" });
    setStatus({ tone: "info", text: "ChatGPT opened. After signing in, copy generated skills there or into Codex." });
  }

  async function sendFeedback() {
    if (feedbackMessage.trim().length < 8) {
      setStatus({ tone: "error", text: "Feedback needs at least 8 characters." });
      return;
    }
    setFeedbackBusy(true);
    try {
      await submitFeedback(createFeedbackPayload({ kind: feedbackKind, message: feedbackMessage, email: feedbackEmail, captures, provider }));
      setFeedbackMessage("");
      setStatus({ tone: "success", text: "Feedback sent. Thank you for helping harden the release." });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : "Feedback could not be sent.", action: { label: "Retry feedback", run: sendFeedback } });
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <main className="inspra-panel min-h-screen text-ink">
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Logo />
          <button onClick={startCapture} className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-teal">
            Capture
          </button>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-ink/65">Turn selected web references, code blocks, and interaction patterns into original AI-agent skills.</p>
      </header>

      <section className="space-y-4 p-4">
        {!onboardingComplete ? (
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal">Tutorial</div>
            <h1 className="mt-2 text-xl font-semibold tracking-normal">Capture reference. Generate original direction.</h1>
            <div className="mt-4 grid gap-2 text-xs leading-5 text-ink/65">
              <div className="rounded-md border border-black/10 bg-[#fbfdfc] p-3"><strong className="text-ink">1. Capture</strong> a hero, card, image, code block, section, or interaction pattern.</div>
              <div className="rounded-md border border-black/10 bg-[#fbfdfc] p-3"><strong className="text-ink">2. Review</strong> basket signals: colors, type, layout, motion, and source context.</div>
              <div className="rounded-md border border-black/10 bg-[#fbfdfc] p-3"><strong className="text-ink">3. Generate</strong> a skill with anti-copy rules, then paste it into Codex, ChatGPT, Cursor, Claude, v0, Lovable, or Bolt.</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={completeOnboarding} className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-teal">Got it</button>
              <button onClick={startCapture} className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-ink hover:border-teal/40">Start capture</button>
            </div>
          </div>
        ) : null}

        {!setupComplete ? (
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-teal">First setup</div>
            <h1 className="mt-2 text-xl font-semibold tracking-normal">Choose how Inspra generates.</h1>
            <p className="mt-2 text-xs leading-5 text-ink/60">Start local, or connect any OpenAI-compatible endpoint. Keys stay in Chrome local storage.</p>
            <div className="mt-4 grid gap-2">
              {providerOptions.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => chooseProvider(option.mode)}
                  className="setup-option rounded-md border border-black/10 bg-[#fbfdfc] p-3 text-left hover:border-teal/40 hover:bg-teal/5"
                >
                  <span className="block text-sm font-semibold">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-ink/55">{option.body}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {status ? (
          <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${status.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : status.tone === "success" ? "border-teal/20 bg-teal/5 text-teal" : "border-black/10 bg-mist/40 text-ink/65"}`}>
            <span className="leading-5">{status.text}</span>
            {status.action ? (
              <button onClick={status.action.run} className="shrink-0 rounded-md border border-current px-2 py-1 font-semibold">
                {status.action.label}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Inspiration Basket</h2>
            <span className="font-mono text-xs text-ink/50">{captures.length}</span>
          </div>
          <div className="mt-3 space-y-2">
            {captures.length === 0 ? (
              <div className="signal-grid rounded-md border border-dashed border-teal/25 p-5 text-center text-xs leading-5 text-ink/55">
                Press Capture, select a hero, card, image, code block, section, detail, or copy a detected experience. Captures stay local.
              </div>
            ) : (
              captures.map((capture) => (
                <article key={capture.id} className="rounded-md border border-black/10 bg-[#fbfdfc] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">{capture.kind}</div>
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium">{capture.pageTitle || new URL(capture.sourceUrl).host}</h3>
                    </div>
                    <button onClick={() => removeCapture(capture.id)} className="text-xs text-ink/45 hover:text-ink">
                      Remove
                    </button>
                  </div>
                  {capture.text ? <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink/60">{capture.text}</p> : null}
                  {capture.experienceSignals?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {capture.experienceSignals.slice(0, 4).map((signal) => (
                        <span key={signal} className="rounded-full border border-teal/20 bg-teal/5 px-2 py-1 text-[10px] font-semibold text-teal">
                          {signal}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
          {captures.length ? (
            <button onClick={async () => { await clearCaptures(); await refresh(); }} className="mt-3 text-xs font-medium text-ink/55 hover:text-ink">
              Clear basket
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <h2 className="text-sm font-semibold">Signals</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {groupedSignals.colors.map((color) => (
              <span key={color} title={color} className="h-6 w-6 rounded-full border border-black/10" style={{ background: color }} />
            ))}
          </div>
          <div className="mt-3 space-y-1">
            {groupedSignals.fonts.map((font) => (
              <div key={font} className="truncate font-mono text-[11px] text-ink/55">{font}</div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Generation</h2>
              <p className="mt-1 text-[11px] text-ink/50">{provider.mode === "local" ? "Local draft / copy to agent" : provider.baseUrl}</p>
            </div>
            <button onClick={() => setSetupCompleteState(false)} className="text-xs font-medium text-teal">Change</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input value={provider.model} disabled={provider.mode === "local"} onChange={(event) => saveProvider({ ...provider, model: event.target.value })} onBlur={flushProvider} className="w-full rounded-md border border-black/10 px-3 py-2 text-xs disabled:bg-mist/40 disabled:text-ink/40" placeholder="Model" />
            <input value={provider.baseUrl} disabled={provider.mode === "local"} onChange={(event) => saveProvider({ ...provider, baseUrl: event.target.value })} onBlur={flushProvider} className="w-full rounded-md border border-black/10 px-3 py-2 text-xs disabled:bg-mist/40 disabled:text-ink/40" placeholder="Base URL" />
          </div>
          <div className="mt-2">
            <input value={provider.apiKey} disabled={provider.mode === "local"} type="password" onChange={(event) => saveProvider({ ...provider, apiKey: event.target.value })} onBlur={flushProvider} className="w-full rounded-md border border-black/10 px-3 py-2 text-xs disabled:bg-mist/40 disabled:text-ink/40" placeholder={provider.mode === "openai" ? "OpenAI API key" : "API key, if required"} />
          </div>
          {provider.mode !== "local" && provider.apiKey ? (
            <button onClick={async () => { saveProvider({ ...provider, apiKey: "" }); await flushProvider(); }} className="mt-2 text-xs font-medium text-ink/55 hover:text-ink">
              Delete saved API key
            </button>
          ) : null}
          {provider.mode !== "local" && provider.baseUrl && !provider.baseUrl.startsWith("https://") && !provider.baseUrl.startsWith("http://localhost") && !provider.baseUrl.startsWith("http://127.0.0.1") ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
              Remote endpoints should use HTTPS. Only local endpoints should use plain HTTP.
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">ChatGPT Sign In</h2>
              <p className="mt-1 text-[11px] leading-5 text-ink/55">Use ChatGPT as the place to paste generated Inspra skills. Direct ChatGPT OAuth for browser extensions is not configured in this repo yet.</p>
            </div>
            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${profile.chatgptConnected ? "border-teal/25 bg-teal/5 text-teal" : "border-black/10 text-ink/45"}`}>
              {profile.chatgptConnected ? "Connected" : "Optional"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <input value={profile.email ?? ""} onChange={(event) => saveProfile({ ...profile, email: event.target.value })} onBlur={flushProfile} className="w-full rounded-md border border-black/10 px-3 py-2 text-xs" placeholder="Email for feedback replies" />
            <button onClick={connectChatGPT} className="rounded-md bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-teal">Sign in with ChatGPT</button>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Skill Generation</h2>
            <button disabled={busy || !captures.length} onClick={handleGenerate} className="rounded-md bg-teal px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {busy ? "Generating" : "Generate Skill"}
            </button>
          </div>
          {output ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-md bg-ink p-3 text-xs leading-5 text-white">{output.shortPrompt}</div>
              <div className="flex gap-2">
                <button onClick={() => copyText(output.shortPrompt)} className="rounded-md border border-black/10 px-3 py-2 text-xs font-medium">Copy short</button>
                <button onClick={() => copyText(output.fullSkill)} className="rounded-md border border-black/10 px-3 py-2 text-xs font-medium">Copy for Codex</button>
                <button onClick={exportPack} className="rounded-md border border-black/10 px-3 py-2 text-xs font-medium">Export JSON</button>
              </div>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-black/10 bg-[#fbfdfc] p-3 text-[11px] leading-5 text-ink/75">{output.fullSkill}</pre>
            </div>
          ) : (
            <p className="mt-3 text-xs leading-5 text-ink/55">Generated output includes short prompt, full skill, design principles, anti-copy rules, and anti-slop rules.</p>
          )}
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Release Feedback</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">Beta</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {feedbackOptions.map((option) => (
              <button
                key={option.kind}
                onClick={() => setFeedbackKind(option.kind)}
                className={`rounded-md border px-2 py-2 text-[11px] font-semibold ${feedbackKind === option.kind ? "border-teal/30 bg-teal/10 text-teal" : "border-black/10 text-ink/55 hover:border-teal/30"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} rows={4} className="mt-3 w-full resize-none rounded-md border border-black/10 px-3 py-2 text-xs leading-5" placeholder="What broke, felt confusing, or should be improved before release?" />
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input value={feedbackEmail} onChange={(event) => setFeedbackEmail(event.target.value)} className="w-full rounded-md border border-black/10 px-3 py-2 text-xs" placeholder="Email, optional" />
            <button disabled={feedbackBusy} onClick={sendFeedback} className="rounded-md bg-teal px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              {feedbackBusy ? "Sending" : "Send"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SidePanel />);
