import type { InspirationCapture, StyleSignal } from "@inspra/core";

let active = false;
let hoverBox: HTMLDivElement | undefined;
let toolbar: HTMLDivElement | undefined;
let experiencePrompt: HTMLDivElement | undefined;
let lastTarget: Element | undefined;
let experiencePromptDismissed = false;

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    queueMicrotask(() => {
      void chrome.storage.local.get("inspra.experiencePromptDismissed").then((stored) => {
        experiencePromptDismissed = Boolean(stored["inspra.experiencePromptDismissed"]);
        const signals = detectExperienceSignals();
        if (signals.length) showExperiencePrompt(signals);
      });
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "INSPRA_START_CAPTURE") {
        startCapture();
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "INSPRA_TOGGLE_CAPTURE") {
        active ? stopCapture() : startCapture();
        sendResponse({ ok: true, active });
        return true;
      }
      return false;
    });
  }
});

function startCapture() {
  if (active) return;
  active = true;
  ensureOverlay();
  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.body.style.cursor = "crosshair";
}

function stopCapture() {
  active = false;
  document.removeEventListener("mousemove", onMouseMove, true);
  document.removeEventListener("click", onClick, true);
  document.removeEventListener("keydown", onKeyDown, true);
  hoverBox?.remove();
  toolbar?.remove();
  hoverBox = undefined;
  toolbar = undefined;
  lastTarget = undefined;
  document.body.style.cursor = "";
}

function ensureOverlay() {
  hoverBox ??= createHoverBox();
  toolbar ??= createToolbar();
  document.documentElement.append(hoverBox, toolbar);
}

function createHoverBox() {
  const box = document.createElement("div");
  box.id = "inspra-hover-box";
  Object.assign(box.style, {
    position: "fixed",
    zIndex: "2147483646",
    pointerEvents: "none",
    border: "1.5px solid #5EEAD4",
    boxShadow: "0 0 0 99999px rgba(12, 77, 90, 0.08), 0 0 0 3px rgba(94, 234, 212, 0.18)",
    borderRadius: "6px",
    transition: "top 80ms ease, left 80ms ease, width 80ms ease, height 80ms ease"
  });
  return box;
}

function createToolbar() {
  const bar = document.createElement("div");
  bar.id = "inspra-capture-toolbar";
  bar.textContent = "Inspra capture mode: click an element, Esc to cancel";
  Object.assign(bar.style, {
    position: "fixed",
    left: "16px",
    bottom: "16px",
    zIndex: "2147483647",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#101314",
    color: "#FFFFFF",
    font: "500 12px/1.3 Inter, system-ui, sans-serif",
    letterSpacing: "0",
    boxShadow: "0 14px 40px rgba(16, 19, 20, 0.24)",
    pointerEvents: "none"
  });
  return bar;
}

function onMouseMove(event: MouseEvent) {
  if (!active) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  if (!target || target === hoverBox || target === toolbar || target.closest?.("#inspra-capture-toolbar")) return;
  lastTarget = target;
  const rect = target.getBoundingClientRect();
  updateHoverBox(rect);
}

function updateHoverBox(rect: DOMRect) {
  if (!hoverBox) return;
  Object.assign(hoverBox.style, {
    top: `${Math.max(0, rect.top)}px`,
    left: `${Math.max(0, rect.left)}px`,
    width: `${Math.max(1, rect.width)}px`,
    height: `${Math.max(1, rect.height)}px`
  });
}

