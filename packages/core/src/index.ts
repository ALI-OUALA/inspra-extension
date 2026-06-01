export type CaptureKind = "element" | "section" | "image" | "text" | "region" | "code" | "experience";

export type StyleSignal = {
  colors: string[];
  backgroundColor?: string;
  textColor?: string;
  fonts: string[];
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  spacing?: {
    margin?: string;
    padding?: string;
    gap?: string;
  };
  borderRadius?: string;
  boxShadow?: string;
  layout?: {
    display?: string;
    gridTemplateColumns?: string;
    alignItems?: string;
    justifyContent?: string;
  };
  motion?: {
    transition?: string;
    animation?: string;
    scrollSnapType?: string;
    scrollBehavior?: string;
    hints: string[];
  };
};

export type InspirationCapture = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  pageTitle: string;
  kind: CaptureKind;
  selector?: string;
  note?: string;
  text?: string;
  htmlSnippet?: string;
  styleSignals: StyleSignal;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  screenshotDataUrl?: string;
  experienceSignals?: string[];
};

export type ProviderSettings = {
  mode: "openai" | "ollama" | "lmstudio" | "manual" | "local";
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
};

export type SkillOutput = {
  generatedAt: string;
  shortPrompt: string;
  fullSkill: string;
  designPrinciples: string[];
  antiCopyRules: string[];
  antiSlopRules: string[];
};

export type SkillPack = {
  name: string;
  domain: "inspra.dev";
  version: string;
  captures: InspirationCapture[];
  output: SkillOutput;
};

export const defaultProviderSettings: ProviderSettings = {
  mode: "local",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4.1-mini",
  temperature: 0.35
};

export const providerPresets: Record<ProviderSettings["mode"], ProviderSettings> = {
  openai: {
    mode: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4.1-mini",
    temperature: 0.35
  },
  ollama: {
    mode: "ollama",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    model: "llama3.1:8b",
    temperature: 0.35
  },
  lmstudio: {
    mode: "lmstudio",
    baseUrl: "http://localhost:1234/v1",
    apiKey: "lm-studio",
    model: "local-model",
    temperature: 0.35
  },
  manual: {
    mode: "manual",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4.1-mini",
    temperature: 0.35
  },
  local: defaultProviderSettings
};

export const generatorSystemPrompt = `You are Inspra, an inspiration intelligence layer for AI coding and design agents.

Transform collected web references into transferable design taste. Do not clone source websites.

For every output, reason through:
- Surface: what is visible.
- Principle: why it works.
- Transfer: how to apply the idea to an original product.
- Boundary: what must not be copied.

Never ask an agent to copy protected assets, exact layouts, brand identity, text, images, or source code. Prefer precise design principles over generic phrases.`;

const uniq = <T>(items: T[]) => Array.from(new Set(items.filter(Boolean)));

export function summarizeCaptures(captures: InspirationCapture[]) {
  const colors = uniq(captures.flatMap((capture) => capture.styleSignals.colors)).slice(0, 16);
  const fonts = uniq(captures.flatMap((capture) => capture.styleSignals.fonts)).slice(0, 8);
  const moods = captures
    .map((capture) => capture.note?.trim())
    .filter((note): note is string => Boolean(note))
    .slice(0, 8);

  return {
    count: captures.length,
    sourceHosts: uniq(captures.map((capture) => {
      try {
        return new URL(capture.sourceUrl).host;
      } catch {
        return capture.sourceUrl;
      }
    })),
    kinds: uniq(captures.map((capture) => capture.kind)),
    colors,
    fonts,
    notes: moods
  };
}

export function createFallbackSkill(captures: InspirationCapture[]): SkillOutput {
  const summary = summarizeCaptures(captures);
  const colorLine = summary.colors.length ? `Observed atmosphere uses ${summary.colors.join(", ")}.` : "Observed atmosphere is defined by restrained contrast and careful negative space.";
  const fontLine = summary.fonts.length ? `Typography references include ${summary.fonts.join(", ")}.` : "Typography should feel deliberate, quiet, and readable.";
  const experienceSignals = uniq(captures.flatMap((capture) => capture.experienceSignals ?? [])).slice(0, 12);
  const experienceLine = experienceSignals.length
    ? `Interaction and experience signals include ${experienceSignals.join(", ")}.`
    : "Interaction cues should be inferred from captured structure, pacing, and affordance.";

  return {
    generatedAt: new Date().toISOString(),
    shortPrompt:
      "Create an original interface inspired by the captured references: calm structure, strong negative space, precise hierarchy, transferable component rhythm, and strict anti-copy boundaries.",
    designPrinciples: [
      "Use visible references as taste signals, not templates.",
      "Translate layout into rhythm: density, alignment, whitespace, and visual anchoring.",
      "Preserve mood and interaction intent while changing composition, assets, text, and brand language.",
      "Favor specific constraints over generic 'modern clean' direction."
    ],
    antiCopyRules: [
      "Do not reuse source logos, brand assets, exact imagery, exact copy, or exact page structure.",
      "Do not recreate protected layouts one-to-one.",
      "Do not scrape or ship third-party HTML/CSS as product code.",
      "Use captured screenshots only as private reference context."
    ],
    antiSlopRules: [
      "No generic SaaS card clutter.",
      "No fake glassmorphism, random neon, robot heads, brains, circuits, or crypto-style gradients.",
      "No vague prompts like 'make it modern and clean' without concrete rhythm, typography, and spacing rules.",
      "No decorative motion unless it clarifies hierarchy or interaction."
    ],
    fullSkill: `# Inspra Inspiration Skill

## Intent
Build an original design using the captured references as an inspiration intelligence set. The goal is taste transfer, not website cloning.

## Source Summary
- Captures: ${summary.count}
- Reference domains: ${summary.sourceHosts.join(", ") || "local references"}
- Capture types: ${summary.kinds.join(", ") || "visual selections"}
- ${colorLine}
- ${fontLine}
- ${experienceLine}

## Surface
Extract what is visible: hero rhythm, component proportions, typography behavior, visual anchors, spacing density, color atmosphere, and interaction cues.

## Principle
Explain why the reference works. Look for hierarchy, contrast, restraint, pacing, visual affordance, and emotional tone.

## Transfer
Create a new original interface with:
- Calm editorial structure and strong negative space.
- One dominant visual anchor per fold.
- Clear type scale and restrained component system.
- Product-specific copy and original assets.
- Motion that supports selection, reveal, or state change.

## Boundary
Do not copy exact layouts, source text, images, logos, brand identity, proprietary UI, or source code. Change composition, copy, imagery, and interaction details until the result is clearly original.

## Anti-Slop Rules
- Avoid generic AI clichés.
- Avoid noisy visual effects.
- Avoid filler cards and fake metrics.
- Keep typography, spacing, and color decisions explicit.
`
  };
}

export function buildSkillPack(captures: InspirationCapture[], output: SkillOutput): SkillPack {
  return {
    name: `inspra-skill-pack-${new Date().toISOString().slice(0, 10)}`,
    domain: "inspra.dev",
    version: "0.1.0",
    captures,
    output
  };
}