async function onClick(event: MouseEvent) {
  if (!active || !lastTarget) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  try {
    const target = resolveCaptureElement(lastTarget);
    if (isCodeElement(target)) selectCodeElement(target, event);
    const capture = buildCapture(target);
    await saveCapture(capture);
    showToast("Captured. Opening Inspra basket.");
    chrome.runtime.sendMessage({ type: "INSPRA_OPEN_PANEL" }, () => {
      if (chrome.runtime.lastError) showToast("Captured, but basket could not open. Click Inspra to continue.", true);
    });
    stopCapture();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Capture failed. Try a different element.", true);
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape") stopCapture();
}

function buildCapture(element: Element): InspirationCapture {
  const rect = element.getBoundingClientRect();
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    sourceUrl: location.href,
    pageTitle: document.title,
    kind: inferKind(element, rect),
    selector: buildSelector(element),
    text: normalizeText(element.textContent ?? ""),
    htmlSnippet: describeElement(element),
    styleSignals: getStyleSignals(element),
    experienceSignals: getExperienceSignalsForElement(element),
    rect: {
      x: Math.round(rect.x + scrollX),
      y: Math.round(rect.y + scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function inferKind(element: Element, rect: DOMRect): InspirationCapture["kind"] {
  const tag = element.tagName.toLowerCase();
  if (isCodeElement(element)) return "code";
  if (tag === "img" || tag === "picture" || tag === "video") return "image";
  if ((element.textContent ?? "").trim().length > 120 && rect.height < 180) return "text";
  if (rect.width > window.innerWidth * 0.55 || rect.height > window.innerHeight * 0.35) return "section";
  return "element";
}

function resolveCaptureElement(element: Element) {
  const code = element.closest("pre, code");
  if (!code) return element;
  return code.tagName.toLowerCase() === "code" ? code.closest("pre") ?? code : code;
}

function isCodeElement(element: Element) {
  return ["pre", "code"].includes(element.tagName.toLowerCase());
}

function selectCodeElement(element: Element, event: MouseEvent) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  if (!event.shiftKey && !event.metaKey && !event.ctrlKey) selection.removeAllRanges();
  selection.addRange(range);
}

function getStyleSignals(element: Element): StyleSignal {
  const styles = getComputedStyle(element);
  const descendants = Array.from(element.querySelectorAll("*")).slice(0, 40);
  const colors = new Set<string>([styles.color, styles.backgroundColor, styles.borderColor]);
  const fonts = new Set<string>([styles.fontFamily]);
  descendants.forEach((child) => {
    const childStyles = getComputedStyle(child);
    colors.add(childStyles.color);
    colors.add(childStyles.backgroundColor);
    fonts.add(childStyles.fontFamily);
  });
  return {
    colors: Array.from(colors).filter((value) => value && value !== "rgba(0, 0, 0, 0)").slice(0, 12),
    backgroundColor: styles.backgroundColor,
    textColor: styles.color,
    fonts: Array.from(fonts).filter(Boolean).slice(0, 6),
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    spacing: {
      margin: styles.margin,
      padding: styles.padding,
      gap: styles.gap
    },
    borderRadius: styles.borderRadius,
    boxShadow: styles.boxShadow,
    layout: {
      display: styles.display,
      gridTemplateColumns: styles.gridTemplateColumns,
      alignItems: styles.alignItems,
      justifyContent: styles.justifyContent
    },
    motion: {
      transition: styles.transition,
      animation: styles.animation,
      scrollSnapType: styles.scrollSnapType,
      scrollBehavior: styles.scrollBehavior,
      hints: getExperienceSignalsForElement(element)
    }
  };
}

function getExperienceSignalsForElement(element: Element) {
  const hints = new Set<string>();
  const candidates = [element, ...Array.from(element.querySelectorAll("*")).slice(0, 80)];

  candidates.forEach((candidate) => {
    const text = [
      candidate.getAttribute("class") || "",
      Array.from(candidate.attributes).map((attr) => `${attr.name}=${attr.value}`).join(" ")
    ].join(" ").toLowerCase();
    addSignalMatches(text, hints);

    const styles = getComputedStyle(candidate);
    if (styles.animationName && styles.animationName !== "none") hints.add(`CSS animation: ${styles.animationName}`);
    if (styles.transitionDuration && styles.transitionDuration !== "0s") hints.add("CSS transition choreography");
    if (styles.position === "sticky") hints.add("sticky scroll section");
    if (styles.scrollSnapType && styles.scrollSnapType !== "none") hints.add(`scroll snap: ${styles.scrollSnapType}`);
  });

  return Array.from(hints).slice(0, 12);
}

function detectExperienceSignals() {
  const hints = new Set<string>();
  const scriptSrc = Array.from(document.scripts).map((script) => script.src).join(" ").toLowerCase();
  const stylesheetHrefs = Array.from(document.styleSheets).map((sheet) => sheet.href ?? "").join(" ").toLowerCase();
  const pageSignals = Array.from(document.querySelectorAll("[class], [data-scroll], [data-scroll-speed], [data-gsap], [data-animation], [data-aos]"))
    .slice(0, 300)
    .map((element) => [element.getAttribute("class") || "", Array.from(element.attributes).map((attr) => `${attr.name}=${attr.value}`).join(" ")].join(" "))
    .join(" ")
    .toLowerCase();
  addSignalMatches(`${scriptSrc} ${stylesheetHrefs} ${pageSignals}`, hints);
  document.querySelectorAll("[style], [class], [data-scroll], [data-scroll-speed], [data-gsap], [data-animation], [data-aos]").forEach((element) => {
    getExperienceSignalsForElement(element).forEach((signal) => hints.add(signal));
  });
  return Array.from(hints).slice(0, 14);
}

function addSignalMatches(text: string, hints: Set<string>) {
  if (text.includes("gsap")) hints.add("GSAP animation system");
  if (text.includes("scrolltrigger") || text.includes("scroll-trigger")) hints.add("ScrollTrigger timeline");
  if (text.includes("data-scroll") || text.includes("locomotive")) hints.add("smooth scroll scene");
  if (text.includes("parallax")) hints.add("parallax depth");
  if (text.includes("pin-spacer") || text.includes("pinned")) hints.add("pinned scroll sequence");
  if (text.includes("aos") || text.includes("reveal")) hints.add("scroll reveal choreography");
  if (text.includes("scroll-snap")) hints.add("scroll snap pacing");
}

function showExperiencePrompt(signals: string[]) {
  if (experiencePrompt || active || experiencePromptDismissed) return;
  const prompt = document.createElement("div");
  prompt.id = "inspra-experience-prompt";
  prompt.innerHTML = "";
  Object.assign(prompt.style, {
    position: "fixed",
    right: "18px",
    bottom: "18px",
    zIndex: "2147483647",
    width: "min(360px, calc(100vw - 36px))",
    border: "1px solid rgba(94, 234, 212, 0.36)",
    borderRadius: "10px",
    background: "rgba(16, 19, 20, 0.94)",
    color: "#FFFFFF",
    padding: "14px",
    font: "500 12px/1.45 Inter, system-ui, sans-serif",
    boxShadow: "0 24px 70px rgba(16, 19, 20, 0.34)",
    backdropFilter: "blur(18px)"
  });

  const title = document.createElement("div");
  title.textContent = "Experience detected";
  Object.assign(title.style, { fontSize: "13px", fontWeight: "700", marginBottom: "4px" });

  const body = document.createElement("div");
  body.textContent = signals.slice(0, 3).join(" · ");
  Object.assign(body.style, { color: "rgba(255,255,255,.68)", marginBottom: "12px" });

  const actions = document.createElement("div");
  Object.assign(actions.style, { display: "flex", gap: "8px" });

  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy experience";
  Object.assign(copy.style, promptButtonStyle("#5EEAD4", "#101314"));
  copy.addEventListener("click", async () => {
    await saveCapture(buildExperienceCapture(signals));
    chrome.runtime.sendMessage({ type: "INSPRA_OPEN_PANEL" }, () => void chrome.runtime.lastError);
    experiencePrompt?.remove();
    experiencePrompt = undefined;
  });

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Dismiss";
  Object.assign(dismiss.style, promptButtonStyle("transparent", "#FFFFFF"), { border: "1px solid rgba(255,255,255,.18)" });
  dismiss.addEventListener("click", () => {
    experiencePrompt?.remove();
    experiencePrompt = undefined;
  });

  const hide = document.createElement("button");
  hide.type = "button";
  hide.textContent = "Don't show again";
  Object.assign(hide.style, promptButtonStyle("transparent", "#FFFFFF"), { border: "1px solid rgba(255,255,255,.18)" });
  hide.addEventListener("click", async () => {
    experiencePromptDismissed = true;
    await chrome.storage.local.set({ "inspra.experiencePromptDismissed": true });
    experiencePrompt?.remove();
    experiencePrompt = undefined;
  });

  actions.append(copy, dismiss, hide);
  prompt.append(title, body, actions);
  document.documentElement.append(prompt);
  experiencePrompt = prompt;
}

function promptButtonStyle(background: string, color: string) {
  return {
    minHeight: "34px",
    border: "0",
    borderRadius: "7px",
    background,
    color,
    padding: "8px 10px",
    cursor: "pointer",
    font: "700 12px/1 Inter, system-ui, sans-serif"
  };
}

function buildExperienceCapture(signals: string[]): InspirationCapture {
  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    sourceUrl: location.href,
    pageTitle: document.title,
    kind: "experience",
    selector: "document",
    note: `Experience capture: ${signals.join(", ")}`,
    text: `Detected website experience patterns: ${signals.join(", ")}`,
    htmlSnippet: "Experience capture stores detected motion/layout signals only; full page HTML is intentionally not saved.",
    styleSignals: getStyleSignals(document.body),
    experienceSignals: signals
  };
}

async function saveCapture(capture: InspirationCapture) {
  await chrome.storage.local.get("inspra.captures").then((stored) => {
    const captures = Array.isArray(stored["inspra.captures"]) ? stored["inspra.captures"] : [];
    return chrome.storage.local.set({ "inspra.captures": [capture, ...captures] });
  });
}

function showToast(message: string, isError = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    left: "16px",
    bottom: "16px",
    zIndex: "2147483647",
    maxWidth: "min(360px, calc(100vw - 32px))",
    padding: "10px 12px",
    borderRadius: "8px",
    background: isError ? "#FEF2F2" : "#101314",
    color: isError ? "#991B1B" : "#FFFFFF",
    border: isError ? "1px solid #FECACA" : "0",
    font: "600 12px/1.35 Inter, system-ui, sans-serif",
    boxShadow: "0 14px 40px rgba(16, 19, 20, 0.18)",
    pointerEvents: "none"
  });
  document.documentElement.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 2000);
}

function describeElement(element: Element) {
  const attributes = ["aria-label", "role", "type", "data-state"]
    .map((name) => {
      const value = element.getAttribute(name);
      return value ? `${name}=${value.slice(0, 80)}` : "";
    })
    .filter(Boolean);
  return [
    `tag=${element.tagName.toLowerCase()}`,
    `classes=${Array.from(element.classList).slice(0, 6).join(" ") || "none"}`,
    attributes.join(" ")
  ].filter(Boolean).join("; ").slice(0, 500);
}

function buildSelector(element: Element) {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && parts.length < 5 && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const className = Array.from(current.classList).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join("");
    parts.unshift(`${tag}${className}`);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback below if randomUUID throws (e.g., in insecure contexts)
    }
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    const num = Number(c);
    const randomValue =
      typeof crypto !== "undefined" && crypto.getRandomValues
        ? crypto.getRandomValues(new Uint8Array(1))[0]
        : Math.random() * 256;
    return (num ^ (randomValue & (15 >> (num / 4)))).toString(16);
  });
}
